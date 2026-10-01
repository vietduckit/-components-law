-- ============================================================
-- Self-checking test for pgsql/document_naming_guards.sql.
-- Run AFTER deploying it:  psql ... -f pgsql/tests/document_naming_guards_test.sql
-- Everything runs inside BEGIN ... ROLLBACK — nothing is left behind.
-- Each check RAISEs "FAIL: ..." on a wrong result; the last line prints
-- "ALL NAMING GUARD CHECKS PASSED" when every check held.
-- Test rows use ids 990000000000001+ (far above real ids).
-- ============================================================
BEGIN;

-- ---- 1. customers ------------------------------------------------------------
DO $test$
DECLARE
  blocked boolean;
BEGIN
  -- companies: the name is unique among companies, whatever the MST
  INSERT INTO customers (id, "customerName", "customerType", "taxCode") VALUES (990000000000001, 'Naming Guard Test Co', 'company', '0101-234.567');
  blocked := false;
  BEGIN
    INSERT INTO customers (id, "customerName", "customerType", "taxCode") VALUES (990000000000003, '  naming   guard TEST co ', 'company', '0109999999');
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: a company name must be unique among companies'; END IF;

  -- an MST already used (written differently) is blocked, whatever the name
  blocked := false;
  BEGIN
    INSERT INTO customers (id, "customerName", "customerType", "taxCode") VALUES (990000000000004, 'Another Guard Co', 'company', '0101234567');
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: a used MST must be blocked'; END IF;

  -- an individual may carry a company's name
  INSERT INTO customers (id, "customerName", "customerType", phone) VALUES (990000000000002, 'Naming Guard Test Co', 'individual', '0900000002');

  -- individuals: same names allowed when they can be told apart
  INSERT INTO customers (id, "customerName", "customerType", "IdentityNumber", email, phone)
    VALUES (990000000000005, 'Nguyen Van Test', 'individual', '001099000001', 'a@x.vn', '+84 912 345 678');
  INSERT INTO customers (id, "customerName", "customerType", "IdentityNumber")
    VALUES (990000000000007, 'Nguyen Van Test', 'individual', '001099000002');
  -- a blank customerType is an individual
  INSERT INTO customers (id, "customerName", email) VALUES (990000000000011, 'Nguyen Van Test', 'b@x.vn');

  -- a CCCD already used (other spacing) is blocked, whatever the name
  blocked := false;
  BEGIN
    INSERT INTO customers (id, "customerName", "customerType", "IdentityNumber") VALUES (990000000000006, 'Tran Thi Test', 'individual', '001 099 000 001');
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: a used CCCD must be blocked'; END IF;

  -- a CCCD equal to another customer's MST is blocked too
  blocked := false;
  BEGIN
    INSERT INTO customers (id, "customerName", "IdentityNumber") VALUES (990000000000016, 'Pham Test', '0101234567');
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: a CCCD equal to a used MST must be blocked'; END IF;

  -- same name + same phone in another format → blocked (likely the same person)
  blocked := false;
  BEGIN
    INSERT INTO customers (id, "customerName", phone) VALUES (990000000000012, 'nguyen van TEST', '0912345678');
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: same name + same phone must be blocked'; END IF;

  -- same name + same email in other case → blocked
  blocked := false;
  BEGIN
    INSERT INTO customers (id, "customerName", email) VALUES (990000000000013, 'Nguyen Van Test', ' A@X.VN ');
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: same name + same email must be blocked'; END IF;

  -- same name + nothing to tell them apart → blocked
  blocked := false;
  BEGIN
    INSERT INTO customers (id, "customerName") VALUES (990000000000014, 'Nguyen Van Test');
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: same name without CCCD/email/phone must be blocked'; END IF;

  -- a new name with nothing else is fine
  INSERT INTO customers (id, "customerName") VALUES (990000000000015, 'Le Van Test');

  -- Vietnamese capitals fold too ("ĐÔNG Á" = "đông á")
  INSERT INTO customers (id, "customerName", "customerType", "taxCode") VALUES (990000000000009, 'Công ty ĐÔNG Á Test', 'company', '0300000001');
  blocked := false;
  BEGIN
    INSERT INTO customers (id, "customerName", "customerType", "taxCode") VALUES (990000000000010, 'công ty đông á test', 'company', '0300000009');
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: Vietnamese capitals must compare case-insensitively'; END IF;

  -- renaming a company onto another company's name is blocked
  INSERT INTO customers (id, "customerName", "customerType", "taxCode") VALUES (990000000000008, 'Naming Guard Other', 'company', '0300000002');
  blocked := false;
  BEGIN
    UPDATE customers SET "customerName" = 'Naming Guard Test Co' WHERE id = 990000000000008;
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: renaming onto a company name must be blocked'; END IF;

  -- turning the same-name individual into a company is blocked too
  blocked := false;
  BEGIN
    UPDATE customers SET "customerType" = 'company' WHERE id = 990000000000002;
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: becoming a same-name company must be blocked'; END IF;

  -- updating another field of a customer doesn't re-check
  UPDATE customers SET address = 'somewhere' WHERE id = 990000000000001;
