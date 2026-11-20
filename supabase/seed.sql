insert into public.categories (slug, name, sort_order) values
  ('builders','Builders',1), ('landscaping','Landscaping',2), ('handyman','Handyman',3),
  ('plumbing','Plumbing',4), ('flooring','Flooring',5), ('roofing','Roofing',6),
  ('electrical','Electrical',7), ('painting','Painting',8)
on conflict (slug) do nothing;

insert into public.billing_products (slug, name, price_cents, credits, interval) values
  ('credits-20', '20-token top-up', 2000, 20, 'once'),
  ('starter', 'Starter', 7500, 10, 'month'),
  ('pro', 'Trade Pro', 15000, 25, 'month')
on conflict (slug) do nothing;
