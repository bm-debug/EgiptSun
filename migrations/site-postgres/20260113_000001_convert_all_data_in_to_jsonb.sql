

BEGIN;

CREATE OR REPLACE FUNCTION _try_parse_jsonb(_value text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN _value::jsonb;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

DO $$
DECLARE
  r record;
  converted_count integer := 0;
BEGIN
  FOR r IN
    SELECT table_schema, table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'data_in'
      AND data_type IN ('text', 'character varying', 'json')
  LOOP
    converted_count := converted_count + 1;
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I TYPE jsonb USING (
        CASE
          WHEN %I IS NULL THEN NULL
          WHEN btrim(%I::text) = '''' THEN NULL
          WHEN lower(btrim(%I::text)) = ''null'' THEN NULL
          ELSE COALESCE(_try_parse_jsonb(%I::text), jsonb_build_object(''__raw'', %I::text))
        END
      )',
      r.table_schema,
      r.table_name,
      r.column_name,
      r.column_name,
      r.column_name,
      r.column_name,
      r.column_name,
      r.column_name
    );
  END LOOP;

  RAISE NOTICE 'Converted % data_in columns to jsonb', converted_count;
END $$;

DROP FUNCTION _try_parse_jsonb(text);

COMMIT;

