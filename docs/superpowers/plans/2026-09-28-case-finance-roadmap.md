# Case Finance — Roadmap (5 plans)

Spec: `docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md`
Design canvas: https://claude.ai/artifact/XqRAYWFgcjU3yB46g2XhjK

The spec spans five subsystems; each gets its own plan that ships working, testable software on its own, in this order (each depends on the previous):

| # | Plan | Delivers | Spec |
|---|---|---|---|
| 1 | `2026-09-28-finance-p1-foundation.md` | Status unification (request pending/active/cancelled, payment Received/Cancelled); derived paid/outstanding/overdue on requests and invoices; received-only roll-up incl. edits/deletes; one-request-per-unit indexes; daily overdue refresh | §2, §4, §5, §6 (status) |
| 2 | `2026-09-28-finance-p2-billing-rules.md` | Combo request created on trigger (+ Task Management compatibility guard, no UI change); manual request (line + combo); cancel request; Retainer `isBillingActive` stop/start with end-date shift, Bill now; contract termination | §3, §7.1, §7.5, §8 |
| 3 | `2026-09-28-finance-p3-finance-tab.md` | `CaseFinanceBlock` (read-only) for By Case / By Service line / combo / Retainer + no-contract state; `contracts.financeLawyers`; visibility = Manager ∪ Finance members | §1, §10.1, §10.2 |
| 4 | `2026-09-28-finance-p4-payments.md` | Record payment across invoices (receipt groups), customer credit, advance (+ optional advance invoice), invoice cancel/replace, foreign-currency invoices; the tab's action buttons | §6.1–6.3, §7.2, §9 |
| 5 | `2026-09-28-finance-p5-notifications.md` | Recipient resolution (Finance members ∪ all case Managers), notification workflows for request created, overdue, payment received, manual actions | §10.3 |

Plans 2–5 are written after the previous plan is implemented, so they build on verified code rather than on assumptions.

Deployment is manual on the dev instance (SQL via psql/pgAdmin, NocoBase field scripts via the browser console, JS Blocks pasted in, workflows created by script then toggled once). Each plan ends with the exact manual checklist.
