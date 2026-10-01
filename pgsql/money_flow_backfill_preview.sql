-- ============================================================
-- Money backfill PREVIEW (read-only). Review before running
-- pgsql/money_flow_backfill.sql. Lines:
--   'will fix'                            -> the backfill changes its amounts;
--   'rate only'                           -> it gets its rate and own-currency
--       amounts, its VND amounts stay;
--   'protected: contract already billed'  -> decide by hand (a request is
--       active / invoiced / paid); to fix one contract anyway, run
--       SELECT * FROM money_backfill_contract(<contract id>);
--   'missing rate'                        -> add the currency's rate to
--       Exchange Rates first, then run the backfill again;
--   'currency unknown'                    -> the line has no currency but its
--       document is in document_currency: set the line's currency by hand
--       (VND, or the document's), then run the backfill again.
-- Then the document totals it will write (installments of a listed
-- contract follow its new total, billed installments excepted).
-- ============================================================
SELECT action, table_name, id, service_name, contract_id, currency, document_currency,
       base_price, quantity, vat, stored_total, stored_rate,
       proposed_rate, proposed_rate_date, proposed_total_native, proposed_total
FROM money_backfill_preview
ORDER BY action, table_name, id;

SELECT doc_table, id, current_total, proposed_total, proposed_total - COALESCE(current_total, 0) AS change
FROM money_backfill_totals_preview
ORDER BY doc_table, id;
