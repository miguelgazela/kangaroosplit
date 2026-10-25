-- Follow-up to 0009: the preset "Renda" was renamed "Casa", so 0009 missed
-- it. Give it the Renda colour from the fixed chart palette. Matches by name,
-- so it works whether or not the row is still marked as a preset.
-- Paste into the Supabase SQL Editor.

update kangaroosplit.categories
set color = '#5B6474'
where name = 'Casa';