END;
$test$;

-- ---- 2. folders ----------------------------------------------------------------
DO $test$
DECLARE
  blocked boolean;
  v_name text;
BEGIN
  -- the hidden category root the customer roots hang under (no customerId)
  INSERT INTO folders (id, name) VALUES (990000000000101, 'Naming Guard Customers Root');

  -- customer root folders: unique within the customer, no numbering
  INSERT INTO folders (id, name, "customerId", "parentId") VALUES (990000000000102, 'Naming Guard Test Co', 990000000000001, 990000000000101);
  blocked := false;
  BEGIN
    INSERT INTO folders (id, name, "customerId", "parentId") VALUES (990000000000103, 'naming guard test co', 990000000000001, 990000000000101);
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: duplicate customer root folder must be blocked'; END IF;
  -- also blocked with no parent at all
  blocked := false;
  BEGIN
    INSERT INTO folders (id, name, "customerId") VALUES (990000000000104, 'Naming Guard Test Co', 990000000000001);
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: duplicate customer root folder (no parent) must be blocked'; END IF;
  -- another customer with the same name keeps its own root folder name
  INSERT INTO folders (id, name, "customerId", "parentId") VALUES (990000000000105, 'Naming Guard Test Co', 990000000000002, 990000000000101);
  SELECT name INTO v_name FROM folders WHERE id = 990000000000105;
  IF v_name <> 'Naming Guard Test Co' THEN RAISE EXCEPTION 'FAIL: another customer''s root folder must not be numbered (got %)', v_name; END IF;

  -- a Case folder carrying the customer's id is NOT a customer root folder: numbered
  INSERT INTO folders (id, name, "customerId", "projectId") VALUES (990000000000106, 'Naming Guard Case', 990000000000001, 990000000000901);
  INSERT INTO folders (id, name, "customerId", "projectId") VALUES (990000000000107, 'Naming Guard Case', 990000000000001, 990000000000901);
  SELECT name INTO v_name FROM folders WHERE id = 990000000000107;
  IF v_name <> 'Naming Guard Case (1)' THEN RAISE EXCEPTION 'FAIL: case folder must be numbered (got %)', v_name; END IF;

  -- ordinary subfolders: numbered among siblings
  INSERT INTO folders (id, name, "parentId") VALUES (990000000000110, 'Hop dong', 990000000000102);
  INSERT INTO folders (id, name, "parentId") VALUES (990000000000111, 'Hop dong', 990000000000102);
  INSERT INTO folders (id, name, "parentId") VALUES (990000000000112, 'HOP DONG', 990000000000102);
  SELECT name INTO v_name FROM folders WHERE id = 990000000000111;
  IF v_name <> 'Hop dong (1)' THEN RAISE EXCEPTION 'FAIL: 2nd sibling must be "Hop dong (1)" (got %)', v_name; END IF;
  SELECT name INTO v_name FROM folders WHERE id = 990000000000112;
  IF v_name <> 'HOP DONG (2)' THEN RAISE EXCEPTION 'FAIL: 3rd sibling must be "HOP DONG (2)" (got %)', v_name; END IF;

  -- a different parent is not a sibling
  INSERT INTO folders (id, name, "parentId") VALUES (990000000000113, 'Hop dong', 990000000000105);
  SELECT name INTO v_name FROM folders WHERE id = 990000000000113;
  IF v_name <> 'Hop dong' THEN RAISE EXCEPTION 'FAIL: other parent must not number (got %)', v_name; END IF;

  -- deleted siblings don't count; restoring one that now collides numbers it
  UPDATE folders SET "isDeleted" = true WHERE id = 990000000000110;
  INSERT INTO folders (id, name, "parentId") VALUES (990000000000114, 'Hop dong', 990000000000102);
  SELECT name INTO v_name FROM folders WHERE id = 990000000000114;
  IF v_name <> 'Hop dong' THEN RAISE EXCEPTION 'FAIL: a deleted sibling must not count (got %)', v_name; END IF;
  UPDATE folders SET "isDeleted" = false WHERE id = 990000000000110;
  SELECT name INTO v_name FROM folders WHERE id = 990000000000110;
  IF v_name <> 'Hop dong (3)' THEN RAISE EXCEPTION 'FAIL: restored duplicate must be numbered (got %)', v_name; END IF;

  -- renaming onto a sibling numbers it
  INSERT INTO folders (id, name, "parentId") VALUES (990000000000115, 'Tai lieu', 990000000000102);
  UPDATE folders SET name = 'hop dong' WHERE id = 990000000000115;
  SELECT name INTO v_name FROM folders WHERE id = 990000000000115;
  IF v_name <> 'hop dong (4)' THEN RAISE EXCEPTION 'FAIL: rename onto a sibling must be numbered (got %)', v_name; END IF;
