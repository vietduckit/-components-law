-- ---- body of pgsql/deploy/check_dev_readiness.sql (appended by scripts/deploy/gen-dev-check.js)

-- ---- 1. functions: present, same arguments, same body as the repo
INSERT INTO _check
SELECT 1, 'function', e.name || '(' || e.args || ')',
       CASE WHEN p.prosrc IS NULL AND other.n > 0 THEN 'OUTDATED'
            WHEN p.prosrc IS NULL THEN 'MISSING'
            WHEN md5(p.prosrc) <> e.md5 THEN 'OUTDATED'
            ELSE 'OK' END,
       e.file || CASE WHEN p.prosrc IS NULL AND other.n > 0
                      THEN ' — exists with other arguments: ' || other.args ELSE '' END,
       CASE WHEN p.prosrc IS NOT NULL AND md5(p.prosrc) = e.md5 THEN '' ELSE 'run ' || e.file END
FROM _exp_fn e
LEFT JOIN LATERAL (
  SELECT pp.prosrc FROM pg_proc pp JOIN pg_namespace n ON n.oid = pp.pronamespace
  WHERE n.nspname = 'public' AND pp.proname = e.name AND pg_get_function_identity_arguments(pp.oid) = e.args
  LIMIT 1) p ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS n, string_agg(pg_get_function_identity_arguments(pp.oid), ' | ') AS args
  FROM pg_proc pp JOIN pg_namespace n ON n.oid = pp.pronamespace
  WHERE n.nspname = 'public' AND pp.proname = e.name) other ON true;

-- ---- 2. triggers: on the right table, calling the right function
INSERT INTO _check
SELECT 2, 'trigger', e.tbl || '.' || e.name,
       CASE WHEN t.fn IS NULL THEN 'MISSING' WHEN t.fn <> e.fn THEN 'OUTDATED' ELSE 'OK' END,
       e.file || ' — calls ' || e.fn || '()',
       CASE WHEN t.fn = e.fn THEN '' ELSE 'run ' || e.file END
FROM _exp_trg e
LEFT JOIN LATERAL (
  SELECT f.proname AS fn
  FROM pg_trigger tg
  JOIN pg_class c ON c.oid = tg.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
  JOIN pg_proc f ON f.oid = tg.tgfoid
  WHERE c.relname = e.tbl AND tg.tgname = e.name AND NOT tg.tgisinternal
  LIMIT 1) t ON true;

