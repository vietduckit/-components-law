-- ============================================================
-- Finance notifications (2026-09-28): tell the people of a record whenever
-- something happens to the money.
--
-- Why a queue in SQL and not NocoBase "collection event" workflows: many
-- finance rows are created or changed by SQL itself (combo / By Case
-- activation, the retainer run, the daily overdue refresh, termination), and
-- NocoBase events never see those. Here AFTER triggers write one row per
-- event into "financeNotificationEvents", whatever made the change.
--
-- 2026-09-30 — real-time delivery, no polling
-- (docs/superpowers/specs/2026-09-30-realtime-finance-notifications-design.md,
-- JsField/Workflow/CreateFinanceNotificationsWorkflow.js): "detector"
-- workflows — a Collection event on each table whose change can queue an
-- event, plus a step at the end of the retainer / overdue crons — call
--     SELECT * FROM public.finance_notifications_take(200, NULL)
-- right after the change commits and create one "financeNotifications" row
-- per person; four "sender" workflows (one per record type) fire on the new
-- row, send the in-app notification and keep the execution as history.
-- finance_notifications_prepare() below belongs to the polling design
-- (2026-09-28/29) and is no longer called by any workflow.
--
-- Events and who is told (people are read when the event is sent, so the
-- Finance members picked in a dialog are already saved):
--   request_ready      a Payment Request becomes Active (created Active, or pending -> active)
--   request_cancelled  a Payment Request is cancelled
--   request_overdue    a Payment Request turns overdue          -> its Finance members
--   invoice_created    an Invoice is created (not draft)
--   invoice_overdue    an Invoice turns overdue                  -> its Finance members
--   payment_received   money is recorded as Received
--   payment_cancelled  a Received payment is cancelled           -> its Finance members
--   retainer_stopped / retainer_started   auto-billing ticked off / on
--   contract_terminated                    the contract is terminated
--                        -> Finance members + Manager of the contract's cases
-- Lawyers without a user account are skipped. An event nobody can receive
-- is closed without sending. The message names the record, its amount / due
-- date, the contract's case ("caseCode - projectName") and customer (KH).
--
-- 2026-09-28: sent from the NocoBase collection "financeNotifications" (one
-- row per person): finance_notifications_prepare() fills it, the workflow's
-- Query / Loop / Notification nodes read it — so title / content / link are
-- chosen from real fields in the node UI.
-- 2026-09-29: one workflow per record type (Payment Request, Invoice, Payment,
-- Contract — JsField/Workflow/CreateFinanceNotificationsWorkflow.js), each
-- calling prepare(ARRAY[<its types>]) and sending only those; switching one
-- off leaves the others alone.
--
-- Requires pgsql/finance_foundation.sql, pgsql/finance_billing_rules.sql,
-- pgsql/finance_members.sql and, for prepare(), the collection created by
-- JsField/CreateFinanceNotificationsCollection.js.
-- Idempotent. Test: pgsql/tests/finance_notifications_test.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public."financeNotificationEvents" (
  id bigserial PRIMARY KEY,
  event text NOT NULL,
  entity text NOT NULL,
  "entityId" bigint NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "sentAt" timestamptz
);
CREATE INDEX IF NOT EXISTS ix_finance_notification_events_open
  ON public."financeNotificationEvents" (id) WHERE "sentAt" IS NULL;

CREATE OR REPLACE FUNCTION public.finance_notify_enqueue(p_event text, p_entity text, p_id bigint)
RETURNS void
LANGUAGE sql
AS $function$
  INSERT INTO public."financeNotificationEvents" (event, entity, "entityId") VALUES (p_event, p_entity, p_id);
$function$;

-- ---- event capture -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finance_notify_payment_request()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF lower(COALESCE(NEW.status, '')) = 'active' THEN
      PERFORM public.finance_notify_enqueue('request_ready', 'paymentRequests', NEW.id);
    END IF;
    RETURN NULL;
  END IF;
  IF lower(COALESCE(NEW.status, '')) = 'active' AND lower(COALESCE(OLD.status, '')) NOT IN ('active', 'cancelled') THEN
    PERFORM public.finance_notify_enqueue('request_ready', 'paymentRequests', NEW.id);
  END IF;
  IF lower(COALESCE(NEW.status, '')) = 'cancelled' AND lower(COALESCE(OLD.status, '')) <> 'cancelled' THEN
    PERFORM public.finance_notify_enqueue('request_cancelled', 'paymentRequests', NEW.id);
  END IF;
  IF OLD."overdueSince" IS NULL AND NEW."overdueSince" IS NOT NULL THEN
    PERFORM public.finance_notify_enqueue('request_overdue', 'paymentRequests', NEW.id);
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_notify_payment_request ON "paymentRequests";
CREATE TRIGGER trg_finance_notify_payment_request
  AFTER INSERT OR UPDATE ON "paymentRequests"
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_notify_payment_request();

