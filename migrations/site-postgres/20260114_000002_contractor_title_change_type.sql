ALTER TABLE "contractors"
  ALTER COLUMN "title" TYPE jsonb
  USING (
    CASE
      WHEN "title" IS NULL THEN NULL
      WHEN left(ltrim("title"::text), 1) IN ('{', '[') THEN ("title"::text)::jsonb
      ELSE jsonb_build_object('en', "title"::text, 'ru', "title"::text, 'rs', "title"::text)
    END
  );