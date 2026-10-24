-- 004: candidate self-reported skills + software (free-text chips from the intake).
-- Stored as JSON arrays of strings; default empty so existing rows are valid.
alter table candidates add column if not exists skills   jsonb not null default '[]'::jsonb;
alter table candidates add column if not exists software jsonb not null default '[]'::jsonb;
