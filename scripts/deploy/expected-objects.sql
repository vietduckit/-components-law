-- Run by scripts/deploy/gen-dev-check.js through scripts/tests/sql/run-local.sh,
-- on a throwaway Postgres that has just loaded the repo's SQL files: prints the
-- functions (with the md5 of their body), triggers and index key column counts
-- they define, as one JSON line.
\pset format unaligned
\pset tuples_only on
SELECT '@@EXPECTED@@' || json_build_object(
  'functions', (
    SELECT json_agg(json_build_object(
             'name', p.proname,
             'args', pg_get_function_identity_arguments(p.oid),
             'md5', md5(p.prosrc))
           ORDER BY p.proname, pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'),
  'triggers', (
    SELECT json_agg(json_build_object('table', c.relname, 'name', t.tgname, 'function', f.proname)
           ORDER BY c.relname, t.tgname)
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc f ON f.oid = t.tgfoid
    WHERE NOT t.tgisinternal AND n.nspname = 'public'),
  'indexes', (
    SELECT json_agg(json_build_object('name', i.relname, 'columns', ix.indnatts) ORDER BY i.relname)
    FROM pg_index ix
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_namespace n ON n.oid = i.relnamespace
    WHERE n.nspname = 'public')
)::text;
