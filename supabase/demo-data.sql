-- DEMO DATA. Run in Supabase > SQL Editor. Adds 8 sample products to your FIRST store
-- so Home, Explore and Search have something to show.
-- Every demo product slug starts with "demo-", so they are easy to remove (see bottom).

with s as (select id from public.seller_profiles order by created_at limit 1),
c as (select id, row_number() over (order by sort_order) rn from public.categories),
n as (select count(*) total from public.categories),
items(i, name, descr, price, disc, cond, loc) as (values
  (1,'Wireless Headphones','Over-ear Bluetooth headphones with deep bass and 30-hour battery.',45000,38000,'new','Lagos'),
  (2,'Leather Backpack','Durable everyday backpack with laptop compartment.',32000,null,'new','Abuja'),
  (3,'Running Sneakers','Lightweight breathable sneakers, true to size.',28000,24000,'new','Lagos'),
  (4,'Smart Watch','Fitness tracking, heart rate and notifications.',60000,null,'new','Port Harcourt'),
  (5,'Desk Lamp','Adjustable LED desk lamp with three brightness levels.',12000,null,'used','Abuja'),
  (6,'Cotton T-Shirt Pack','Pack of three soft cotton t-shirts.',15000,12000,'new','Lagos'),
  (7,'Phone Stand','Foldable aluminium stand for phones and tablets.',5000,null,'new','Ibadan'),
  (8,'Portable Speaker','Water-resistant speaker with 12-hour playtime.',35000,29000,'refurbished','Lagos')
),
ins as (
  insert into public.products (seller_id, category_id, name, slug, description, price, discount_price, condition, location, status, featured)
  select s.id,
         (select c.id from c, n where c.rn = ((items.i - 1) % n.total) + 1),
         items.name, 'demo-' || items.i || '-' || substr(md5(random()::text), 1, 5),
         items.descr, items.price, items.disc, items.cond, items.loc, 'published', items.i <= 3
  from items, s
  returning id, name, slug
)
insert into public.product_images (product_id, image_url, sort_order)
select ins.id, 'https://picsum.photos/seed/' || ins.slug || '/800/800', 0 from ins;

-- To remove the demo products later:
-- delete from public.products where slug like 'demo-%';
