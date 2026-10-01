# Real-time Finance Notifications — Design Spec

Date: 2026-09-30
Status: Design approved in conversation (approach A); implemented in the same session.
Replaces the delivery half of `2026-09-28` finance notifications (the SQL event capture stays).

## 1. Problem

1. **Late.** The four "Finance - … notifications" workflows are *Schedule* workflows (`* * * * *`): SQL triggers queue events in `financeNotificationEvents`, and a workflow polls the queue once a minute. A notification arrives up to a minute (plus scheduler lag) after the money changed.
2. **No history.** Every minute is an execution, whether or not anything is sent (≈1,440 a day per workflow — "Executed 1,820"). To keep that noise out, the script sets `deleteExecutionOnStatus: [1]`, so every successful run — including the ones that did send — is deleted. Nothing is left to debug with.

Constraints that shaped the old design and still hold:
- Many finance changes are made by SQL (task Done / Case Done activation, one-time request on Case link, retainer hourly run, daily overdue refresh, termination). NocoBase collection events never see them → the SQL queue stays.
- An in-app message inserted by SQL is not pushed: the in-app channel pushes on the `afterCreate` model hook (`plugin-notification-in-app-message/src/server/InAppNotificationChannel.ts`). Delivery must go through a workflow Notification node.

## 2. Decisions (user)

- Approach **A** — detectors + senders, workflows only (no server plugin, no extra cron).
- "History" = the workflow **execution history** (no separate business log screen).
- "Payment Request created - notify assignee" and "Noti assign payment" are left untouched.

## 3. Design

```
API action commits ── SQL triggers queue events (unchanged) ──┐
Retainer hourly run / daily overdue refresh (existing crons) ─┤
                                                               ▼
  Detectors (8 collection-event workflows + a step appended to the 2 crons)
    SQL: SELECT * FROM public.finance_notifications_take(200, NULL)
    → Loop → Create record "financeNotifications" (one row per receiver)
                                                               │ collection event "after create"
                                                               ▼
  Senders (4 collection-event workflows on financeNotifications, one per record type)
    condition entity ∈ its types → Notification (in-app "payment") → Update sentAt
    every execution kept = history
```

### 3.1 Detectors — "Finance notify · detect · <collection>"

Collection event, async, `deleteExecutionOnStatus: [1]` (a run with nothing to send leaves no trace; a failed run stays visible). Update events only fire when a listed field changed:

| Collection | Mode | Changed fields (update) | Surfaces |
|---|---|---|---|
| paymentRequests | create + update | status, dueDate, overdueSince | request ready / cancelled / overdue |
| invoices | create + update | status | invoice created |
| payments | create + update | paymentStatus | payment received / cancelled |
| tasks | update | status, linkedPaymentRequestId, isPaymentTrigger, projectServiceId | task Done activates a request |
| projects | create + update | status, contractId | Case Done / Case linked creates or activates a request |
| contracts | create + update | status | termination cancels requests, contract terminated |
| contractPaymentSchedules | create | — | installment creates a request |
| contractBillingPlans | update | isBillingActive | retainer stopped / started |

The collection trigger skips an update when *none* of the listed fields exists on the collection (every `changedWithAssociations` is false) — the workflow would never run. The setup script therefore resolves each name against the live field metadata: kept as is when a field has that name, mapped to the belongsTo field whose `foreignKey` is that name, dropped (with a warning) otherwise; when nothing is left, `changed` is omitted (runs on every update) and a warning is printed.

`take()` takes every record type (`NULL`), so any detector run also sends events left by SQL run by hand. `FOR UPDATE SKIP LOCKED` keeps concurrent detectors from taking the same event. Events older than a day are still dropped.

### 3.2 Crons

"Retainer billing - hourly SQL run" and "Finance - daily overdue refresh" get the detector steps appended at the end. A workflow that has executions is locked (`Node could not be created in executed workflow`), so the script creates a revision (`workflows:revision` with `filter.key`), appends to the new version and enables it (the previous version becomes non-current; its history is kept). Skipped when the current version already has the step.

### 3.3 Senders

Same four titles as today, now collection event on `financeNotifications`, mode create, condition `entity ∈` its types:

| Workflow | entity |
|---|---|
| Finance - Payment Request notifications | paymentRequests |
| Finance - Invoice notifications | invoices |
| Finance - Payment notifications | payments |
| Finance - Contract notifications | contractBillingPlans, contracts |

Nodes: Notification (channel `payment`, receiver `{{$context.data.receiverUserId}}`, title, content with triple braces, link to the contract) → Update `sentAt`. `ignoreFail: false`: a failed send shows as a failed execution and the row keeps `sentAt` empty. No `deleteExecutionOnStatus`: one kept execution per notification sent. Switching a sender off stops its type only; its rows are created but never sent.

No loop: `financeNotifications` is written only by detectors and by senders' `sentAt` update (update mode is not listened to).

## 4. Rollout

One idempotent setup script, `JsField/Workflow/CreateFinanceNotificationsWorkflow.js` (rewritten):
1. Deletes the old schedule senders (same titles) and "Finance - notifications (every minute)"; creates the four senders.
2. Deletes and recreates the eight detectors.
3. Appends the detector steps to the two crons by revision (skipped if already there).
4. Stamps `sentAt` on older `financeNotifications` rows still empty (left by the polling design).
It no longer disables "Payment Request created - notify assignee".

`pgsql/finance_notifications.sql`: header comment only; `finance_notifications_take()` unchanged, `finance_notifications_prepare()` kept but unused.

Separate finding (not changed here): on dev, "Payment Request - due date set activates …", "By Case - Case done activates …" and "By Case - create scheduled Payment Requests …" are still enabled although their scripts are marked SUPERSEDED (replaced by SQL triggers on 2026-09-15).

## 5. Tests

- Node (`scripts/tests/finance-notifications.test.js`): pure payload builders — detector trigger config per collection (mode, changed), `resolveChangedFields` (keep / map foreign key / drop / omit), sender condition per type, execution retention (senders none, detectors `[1]`), `tailNodeId` for appending after the last cron node, the revision call, the notification node (receiver, triple-brace content, contract URL, `ignoreFail: false`).
- SQL: `pgsql/tests/finance_notifications_test.sql` unchanged (`take()` unchanged).
- Manual on dev: new payment from the Finance tab → notified within seconds, one execution in the Payment sender; task Done activating an installment → notified; Bill now; switch the Invoice sender off → others still send.