-- ---- 3. tables, views, indexes, columns the files create
-- an index also needs its key column count: an older copy can keep the name
-- (e.g. single-column ux_payment_requests_*, which NocoBase's collection sync drops)
INSERT INTO _check
SELECT 3, e.kind,
       CASE WHEN e.kind IN ('column', 'index') THEN e.tbl || '.' || e.name ELSE e.name END,
       CASE WHEN NOT ok THEN 'MISSING' WHEN outdated THEN 'OUTDATED' ELSE 'OK' END,
       e.file || CASE WHEN outdated THEN format(' — %s key column(s) here, %s expected', found_cols, e.ncols) ELSE '' END,
       CASE WHEN ok AND NOT outdated THEN '' ELSE 'run ' || e.file END
FROM (
  SELECT e.*, x.found_cols,
         COALESCE(e.kind = 'index' AND e.ncols IS NOT NULL AND x.found_cols IS DISTINCT FROM e.ncols, false) AS outdated
  FROM (
    SELECT e.*,
           CASE e.kind
             WHEN 'column' THEN EXISTS (SELECT 1 FROM information_schema.columns ic
                                        WHERE ic.table_schema = 'public' AND ic.table_name = e.tbl AND ic.column_name = e.name)
             ELSE to_regclass(format('public.%I', e.name)) IS NOT NULL
           END AS ok
    FROM _exp_obj e) e
  LEFT JOIN LATERAL (
    SELECT ix.indnatts::int AS found_cols FROM pg_index ix
    WHERE e.kind = 'index' AND e.ok AND ix.indexrelid = to_regclass(format('public.%I', e.name))) x ON true) e;

-- ---- 4. NocoBase field registrations (tables "fields" / "collections")
DO $check$
BEGIN
  IF to_regclass('public.fields') IS NULL OR to_regclass('public.collections') IS NULL THEN
    INSERT INTO _check VALUES (4, 'nocobase field', '(fields / collections)', 'INFO',
      'no NocoBase metadata tables in this database', '');
    RETURN;
  END IF;
  INSERT INTO _check
  SELECT 4, 'nocobase field',
         CASE WHEN e.coll = '@collection' THEN 'collection ' || e.name
              WHEN e.name LIKE '@belongsTo:%' THEN e.coll || ' → relation on ' || substr(e.name, 12)
              ELSE e.coll || '.' || e.name END,
         CASE WHEN e.registered THEN 'OK' ELSE 'MISSING' END,
         e.script,
         CASE WHEN e.registered THEN '' ELSE 'run ' || e.script END
  FROM (
    SELECT e.*,
           CASE WHEN e.coll = '@collection' THEN EXISTS (SELECT 1 FROM collections c WHERE c.name = e.name)
                WHEN e.name LIKE '@belongsTo:%' THEN EXISTS (
                  SELECT 1 FROM fields f WHERE f."collectionName" = e.coll AND f.type = 'belongsTo'
                    AND f.options::jsonb ->> 'foreignKey' = substr(e.name, 12))
                ELSE EXISTS (SELECT 1 FROM fields f WHERE f."collectionName" = e.coll AND f.name = e.name)
           END AS registered -- (not "found": a PL/pgSQL variable)
    FROM _exp_field e) e;
  -- the old companyServices.currencies (a hasMany that wrote into currencies) must be gone
  INSERT INTO _check
  SELECT 4, 'nocobase field', 'companyServices.currencies (old hasMany)', 'EXTRA',
         'JsField/RegisterCompanyServiceCurrency.js removes it', 'run JsField/RegisterCompanyServiceCurrency.js'
  WHERE EXISTS (SELECT 1 FROM fields f WHERE f."collectionName" = 'companyServices' AND f.name = 'currencies' AND f.type = 'hasMany');
END
$check$;

-- ---- 5. JS blocks: every block that renders a repo block, same code or not
DO $check$
BEGIN
  IF to_regclass('public."flowModels"') IS NULL THEN
    INSERT INTO _check VALUES (5, 'js block', '(flowModels)', 'INFO', 'no NocoBase flowModels table in this database', '');
    RETURN;
  END IF;
  INSERT INTO _check
  WITH RECURSIVE m AS (
    SELECT uid, options::jsonb AS o FROM "flowModels"
  ), coded AS (
    SELECT uid, o, o #>> '{stepParams,jsSettings,runJs,code}' AS code
    FROM m WHERE o #>> '{stepParams,jsSettings,runJs,code}' IS NOT NULL
  ), rooted AS (
    SELECT c.uid, c.o, c.code,
           (SELECT r.mt[1]
            FROM regexp_matches(c.code, 'ctx\.render\(\s*(?:React\.createElement\(\s*)?([A-Za-z]+)', 'g')
                 WITH ORDINALITY AS r(mt, i)
            ORDER BY r.i DESC LIMIT 1) AS root
    FROM coded c
  ), blocks AS (
    SELECT r.uid, r.o, r.code, e.file, e.md5
    FROM rooted r JOIN _exp_js e ON e.root = r.root
  ), chain AS (
    SELECT b.uid AS block, b.o ->> 'parentId' AS parent, 0 AS depth FROM blocks b
    UNION ALL
    SELECT ch.block, m.o ->> 'parentId', ch.depth + 1
    FROM chain ch JOIN m ON m.uid = ch.parent
    WHERE ch.depth < 40
  ), orphans AS (
    SELECT DISTINCT ch.block FROM chain ch
    WHERE ch.parent IS NOT NULL AND NOT EXISTS (SELECT 1 FROM m WHERE m.uid = ch.parent)
  )
  SELECT 5, 'js block', b.file || ' · ' || b.uid,
         CASE WHEN o.block IS NOT NULL THEN 'INFO'
              WHEN md5(btrim(replace(b.code, E'\r\n', E'\n'), E' \t\r\n')) = b.md5 THEN 'OK'
              ELSE 'OUTDATED' END,
         CASE WHEN o.block IS NOT NULL THEN 'orphan (its page / popup was deleted): shown nowhere'
              ELSE COALESCE(b.o ->> 'use', '') END,
         CASE WHEN o.block IS NULL AND md5(btrim(replace(b.code, E'\r\n', E'\n'), E' \t\r\n')) <> b.md5
              THEN 're-paste ' || b.file ELSE '' END
  FROM blocks b LEFT JOIN orphans o ON o.block = b.uid;
  -- repo blocks this instance does not use
  INSERT INTO _check
  SELECT 5, 'js block', e.file, 'INFO', 'no block renders ' || e.root || ' here', ''
  FROM _exp_js e
  WHERE NOT EXISTS (SELECT 1 FROM _check c WHERE c.section = 5 AND c.item LIKE e.file || ' · %');
END
$check$;

-- ---- 6. data (information: what the backfills / rates still have to do)
DO $check$
DECLARE
  t text;
  n bigint;
  v record;
BEGIN
  FOREACH t IN ARRAY ARRAY['quotationServices', 'contractServices', 'projectServices'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = t AND column_name = 'serviceThreadId') THEN
      EXECUTE format('SELECT count(*) FROM %I WHERE "serviceThreadId" IS NULL', t) INTO n;
      INSERT INTO _check VALUES (6, 'data', t || ': lines without a service thread', CASE WHEN n = 0 THEN 'OK' ELSE 'INFO' END,
        n || ' line(s)', CASE WHEN n = 0 THEN '' ELSE 'service_thread_backfill_preview → service_thread_backfill' END);
    END IF;
    IF to_regproc('public.money_line_priced') IS NOT NULL AND to_regproc('public.money_row_rate_frozen') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = t AND column_name = 'exchangeRateDate') THEN
      EXECUTE format('SELECT count(*) FROM %I x WHERE money_line_priced(to_jsonb(x)) AND NOT money_row_rate_frozen(to_jsonb(x))', t) INTO n;
      INSERT INTO _check VALUES (6, 'data', t || ': priced lines without a frozen rate', CASE WHEN n = 0 THEN 'OK' ELSE 'INFO' END,
        n || ' line(s)', CASE WHEN n = 0 THEN '' ELSE 'the money backfill (inside service_thread_backfill) prices them' END);
    END IF;
  END LOOP;

  IF to_regclass('public."exchangeRates"') IS NOT NULL AND to_regclass('public.currencies') IS NOT NULL THEN
    SELECT count(*) INTO n
    FROM "exchangeRates" er JOIN currencies tc ON tc.id = er."toCurrencyId"
    WHERE upper(tc.code) <> 'VND';
    INSERT INTO _check VALUES (6, 'data', 'exchange rates entered VND → foreign', CASE WHEN n = 0 THEN 'OK' ELSE 'INFO' END,
      n || ' rate(s)', CASE WHEN n = 0 THEN '' ELSE 'currency_catalog_fix_preview → currency_catalog_fix' END);
    FOR v IN
      SELECT upper(fc.code) AS code, max(er."effectiveDate")::date AS last_day
      FROM "exchangeRates" er
      JOIN currencies fc ON fc.id = er."fromCurrencyId"
      JOIN currencies tc ON tc.id = er."toCurrencyId" AND upper(tc.code) = 'VND'
      GROUP BY upper(fc.code)
    LOOP
      INSERT INTO _check VALUES (6, 'data', 'latest ' || v.code || ' → VND rate',
        CASE WHEN v.last_day >= current_date - 30 THEN 'OK' ELSE 'INFO' END,
        v.last_day || ' (' || (current_date - v.last_day) || ' days ago)',
        CASE WHEN v.last_day >= current_date - 30 THEN '' ELSE 'enter a current rate in Exchange Rates' END);
    END LOOP;
  END IF;

  FOREACH t IN ARRAY ARRAY['money_consistency_violations', 'service_thread_violations', 'money_rate_warnings'] LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM %I', t) INTO n;
      INSERT INTO _check VALUES (6, 'data', t, CASE WHEN n = 0 THEN 'OK' ELSE 'INFO' END,
        n || ' row(s)', CASE WHEN n = 0 THEN '' ELSE 'SELECT * FROM ' || t END);
    END IF;
  END LOOP;
