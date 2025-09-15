
-- Create products & carts tables (run in Supabase SQL editor)
create table if not exists products (
  id bigint generated always as identity primary key,
  name text not null,
  price numeric not null,
  description text,
  image_url text,
  created_at timestamp with time zone default now()
);

create table if not exists carts (
  id bigint generated always as identity primary key,
  client_id text not null,
  product_id bigint references products(id) on delete cascade,
  qty integer not null default 1,
  created_at timestamp with time zone default now()
);