CREATE OR REPLACE FUNCTION public.finance_notify_invoice()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF lower(COALESCE(NEW.status, '')) NOT IN ('draft', 'cancelled') THEN
      PERFORM public.finance_notify_enqueue('invoice_created', 'invoices', NEW.id);
    END IF;
  ELSIF OLD."overdueSince" IS NULL AND NEW."overdueSince" IS NOT NULL THEN
    PERFORM public.finance_notify_enqueue('invoice_overdue', 'invoices', NEW.id);
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_notify_invoice ON invoices;
CREATE TRIGGER trg_finance_notify_invoice
  AFTER INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_notify_invoice();

CREATE OR REPLACE FUNCTION public.finance_notify_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF public.finance_is_received(NEW."paymentStatus") THEN
      PERFORM public.finance_notify_enqueue('payment_received', 'payments', NEW.id);
    END IF;
  ELSIF public.finance_is_received(NEW."paymentStatus") AND NOT public.finance_is_received(OLD."paymentStatus") THEN
    PERFORM public.finance_notify_enqueue('payment_received', 'payments', NEW.id);
  ELSIF public.finance_is_received(OLD."paymentStatus") AND lower(COALESCE(NEW."paymentStatus", '')) = 'cancelled' THEN
    PERFORM public.finance_notify_enqueue('payment_cancelled', 'payments', NEW.id);
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_notify_payment ON payments;
CREATE TRIGGER trg_finance_notify_payment
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_notify_payment();

CREATE OR REPLACE FUNCTION public.finance_notify_billing_plan()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW."isBillingActive" IS FALSE AND OLD."isBillingActive" IS NOT FALSE THEN
    PERFORM public.finance_notify_enqueue('retainer_stopped', 'contractBillingPlans', NEW.id);
  ELSIF NEW."isBillingActive" IS NOT FALSE AND OLD."isBillingActive" IS FALSE THEN
    PERFORM public.finance_notify_enqueue('retainer_started', 'contractBillingPlans', NEW.id);
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_notify_billing_plan ON "contractBillingPlans";
CREATE TRIGGER trg_finance_notify_billing_plan
  AFTER UPDATE ON "contractBillingPlans"
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_notify_billing_plan();

CREATE OR REPLACE FUNCTION public.finance_notify_contract()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF lower(COALESCE(NEW.status, '')) = 'terminated' AND lower(COALESCE(OLD.status, '')) <> 'terminated' THEN
    PERFORM public.finance_notify_enqueue('contract_terminated', 'contracts', NEW.id);
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_notify_contract ON contracts;
CREATE TRIGGER trg_finance_notify_contract
  AFTER UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_notify_contract();

