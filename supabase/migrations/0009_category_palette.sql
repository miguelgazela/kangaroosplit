-- Design review 2026-10 (design/REVISAO_DESIGN_2026-10.md, 2.10): the six
-- preset categories take a fixed palette, so charts never use the accent.
-- Only preset rows are touched; custom categories keep their own colour.
-- Paste into the Supabase SQL Editor.

begin;

update kangaroosplit.categories as c
set color = p.color
from (values
  ('Renda', '#5B6474'),
  ('Supermercado', '#E07020'),
  ('Restaurantes', '#1A9E8F'),
  ('Contas', '#2F80ED'),
  ('Transportes', '#C99A06'),
  ('Outros', '#D04E8A')
) as p (name, color)
where c.is_preset and c.name = p.name;

commit;
