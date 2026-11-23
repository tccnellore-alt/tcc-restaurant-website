-- Preserve the 13 legacy hardcoded sold-out states in the database-backed menu availability system.
-- Existing database choices are kept if an operator has already set a product explicitly.
insert into public.tcc_menu_item_overrides
  (product_key, name, category, section, availability)
values
  ('food|mac & cheese (veg)', 'Mac & Cheese (Veg)', 'Food', 'Pastas', 'sold_out'),
  ('food|italian margherita', 'Italian Margherita', 'Food', 'Pizzas · Veg', 'sold_out'),
  ('food|the farmer''s pizza', 'The Farmer''s Pizza', 'Food', 'Pizzas · Veg', 'sold_out'),
  ('food|pizza verde', 'Pizza Verde', 'Food', 'Pizzas · Veg', 'sold_out'),
  ('food|pesto pizza', 'Pesto Pizza', 'Food', 'Pizzas · Veg', 'sold_out'),
  ('food|bbq chicken pizza', 'BBQ Chicken Pizza', 'Food', 'Pizzas · Non-Veg', 'sold_out'),
  ('food|pesto chicken pizza', 'Pesto Chicken Pizza', 'Food', 'Pizzas · Non-Veg', 'sold_out'),
  ('food|chicken pizzaiola', 'Chicken Pizzaiola', 'Food', 'Pizzas · Non-Veg', 'sold_out'),
  ('desserts|dragon apple delight', 'Dragon Apple Delight', 'Desserts', 'Desserts', 'sold_out'),
  ('desserts|moist chocolate slice', 'Moist Chocolate Slice', 'Desserts', 'Desserts', 'sold_out'),
  ('ice creams|kesari pista', 'Kesari Pista', 'Ice Creams', 'Ice Creams', 'sold_out'),
  ('ice creams|butterscotch', 'Butterscotch', 'Ice Creams', 'Ice Creams', 'sold_out'),
  ('ice creams|tutti frutti', 'Tutti Frutti', 'Ice Creams', 'Ice Creams', 'sold_out')
on conflict (product_key) do nothing;