END
$check$;

-- ---- 0. summary: what to do, per file / script
INSERT INTO _check
SELECT 0, 'summary', f.file,
       'RUN',
       count(*) || ' item(s) missing or outdated',
       CASE WHEN f.file LIKE 'JsField/%' THEN 'paste in the browser console of an admin page'
            ELSE 'pgAdmin: run the file (runbook step 1 order)' END
FROM (SELECT substr(action, 5) AS file FROM _check WHERE section BETWEEN 1 AND 4 AND action LIKE 'run %') f
GROUP BY f.file;
INSERT INTO _check
SELECT 0, 'summary', substr(action, 10), 'RE-PASTE',
       count(*) || ' block(s): ' || string_agg(split_part(item, ' · ', 2), ' ' ORDER BY item),
       'Edit code of each block, paste the repo file'
FROM _check WHERE section = 5 AND action LIKE 're-paste %'
GROUP BY substr(action, 10);
INSERT INTO _check
SELECT 0, 'summary', '(all SQL objects, fields and blocks)', 'OK', 'nothing to deploy', ''
WHERE NOT EXISTS (SELECT 1 FROM _check WHERE section = 0);

SELECT part, item, status, detail, action
FROM _check
ORDER BY section,
         CASE status WHEN 'RUN' THEN 0 WHEN 'RE-PASTE' THEN 1 WHEN 'MISSING' THEN 2 WHEN 'OUTDATED' THEN 3
                     WHEN 'EXTRA' THEN 4 WHEN 'INFO' THEN 5 ELSE 6 END,
         item;
