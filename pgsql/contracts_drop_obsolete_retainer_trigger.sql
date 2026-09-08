-- ============================================================
-- Contract Billing Plans — drop the obsolete pre-migration retainer trigger
-- See docs/superpowers/specs/2026-09-08-contract-billing-plans-architecture-design.md §5/§10
--
-- trg_contract_init_retainer_billing_state / contract_init_retainer_billing_state()
-- (from the 2026-09-07 retainer-billing-automation feature, pgsql/
-- retainer_billing_automation.sql) initialized contracts.nextRetainerBillingDate/
-- retainerPeriodsBilled from contracts.retainerDuration. This whole
-- mechanism was superseded by contract_billing_plan_init_retainer_state()
-- on contractBillingPlans (Task 2 of this plan) — this trigger has been
-- dead weight since Tasks 5-7 stopped writing to the old columns, but was
-- never explicitly dropped, so it still directly depended on
-- contracts.retainerDuration and blocked Task 10's column drop
-- ("cannot drop column retainerDuration ... trigger ... depends on" ).
--
-- Idempotent: DROP TRIGGER/FUNCTION IF EXISTS is safe to run again.
-- ============================================================

DROP TRIGGER IF EXISTS trg_contract_init_retainer_billing_state ON contracts;
DROP FUNCTION IF EXISTS public.contract_init_retainer_billing_state();
