# Naming guards: customers, folders, documents (2026-09-25)

## Goal (user)

- Block creating duplicate customers.
- Block duplicate customer folders.
- Keep folder permissions in step with the Case's Manager / Members.
- Number duplicate folders.
- Number duplicate uploaded files "(1)", "(2)".

## Decisions (user-approved)

- **Customers** (revised 2026-09-25). The first rule was same name AND (same MST/CCCD, or either side without one); it is replaced by:
  - **Every customer:** an MST or CCCD already used by another customer is blocked. The two columns are compared crosswise, because a personal MST may equal a CCCD.
  - **Company** (`customerType = 'company'`): the name must be unique among companies, whatever the MST.
  - **Individual** (any other type, blank included): same names are allowed. When a same-name individual exists, the new one must be told apart:
    - blocked if it shares that person's email or phone;
    - blocked if it has no CCCD, MST, email or phone at all.
  - **Keys:** email is compared lower-cased, spaces removed. Phone is compared as digits only, with +84 / 0084 / 84 folded to a leading 0.
- **Deleting a customer:**
  - blocked while it has Cases (`projects.customerId`);
  - otherwise its own folder tree (stopping at Case folders) and their documents move to Trash, together with documents filed under it without a folder.
  - NocoBase nulls the references to a record before deleting it (`referential-integrity-check.ts`). DEFERRABLE constraint triggers on folders / documents / projects therefore re-check at COMMIT: a `customerId` nulled while its customer no longer exists means that customer was deleted. Its folders and documents go to Trash; a Case refuses the whole deletion.
  - The Customers table's Delete becomes a JS action, `All Module/Customer/CustomerDeleteAction.js`. It lists the customer's top-level folders with their subfolder and document counts ("the customer's documents will be deleted with it") before confirming, and lists the Cases instead when there are any.
  - The same script is used for the row action (`ctx.filterByTk`) and the toolbar bulk action (the selected rows).
  - In bulk, customers that have Cases are listed and skipped; the others are deleted in one request after confirmation, and the selection is cleared.
- **Customer folder** (a customer's root folder): its name must be unique within that customer. Blocked, never numbered.
- **Every other folder:** a name that collides with a sibling (same parent) becomes "Name (1)", "Name (2)", ...
- **Documents:** a title that collides with another document in the same folder becomes "Name (1).ext", ... This is the exact format of `getUniqueFileName` in the JS Blocks.
- **Case Manager / Members → folder permissions:** keep `pgsql/case_folder_permission_sync.sql`, verify it is installed, and add it to the deploy order.
- **Enforced in Postgres triggers,** so the JS Blocks, NocoBase native forms, the API and imports are all covered.

## Rules

- **Name comparison:**
  - trimmed, inner whitespace collapsed;
  - case-insensitive, Vietnamese capitals included (ICU collation when the server has it);
  - accents are significant;
  - deleted records (`isDeleted`) don't count.
- **MST/CCCD comparison:** spaces, dots and dashes are ignored.
- **Customer root folder:**
  - has `customerId`, no `projectId`/`taskId`;
  - its parent is missing or is not in that customer's tree (CaseCreateForm nests it under the hidden "Customers" category root).
  - Case folders carry the customer's id too and are numbered, not blocked.
- **Top-level folders (no parent)** are compared only with top-level folders of the same owner: case, customer, legal reference, internal template, module scope, internal company.
- **When the guards apply:** insert, rename, move to another parent/folder, and restore from trash.
- **Concurrency:** a transaction advisory lock per scope, so two concurrent writes can't both pass.
- **Blocked writes:** `RAISE EXCEPTION` with a Vietnamese message. NocoBase returns it as `errors[0].message`.

## Files

- **`pgsql/document_naming_guards.sql`:** the three BEFORE triggers and their helpers. Idempotent.
- **`pgsql/tests/document_naming_guards_test.sql`:** a self-checking test in `BEGIN … ROLLBACK`. It passed on PostgreSQL 16 against tables built from `schema/schema_01-06.sql`.
- **`pgsql/audit_naming_duplicates.sql`:** read only. It lists:
  - installed triggers;
  - existing duplicate customers, sibling folders and document titles.
- **`CustomerDocument.js`:**
  - shows the server's reason when a create/rename is blocked (was a generic text);
  - an endpoint-candidate 404 no longer hides the real error;
  - a renamed document's attachment title follows the numbered title.
- **`CaseCreateForm.js`:** before creating a customer root folder, it reuses one with the customer's name. The guard now blocks a second one; before, the form created a duplicate.
- **`scripts/tests/naming-guards.test.js`:** the JS side, plus the client `getUniqueFileName` matching the SQL test's expected names.

## Out of scope

- Rewriting existing duplicates. Use the FolderDuplicateNameFix / DocumentTitleVersionFix blocks, or the audit output.
- Renaming stored files. Only the document title is numbered.