END;
$test$;

-- ---- 3. documents --------------------------------------------------------------
DO $test$
DECLARE
  v_title text;
BEGIN
  INSERT INTO documents (id, title, "folderId") VALUES (990000000000201, 'Report.pdf', 990000000000102);
  INSERT INTO documents (id, title, "folderId") VALUES (990000000000202, 'report.pdf', 990000000000102);
  INSERT INTO documents (id, title, "folderId") VALUES (990000000000203, 'Report.pdf', 990000000000102);
  SELECT title INTO v_title FROM documents WHERE id = 990000000000202;
  IF v_title <> 'report (1).pdf' THEN RAISE EXCEPTION 'FAIL: expected "report (1).pdf" (got %)', v_title; END IF;
  SELECT title INTO v_title FROM documents WHERE id = 990000000000203;
  IF v_title <> 'Report (2).pdf' THEN RAISE EXCEPTION 'FAIL: expected "Report (2).pdf" (got %)', v_title; END IF;

  -- getUniqueFileName's extension rule: last dot, not a leading dot
  INSERT INTO documents (id, title, "folderId") VALUES (990000000000204, 'archive.tar.gz', 990000000000102);
  INSERT INTO documents (id, title, "folderId") VALUES (990000000000205, 'archive.tar.gz', 990000000000102);
  SELECT title INTO v_title FROM documents WHERE id = 990000000000205;
  IF v_title <> 'archive.tar (1).gz' THEN RAISE EXCEPTION 'FAIL: expected "archive.tar (1).gz" (got %)', v_title; END IF;
  INSERT INTO documents (id, title, "folderId") VALUES (990000000000206, '.env', 990000000000102);
  INSERT INTO documents (id, title, "folderId") VALUES (990000000000207, '.env', 990000000000102);
  SELECT title INTO v_title FROM documents WHERE id = 990000000000207;
  IF v_title <> '.env (1)' THEN RAISE EXCEPTION 'FAIL: expected ".env (1)" (got %)', v_title; END IF;

  -- another folder / deleted documents don't count
  INSERT INTO documents (id, title, "folderId") VALUES (990000000000208, 'Report.pdf', 990000000000105);
  SELECT title INTO v_title FROM documents WHERE id = 990000000000208;
  IF v_title <> 'Report.pdf' THEN RAISE EXCEPTION 'FAIL: other folder must not number (got %)', v_title; END IF;
  UPDATE documents SET "isDeleted" = true WHERE id IN (990000000000201, 990000000000202, 990000000000203);
  INSERT INTO documents (id, title, "folderId") VALUES (990000000000209, 'Report.pdf', 990000000000102);
  SELECT title INTO v_title FROM documents WHERE id = 990000000000209;
  IF v_title <> 'Report.pdf' THEN RAISE EXCEPTION 'FAIL: deleted documents must not count (got %)', v_title; END IF;

  -- moving a document into a folder where the title exists numbers it
  UPDATE documents SET "folderId" = 990000000000102 WHERE id = 990000000000208;
  SELECT title INTO v_title FROM documents WHERE id = 990000000000208;
  IF v_title <> 'Report (1).pdf' THEN RAISE EXCEPTION 'FAIL: moved duplicate must be numbered (got %)', v_title; END IF;
