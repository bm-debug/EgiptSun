-- Migration: Convert taxonomy.title and taxonomy.category from plain text to JSON format
-- This migration converts existing title values to JSON format {"en": "...", "ru": "..."}
-- Extracts category from data_in JSON field and creates separate category field
-- If title/category is already in JSON format, it will be preserved
-- If title/category is a plain string, it will be converted to {"en": "<value>", "ru": "<value>"}
-- Adds category field to taxonomy table (data_in field should already exist)

-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- If category column already exists, comment out the next line before running migration

-- Add category field to taxonomy table
ALTER TABLE taxonomy ADD COLUMN category text;

-- Extract category from data_in and convert to JSON format
-- data_in structure: {"category": {"en": "...", "ru": "..."}}
UPDATE taxonomy
SET category = CASE
  -- If data_in is NULL or empty, set category to NULL
  WHEN data_in IS NULL OR data_in = '' THEN NULL
  -- If data_in contains valid JSON with category field, extract it
  -- json_extract returns the category object as JSON string
  WHEN json_valid(data_in) = 1 AND json_extract(data_in, '$.category') IS NOT NULL THEN 
    -- Extract category value (already a JSON object)
    json_extract(data_in, '$.category')
  -- Otherwise, set to NULL
  ELSE NULL
END
WHERE data_in IS NOT NULL AND data_in != ''
  AND (category IS NULL OR category = '');

-- Update existing records: convert plain text titles to JSON format
UPDATE taxonomy
SET title = CASE
  -- If title is NULL or empty, set to NULL
  WHEN title IS NULL OR title = '' THEN NULL
  -- If title is already valid JSON, keep it as is
  WHEN json_valid(title) = 1 THEN title
  -- Otherwise, convert plain text to JSON with both en and ru set to the same value
  ELSE json_object('en', title, 'ru', title)
END
WHERE title IS NOT NULL AND title != '';