-- ---- message text --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finance_vnd_text(p_amount numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT replace(to_char(round(COALESCE(p_amount, 0))::bigint, 'FM999,999,999,999,990'), ',', '.') || ' VND';
$function$;

CREATE OR REPLACE FUNCTION public.finance_date_text(p_value timestamptz)
RETURNS text
LANGUAGE sql
STABLE
AS $function$
  SELECT to_char(public.finance_local_date(p_value), 'DD/MM/YYYY');
$function$;

-- The customer's short name (else its name), from the record or its contract.
CREATE OR REPLACE FUNCTION public.finance_customer_name(p_customer_id bigint, p_contract_id bigint)
RETURNS text
LANGUAGE sql
STABLE
AS $function$
  SELECT NULLIF(btrim(COALESCE(to_jsonb(cu)->>'shortName', to_jsonb(cu)->>'name')), '')
  FROM (SELECT COALESCE(p_customer_id, (SELECT "customerId" FROM contracts WHERE id = p_contract_id)) AS cid) x
  LEFT JOIN customers cu ON cu.id = x.cid;
$function$;

-- " (KH: short name)" of the contract's customer, or ''.
CREATE OR REPLACE FUNCTION public.finance_customer_suffix(p_customer_id bigint, p_contract_id bigint)
RETURNS text
LANGUAGE sql
STABLE
AS $function$
  SELECT COALESCE(' (KH: ' || public.finance_customer_name(p_customer_id, p_contract_id) || ')', '');
$function$;

-- "caseCode - projectName" of the contract's first case, "+n" when it has more.
CREATE OR REPLACE FUNCTION public.finance_case_label(p_contract_id bigint)
RETURNS text
LANGUAGE sql
STABLE
AS $function$
  SELECT NULLIF(btrim(concat_ws(' - ', NULLIF(to_jsonb(p)->>'caseCode', ''), NULLIF(to_jsonb(p)->>'projectName', ''))), '') ||
         CASE WHEN x.n > 1 THEN ' +' || (x.n - 1) ELSE '' END
  FROM (SELECT count(*) AS n, min(id) AS first_id FROM projects WHERE "contractId" = p_contract_id) x
  JOIN projects p ON p.id = x.first_id;
$function$;

-- ---- sending -------------------------------------------------------------

-- Takes up to p_limit unsent events (oldest first) of the given record types
-- (p_entities, e.g. ARRAY['invoices']; NULL = all), marks them sent and
-- returns one row per person to notify. Safe to call concurrently.
-- An event older than a day is closed without sending: a type whose workflow
-- was switched off does not flood people with old news once switched on.
-- (DROP first: the parameters / returned columns changed on 2026-09-28/29.)
DROP FUNCTION IF EXISTS public.finance_notifications_prepare(integer);
DROP FUNCTION IF EXISTS public.finance_notifications_take(integer);
DROP FUNCTION IF EXISTS public.finance_notifications_take(integer, text[]);
CREATE OR REPLACE FUNCTION public.finance_notifications_take(p_limit integer DEFAULT 200, p_entities text[] DEFAULT NULL)
RETURNS TABLE (
  receiver_user_id bigint, title text, content text, event text, entity text, entity_id bigint,
  contract_id bigint, case_label text, customer_name text
)
LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
DECLARE
  e RECORD;
  j jsonb;
  req jsonb;
  v_title text;
  v_content text;
  v_lawyers bigint[];
  v_contract bigint;
  v_customer bigint;
  v_case text;
BEGIN
  FOR e IN
    SELECT q.* FROM public."financeNotificationEvents" q
    WHERE q."sentAt" IS NULL
      AND (p_entities IS NULL OR q.entity = ANY(p_entities))
    ORDER BY q.id
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    IF e."createdAt" < now() - interval '1 day' THEN
      UPDATE public."financeNotificationEvents" q SET "sentAt" = now() WHERE q.id = e.id;
      CONTINUE;
    END IF;
    v_title := NULL;
    v_content := NULL;
    v_lawyers := '{}'::bigint[];
    v_contract := NULL;
    v_customer := NULL;
    j := NULL;
    req := NULL;

    IF e.entity = 'paymentRequests' THEN
      SELECT to_jsonb(pr) INTO j FROM "paymentRequests" pr WHERE pr.id = e."entityId";
      IF j IS NOT NULL THEN
        v_lawyers := public.finance_request_member_ids(e."entityId");
        v_contract := NULLIF(j->>'contractId', '')::bigint;
        v_customer := NULLIF(j->>'customerId', '')::bigint;
        IF e.event = 'request_ready' THEN
          v_title := 'Yêu cầu thanh toán mới';
          v_content := COALESCE(j->>'title', 'Yêu cầu thanh toán') || ' · ' ||
            public.finance_vnd_text(NULLIF(j->>'requestedAmount', '')::numeric) ||
            COALESCE(' · hạn ' || public.finance_date_text(NULLIF(j->>'dueDate', '')::timestamptz), '');
        ELSIF e.event = 'request_cancelled' THEN
          v_title := 'Yêu cầu thanh toán đã hủy';
          v_content := COALESCE(j->>'title', 'Yêu cầu thanh toán') || ' · ' ||
            public.finance_vnd_text(NULLIF(j->>'requestedAmount', '')::numeric) ||
            COALESCE(' · Lý do: ' || NULLIF(btrim(j->>'cancelReason'), ''), '');
        ELSIF e.event = 'request_overdue' THEN
          v_title := 'Yêu cầu thanh toán quá hạn';
          v_content := COALESCE(j->>'title', 'Yêu cầu thanh toán') || ' · còn nợ ' ||
            public.finance_vnd_text(NULLIF(j->>'outstandingAmount', '')::numeric) ||
            COALESCE(' · hạn ' || public.finance_date_text(NULLIF(j->>'dueDate', '')::timestamptz), '');
        END IF;
      END IF;

    ELSIF e.entity = 'invoices' THEN
      SELECT to_jsonb(i) INTO j FROM invoices i WHERE i.id = e."entityId";
      IF j IS NOT NULL THEN
        SELECT to_jsonb(pr) INTO req FROM "paymentRequests" pr WHERE pr.id = NULLIF(j->>'paymentRequestId', '')::bigint;
        SELECT COALESCE(array_agg(m."lawyerId"), '{}') INTO v_lawyers FROM "invoiceFinanceMembers" m WHERE m."invoiceId" = e."entityId";
        v_contract := COALESCE(NULLIF(j->>'contractId', '')::bigint, NULLIF(req->>'contractId', '')::bigint);
        v_customer := NULLIF(req->>'customerId', '')::bigint;
        IF e.event = 'invoice_created' THEN
          v_title := 'Hóa đơn mới';
          v_content := COALESCE(NULLIF(j->>'invoiceNumber', ''), NULLIF(j->>'invoiceName', ''), 'Hóa đơn') || ' · ' ||
            public.finance_vnd_text(NULLIF(j->>'totalAmount', '')::numeric) ||
            COALESCE(' · cho ' || NULLIF(req->>'title', ''), '');
        ELSIF e.event = 'invoice_overdue' THEN
          v_title := 'Hóa đơn quá hạn';
          v_content := COALESCE(NULLIF(j->>'invoiceNumber', ''), NULLIF(j->>'invoiceName', ''), 'Hóa đơn') || ' · còn nợ ' ||
            public.finance_vnd_text(GREATEST(COALESCE(NULLIF(j->>'totalAmount', '')::numeric, 0) - COALESCE(NULLIF(j->>'amountPaid', '')::numeric, 0), 0)) ||
            COALESCE(' · hạn ' || public.finance_date_text(COALESCE(NULLIF(j->>'deadline', ''), NULLIF(req->>'dueDate', ''))::timestamptz), '');
        END IF;
      END IF;

    ELSIF e.entity = 'payments' THEN
      SELECT to_jsonb(p) INTO j FROM payments p WHERE p.id = e."entityId";
      IF j IS NOT NULL THEN
        SELECT to_jsonb(pr) INTO req FROM "paymentRequests" pr
        WHERE pr.id = COALESCE(NULLIF(j->>'paymentRequestId', '')::bigint,
                               (SELECT i."paymentRequestId" FROM invoices i WHERE i.id = NULLIF(j->>'invoiceId', '')::bigint));
        SELECT COALESCE(array_agg(m."lawyerId"), '{}') INTO v_lawyers FROM "paymentFinanceMembers" m WHERE m."paymentId" = e."entityId";
        v_contract := COALESCE(NULLIF(j->>'contractId', '')::bigint, NULLIF(req->>'contractId', '')::bigint);
        v_customer := NULLIF(req->>'customerId', '')::bigint;
        v_content := public.finance_vnd_text(public.finance_payment_vnd(j)) ||
          COALESCE(' cho ' || NULLIF(req->>'title', ''), '');
        IF e.event = 'payment_received' THEN
          v_title := 'Đã nhận thanh toán';
          IF req IS NOT NULL THEN
            v_content := v_content || CASE
              WHEN COALESCE(NULLIF(req->>'outstandingAmount', '')::numeric, 0) <= 0 THEN ' · đã thu đủ'
              ELSE ' · còn nợ ' || public.finance_vnd_text(NULLIF(req->>'outstandingAmount', '')::numeric)
            END;
          END IF;
        ELSIF e.event = 'payment_cancelled' THEN
          v_title := 'Thanh toán đã hủy';
        END IF;
      END IF;

    ELSIF e.entity = 'contractBillingPlans' THEN
      SELECT to_jsonb(bp) INTO j FROM "contractBillingPlans" bp WHERE bp.id = e."entityId";
      IF j IS NOT NULL THEN
        v_contract := NULLIF(j->>'contractId', '')::bigint;
        v_lawyers := public.finance_default_member_ids(v_contract);
        SELECT COALESCE(c."contractCode", '') || COALESCE(' - ' || c."contractName", '') INTO v_content FROM contracts c WHERE c.id = v_contract;
        IF e.event = 'retainer_stopped' THEN
          v_title := 'Tạm dừng thu tiền retainer';
          v_content := COALESCE(v_content, 'Hợp đồng') || COALESCE(' · Lý do: ' || NULLIF(btrim(j->>'pauseReason'), ''), '');
        ELSIF e.event = 'retainer_started' THEN
          v_title := 'Tiếp tục thu tiền retainer';
          v_content := COALESCE(v_content, 'Hợp đồng') ||
            COALESCE(' · kỳ tới ' || to_char(NULLIF(j->>'nextBillingDate', '')::date, 'DD/MM/YYYY'), '');
        END IF;
      END IF;

    ELSIF e.entity = 'contracts' THEN
      SELECT to_jsonb(c) INTO j FROM contracts c WHERE c.id = e."entityId";
      IF j IS NOT NULL AND e.event = 'contract_terminated' THEN
        v_contract := e."entityId";
        v_lawyers := public.finance_default_member_ids(v_contract);
        v_title := 'Hợp đồng chấm dứt';
        v_content := COALESCE(j->>'contractCode', '') || COALESCE(' - ' || NULLIF(j->>'contractName', ''), '') ||
          COALESCE(' · ngày ' || to_char(NULLIF(j->>'terminationDate', '')::date, 'DD/MM/YYYY'), '') ||
          ' · các yêu cầu đang chờ đã được hủy';
      END IF;
    END IF;

    UPDATE public."financeNotificationEvents" q SET "sentAt" = now() WHERE q.id = e.id;

    IF v_title IS NOT NULL THEN
      v_case := public.finance_case_label(v_contract);
      v_content := v_content || COALESCE(' · Case ' || v_case, '') || public.finance_customer_suffix(v_customer, v_contract);
      RETURN QUERY
        SELECT DISTINCT l."userId"::bigint, v_title, v_content, e.event, e.entity, e."entityId",
               v_contract, v_case, public.finance_customer_name(v_customer, v_contract)
        FROM lawyers l
        WHERE l.id = ANY(v_lawyers) AND l."userId" IS NOT NULL;
    END IF;
  END LOOP;
END;
$function$;

-- The workflow's first step: queued events -> rows of the NocoBase collection
-- "financeNotifications" (JsField/CreateFinanceNotificationsCollection.js),
-- one per person, sentAt empty. The workflow then queries those rows (so its
-- Loop / Notification nodes see real fields: title, content, caseLabel, …),
-- sends each and stamps sentAt. Returns how many rows were added.
DROP FUNCTION IF EXISTS public.finance_notifications_prepare(text[], integer);
CREATE OR REPLACE FUNCTION public.finance_notifications_prepare(p_entities text[] DEFAULT NULL, p_limit integer DEFAULT 200)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  v_needs_id boolean;
  v_added integer := 0;
  n RECORD;
BEGIN
  IF to_regclass('public."financeNotifications"') IS NULL THEN
    RAISE EXCEPTION 'Collection "financeNotifications" is missing — run JsField/CreateFinanceNotificationsCollection.js in NocoBase first.';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'financeNotifications' AND column_name = 'id' AND column_default IS NULL
  ) INTO v_needs_id;

  FOR n IN SELECT * FROM public.finance_notifications_take(p_limit, p_entities) LOOP
    IF v_needs_id THEN
      -- app-generated id (no database default): same scheme as the rest of the payment SQL
      INSERT INTO public."financeNotifications" (
        id, title, content, event, entity, "entityId", "contractId", "caseLabel", "customerName",
        "receiverUserId", "createdAt", "updatedAt"
      ) VALUES (
        (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint * 1000 + v_added % 1000,
        n.title, n.content, n.event, n.entity, n.entity_id, n.contract_id, n.case_label, n.customer_name,
        n.receiver_user_id, now(), now()
      );
    ELSE
      INSERT INTO public."financeNotifications" (
        title, content, event, entity, "entityId", "contractId", "caseLabel", "customerName",
        "receiverUserId", "createdAt", "updatedAt"
      ) VALUES (
        n.title, n.content, n.event, n.entity, n.entity_id, n.contract_id, n.case_label, n.customer_name,
        n.receiver_user_id, now(), now()
      );
    END IF;
    v_added := v_added + 1;
  END LOOP;
  RETURN v_added;
END;
$function$;