END;
$test$;

-- ---- 4. deleting a customer ------------------------------------------------------
DO $test$
DECLARE
  blocked boolean;
  v_count int;
BEGIN
  -- A. references still set when the customer row is deleted
  INSERT INTO customers (id, "customerName", "customerType", "taxCode") VALUES (990000000000301, 'Delete Guard Co A', 'company', '0400000001');
  INSERT INTO folders (id, name, "customerId", "parentId") VALUES (990000000000311, 'Delete Guard Co A', 990000000000301, 990000000000101);
  INSERT INTO folders (id, name, "customerId", "parentId") VALUES (990000000000312, 'Ho so', 990000000000301, 990000000000311);
  INSERT INTO folders (id, name, "parentId") VALUES (990000000000313, 'Sub without customer id', 990000000000312);
  -- a Case folder under the customer's root is not the customer's: it stays
  INSERT INTO folders (id, name, "customerId", "projectId", "parentId") VALUES (990000000000314, 'Case folder', 990000000000301, 990000000000399, 990000000000311);
  INSERT INTO documents (id, title, "folderId") VALUES (990000000000321, 'a.pdf', 990000000000313);
  INSERT INTO documents (id, title, "folderId") VALUES (990000000000322, 'case.pdf', 990000000000314);
  INSERT INTO documents (id, title, "customerId") VALUES (990000000000323, 'loose.pdf', 990000000000301);

  DELETE FROM customers WHERE id = 990000000000301;

  SELECT count(*) INTO v_count FROM folders WHERE id IN (990000000000311, 990000000000312, 990000000000313) AND "isDeleted" IS TRUE AND "deletedAt" IS NOT NULL;
  IF v_count <> 3 THEN RAISE EXCEPTION 'FAIL: A — the customer''s folder tree must go to Trash (got %)', v_count; END IF;
  IF (SELECT "isDeleted" FROM folders WHERE id = 990000000000314) IS TRUE THEN RAISE EXCEPTION 'FAIL: A — a Case folder must stay'; END IF;
  SELECT count(*) INTO v_count FROM documents WHERE id IN (990000000000321, 990000000000323) AND "isDeleted" IS TRUE;
  IF v_count <> 2 THEN RAISE EXCEPTION 'FAIL: A — the customer''s documents must go to Trash (got %)', v_count; END IF;
  IF (SELECT "isDeleted" FROM documents WHERE id = 990000000000322) IS TRUE THEN RAISE EXCEPTION 'FAIL: A — a Case document must stay'; END IF;

  -- B. NocoBase order: references nulled first, then the DELETE; checked at commit
  INSERT INTO customers (id, "customerName", "customerType", "taxCode") VALUES (990000000000302, 'Delete Guard Co B', 'company', '0400000002');
  INSERT INTO folders (id, name, "customerId", "parentId") VALUES (990000000000331, 'Delete Guard Co B', 990000000000302, 990000000000101);
  INSERT INTO folders (id, name, "customerId", "parentId") VALUES (990000000000332, 'Hop dong', 990000000000302, 990000000000331);
  INSERT INTO documents (id, title, "folderId", "customerId") VALUES (990000000000341, 'b.pdf', 990000000000332, 990000000000302);
  INSERT INTO documents (id, title, "customerId") VALUES (990000000000342, 'loose-b.pdf', 990000000000302);

  UPDATE folders SET "customerId" = NULL WHERE "customerId" = 990000000000302;
  UPDATE documents SET "customerId" = NULL WHERE "customerId" = 990000000000302;
  -- unlinking never renamed the folder
  IF (SELECT name FROM folders WHERE id = 990000000000331) <> 'Delete Guard Co B' THEN RAISE EXCEPTION 'FAIL: B — unlinking must not rename'; END IF;
  DELETE FROM customers WHERE id = 990000000000302;
  SET CONSTRAINTS ALL IMMEDIATE;  -- run the commit-time triggers now
  SET CONSTRAINTS ALL DEFERRED;

  SELECT count(*) INTO v_count FROM folders WHERE id IN (990000000000331, 990000000000332) AND "isDeleted" IS TRUE;
  IF v_count <> 2 THEN RAISE EXCEPTION 'FAIL: B — folders unlinked by the deletion must go to Trash (got %)', v_count; END IF;
  SELECT count(*) INTO v_count FROM documents WHERE id IN (990000000000341, 990000000000342) AND "isDeleted" IS TRUE;
  IF v_count <> 2 THEN RAISE EXCEPTION 'FAIL: B — documents unlinked by the deletion must go to Trash (got %)', v_count; END IF;

  -- unlinking a folder from a customer that still exists changes nothing else
  INSERT INTO customers (id, "customerName", "customerType", "taxCode") VALUES (990000000000304, 'Delete Guard Co D', 'company', '0400000004');
  INSERT INTO folders (id, name, "customerId", "parentId") VALUES (990000000000361, 'Delete Guard Co D', 990000000000304, 990000000000101);
  UPDATE folders SET "customerId" = NULL WHERE id = 990000000000361;
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
  IF (SELECT "isDeleted" FROM folders WHERE id = 990000000000361) IS TRUE THEN RAISE EXCEPTION 'FAIL: plain unlinking must not trash'; END IF;

  -- C. a customer with a Case can't be deleted (references still set)
  INSERT INTO customers (id, "customerName", "customerType", "taxCode") VALUES (990000000000303, 'Delete Guard Co C', 'company', '0400000003');
  INSERT INTO projects (id, "projectName", "customerId") VALUES (990000000000351, 'Delete Guard Case', 990000000000303);
  blocked := false;
  BEGIN
    DELETE FROM customers WHERE id = 990000000000303;
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: C — a customer with Cases must not be deletable'; END IF;

  -- D. same, NocoBase order: the Case reference nulled first → refused at commit
  blocked := false;
  BEGIN
    UPDATE projects SET "customerId" = NULL WHERE id = 990000000000351;
    DELETE FROM customers WHERE id = 990000000000303;
    SET CONSTRAINTS ALL IMMEDIATE;
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  SET CONSTRAINTS ALL DEFERRED;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: D — deleting a customer that had Cases must be refused at commit'; END IF;
  IF NOT EXISTS (SELECT 1 FROM customers WHERE id = 990000000000303) THEN RAISE EXCEPTION 'FAIL: D — the refused deletion must be undone'; END IF;
END;
$test$;

SELECT 'ALL NAMING GUARD CHECKS PASSED' AS result;
ROLLBACK;
