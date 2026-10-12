-- Run this once in Supabase Dashboard → SQL Editor.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  category text not null default 'snacks' check (category in ('snacks','sweets','mixtures','other')),
  stock numeric(12,3) not null default 0 check (stock >= 0),
  unit text not null default 'packets' check (unit in ('packets','pieces','kg')),
  price numeric(12,2) not null check (price >= 0),
  low_stock_threshold numeric(12,3) not null default 10 check (low_stock_threshold >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);
alter table public.products add column if not exists active boolean not null default true;

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id uuid not null,
  product_name text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  customer_name text not null default '',
  created_at timestamptz not null default now(),
  constraint sales_product_owner_fk foreign key (product_id, owner_id)
    references public.products(id, owner_id) on delete restrict
);

create table if not exists public.customer_orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  customer_name text not null default '',
  total numeric(14,2) not null check (total >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0 and amount_paid <= total),
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);
create unique index if not exists customers_owner_name_unique_idx on public.customers(owner_id, lower(name));

alter table public.sales add column if not exists order_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sales_order_owner_fk') then
    alter table public.sales add constraint sales_order_owner_fk foreign key (order_id, owner_id)
      references public.customer_orders(id, owner_id) on delete cascade;
  end if;
end $$;
-- Keep historical one-product sales visible as one-line orders after migration.
insert into public.customer_orders(id, owner_id, customer_name, total, amount_paid, created_at)
select id, owner_id, customer_name, total, 0, created_at from public.sales where order_id is null
on conflict (id) do nothing;
update public.sales set order_id = id where order_id is null;

create index if not exists products_owner_name_idx on public.products(owner_id, name);
create index if not exists sales_owner_created_idx on public.sales(owner_id, created_at desc);
create index if not exists sales_owner_customer_idx on public.sales(owner_id, lower(customer_name));
create index if not exists sales_owner_order_idx on public.sales(owner_id, order_id);
create index if not exists customer_orders_owner_created_idx on public.customer_orders(owner_id, created_at desc);

alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.customer_orders enable row level security;
alter table public.customers enable row level security;

drop policy if exists "Users manage their own products" on public.products;
create policy "Users manage their own products" on public.products
  for all to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users read their own sales" on public.sales;
create policy "Users read their own sales" on public.sales
  for select to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists "Users manage their own orders" on public.customer_orders;
drop policy if exists "Users read their own orders" on public.customer_orders;
drop policy if exists "Users update their own order payments" on public.customer_orders;
create policy "Users read their own orders" on public.customer_orders
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Users update their own order payments" on public.customer_orders
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id and amount_paid <= total);

drop policy if exists "Users manage their own customers" on public.customers;
create policy "Users manage their own customers" on public.customers
  for all to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create or replace function public.record_order(p_items jsonb, p_customer_name text default '', p_amount_paid numeric default 0)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_item record;
  v_product record;
  v_total numeric(14,2) := 0;
  v_order_id uuid;
begin
  if v_owner is null then raise exception 'Sign in to record an order'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Add at least one product'; end if;
  if p_amount_paid is null or p_amount_paid < 0 then raise exception 'Payment cannot be negative'; end if;

  for v_item in select product_id, sum(quantity) as quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity numeric)
    group by product_id
  loop
    if v_item.quantity <= 0 then raise exception 'Quantity must be greater than zero'; end if;
    select id, name, price, stock into v_product from public.products
      where id = v_item.product_id and owner_id = v_owner for update;
    if not found then raise exception 'Product not found'; end if;
    if v_product.stock < v_item.quantity then raise exception 'Not enough stock for %', v_product.name; end if;
    v_total := v_total + round(v_product.price * v_item.quantity, 2);
  end loop;
  if p_amount_paid > v_total then raise exception 'Amount paid cannot exceed order total'; end if;

  insert into public.customer_orders(owner_id, customer_name, total, amount_paid)
  values (v_owner, coalesce(trim(p_customer_name), ''), v_total, p_amount_paid)
  returning id into v_order_id;

  for v_item in select product_id, sum(quantity) as quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity numeric)
    group by product_id
  loop
    select name, price into v_product from public.products where id = v_item.product_id and owner_id = v_owner;
    update public.products set stock = stock - v_item.quantity where id = v_item.product_id and owner_id = v_owner;
    insert into public.sales(owner_id, order_id, product_id, product_name, quantity, unit_price, customer_name)
    values (v_owner, v_order_id, v_item.product_id, v_product.name, v_item.quantity, v_product.price, coalesce(trim(p_customer_name), ''));
  end loop;
  return v_order_id;
end;
$$;

create or replace function public.record_sale(p_product_id uuid, p_quantity numeric, p_customer_name text default '')
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_name text;
  v_price numeric(12,2);
  v_stock numeric(12,3);
  v_sale_id uuid;
begin
  if v_owner is null then raise exception 'Sign in to record a sale'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Quantity must be greater than zero'; end if;

  select name, price, stock into v_name, v_price, v_stock
  from public.products
  where id = p_product_id and owner_id = v_owner
  for update;

  if not found then raise exception 'Product not found'; end if;
  if v_stock < p_quantity then raise exception 'Not enough stock'; end if;

  update public.products set stock = stock - p_quantity
  where id = p_product_id and owner_id = v_owner;

  insert into public.sales(owner_id, product_id, product_name, quantity, unit_price, customer_name)
  values (v_owner, p_product_id, v_name, p_quantity, v_price, coalesce(trim(p_customer_name), ''))
  returning id into v_sale_id;

  return v_sale_id;
end;
$$;

create or replace function public.restock_product(p_product_id uuid, p_quantity numeric)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_stock numeric(12,3);
begin
  if v_owner is null then raise exception 'Sign in to restock'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Restock quantity must be greater than zero'; end if;
  update public.products set stock = stock + p_quantity
  where id = p_product_id and owner_id = v_owner
  returning stock into v_stock;
  if not found then raise exception 'Product not found'; end if;
  return v_stock;
end;
$$;

revoke all on function public.record_sale(uuid, numeric, text) from public;
revoke all on function public.record_order(jsonb, text, numeric) from public;
revoke all on function public.restock_product(uuid, numeric) from public;
grant execute on function public.record_sale(uuid, numeric, text) to authenticated;
grant execute on function public.record_order(jsonb, text, numeric) to authenticated;
grant execute on function public.restock_product(uuid, numeric) to authenticated;

grant select, insert, update, delete on public.products to authenticated;
grant select on public.sales to authenticated;
grant select on public.customer_orders to authenticated;
grant update (amount_paid) on public.customer_orders to authenticated;
grant select, insert on public.customers to authenticated;

-- Employee and attendance records are private to the signed-in account.
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  daily_wage numeric(12,2) not null check (daily_wage >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  employee_id uuid not null,
  work_date date not null,
  status text not null check (status in ('present','half_day','absent')),
  created_at timestamptz not null default now(),
  unique (employee_id, work_date),
  constraint attendance_employee_owner_fk foreign key (employee_id, owner_id)
    references public.employees(id, owner_id) on delete cascade
);

create table if not exists public.salary_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  employee_id uuid not null,
  work_month date not null check (extract(day from work_month) = 1),
  amount numeric(12,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  constraint salary_payment_employee_owner_fk foreign key (employee_id, owner_id)
    references public.employees(id, owner_id) on delete cascade
);

create index if not exists employees_owner_name_idx on public.employees(owner_id, name);
create index if not exists attendance_owner_date_idx on public.attendance(owner_id, work_date);
create index if not exists salary_payments_owner_month_idx on public.salary_payments(owner_id, work_month, employee_id);

alter table public.employees enable row level security;
alter table public.attendance enable row level security;
alter table public.salary_payments enable row level security;

drop policy if exists "Users manage their own employees" on public.employees;
create policy "Users manage their own employees" on public.employees
  for all to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users manage their own attendance" on public.attendance;
create policy "Users manage their own attendance" on public.attendance
  for all to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id and work_date <= current_date);

drop policy if exists "Users manage their own salary payments" on public.salary_payments;
create policy "Users manage their own salary payments" on public.salary_payments
  for all to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id and work_month <= date_trunc('month', current_date)::date);

grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update, delete on public.attendance to authenticated;
grant select, insert, update, delete on public.salary_payments to authenticated;

-- Raw materials used by the business (separate from finished product stock).
create table if not exists public.raw_materials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  quantity numeric(12,3) not null default 0 check (quantity >= 0),
  unit text not null check (unit in ('kg','units')),
  low_stock_threshold numeric(12,3) not null default 5 check (low_stock_threshold >= 0),
  check (unit = 'kg' or (quantity = trunc(quantity) and low_stock_threshold = trunc(low_stock_threshold))),
  created_at timestamptz not null default now()
);

create index if not exists raw_materials_owner_name_idx on public.raw_materials(owner_id, name);
alter table public.raw_materials enable row level security;
drop policy if exists "Users manage their own raw materials" on public.raw_materials;
create policy "Users manage their own raw materials" on public.raw_materials
  for all to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
grant select, insert, update, delete on public.raw_materials to authenticated;

create or replace function public.adjust_raw_material(p_material_id uuid, p_delta numeric)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_quantity numeric(12,3);
  v_unit text;
begin
  if v_owner is null then raise exception 'Sign in to adjust raw material stock'; end if;
  if p_delta is null or p_delta = 0 then raise exception 'Enter a quantity greater than zero'; end if;
  select quantity, unit into v_quantity, v_unit from public.raw_materials
    where id = p_material_id and owner_id = v_owner for update;
  if not found then raise exception 'Raw material not found'; end if;
  if v_unit = 'units' and p_delta <> trunc(p_delta) then raise exception 'Unit quantities must be whole numbers'; end if;
  if v_quantity + p_delta < 0 then raise exception 'Used quantity cannot exceed available stock'; end if;
  update public.raw_materials set quantity = quantity + p_delta
    where id = p_material_id and owner_id = v_owner returning quantity into v_quantity;
  return v_quantity;
end;
$$;

revoke all on function public.adjust_raw_material(uuid, numeric) from public;
grant execute on function public.adjust_raw_material(uuid, numeric) to authenticated;

-- Shared public workspace: no sign-in is required, and every visitor uses the same records.
-- Existing rows remain intact; owner_id is retained only for compatibility with older records.
alter table public.products alter column owner_id drop not null;
alter table public.sales alter column owner_id drop not null;
alter table public.customer_orders alter column owner_id drop not null;
alter table public.customers alter column owner_id drop not null;
alter table public.employees alter column owner_id drop not null;
alter table public.attendance alter column owner_id drop not null;
alter table public.salary_payments alter column owner_id drop not null;
alter table public.raw_materials alter column owner_id drop not null;

alter table public.products disable row level security;
alter table public.sales disable row level security;
alter table public.customer_orders disable row level security;
alter table public.customers disable row level security;
alter table public.employees disable row level security;
alter table public.attendance disable row level security;
alter table public.salary_payments disable row level security;
alter table public.raw_materials disable row level security;

grant select, insert, update, delete on public.products to anon, authenticated;
grant select, insert, update, delete on public.sales to anon, authenticated;
grant select, insert, update, delete on public.customer_orders to anon, authenticated;
grant select, insert, update, delete on public.customers to anon, authenticated;
grant select, insert, update, delete on public.employees to anon, authenticated;
grant select, insert, update, delete on public.attendance to anon, authenticated;
grant select, insert, update, delete on public.salary_payments to anon, authenticated;
grant select, insert, update, delete on public.raw_materials to anon, authenticated;

create or replace function public.record_order(p_items jsonb, p_customer_name text default '', p_amount_paid numeric default 0)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item record;
  v_product record;
  v_total numeric(14,2) := 0;
  v_order_id uuid;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Add at least one product'; end if;
  if p_amount_paid is null or p_amount_paid < 0 then raise exception 'Payment cannot be negative'; end if;

  for v_item in select product_id, sum(quantity) as quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity numeric)
    group by product_id
  loop
    if v_item.quantity <= 0 then raise exception 'Quantity must be greater than zero'; end if;
    select id, name, price, stock into v_product from public.products
      where id = v_item.product_id and active for update;
    if not found then raise exception 'Product not found'; end if;
    if v_product.stock < v_item.quantity then raise exception 'Not enough stock for %', v_product.name; end if;
    v_total := v_total + round(v_product.price * v_item.quantity, 2);
  end loop;
  if p_amount_paid > v_total then raise exception 'Amount paid cannot exceed order total'; end if;

  insert into public.customer_orders(customer_name, total, amount_paid)
  values (coalesce(trim(p_customer_name), ''), v_total, p_amount_paid)
  returning id into v_order_id;

  for v_item in select product_id, sum(quantity) as quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity numeric)
    group by product_id
  loop
    select name, price into v_product from public.products where id = v_item.product_id and active;
    update public.products set stock = stock - v_item.quantity where id = v_item.product_id;
    insert into public.sales(order_id, product_id, product_name, quantity, unit_price, customer_name)
    values (v_order_id, v_item.product_id, v_product.name, v_item.quantity, v_product.price, coalesce(trim(p_customer_name), ''));
  end loop;
  return v_order_id;
end;
$$;

create or replace function public.record_sale(p_product_id uuid, p_quantity numeric, p_customer_name text default '')
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
  v_price numeric(12,2);
  v_stock numeric(12,3);
  v_sale_id uuid;
begin
  if p_quantity is null or p_quantity <= 0 then raise exception 'Quantity must be greater than zero'; end if;
  select name, price, stock into v_name, v_price, v_stock from public.products where id = p_product_id and active for update;
  if not found then raise exception 'Product not found'; end if;
  if v_stock < p_quantity then raise exception 'Not enough stock'; end if;
  update public.products set stock = stock - p_quantity where id = p_product_id and active;
  insert into public.sales(product_id, product_name, quantity, unit_price, customer_name)
  values (p_product_id, v_name, p_quantity, v_price, coalesce(trim(p_customer_name), '')) returning id into v_sale_id;
  return v_sale_id;
end;
$$;

create or replace function public.restock_product(p_product_id uuid, p_quantity numeric)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_stock numeric(12,3);
begin
  if p_quantity is null or p_quantity <= 0 then raise exception 'Restock quantity must be greater than zero'; end if;
  update public.products set stock = stock + p_quantity where id = p_product_id and active returning stock into v_stock;
  if not found then raise exception 'Product not found'; end if;
  return v_stock;
end;
$$;

create or replace function public.adjust_raw_material(p_material_id uuid, p_delta numeric)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quantity numeric(12,3);
  v_unit text;
begin
  if p_delta is null or p_delta = 0 then raise exception 'Enter a quantity greater than zero'; end if;
  select quantity, unit into v_quantity, v_unit from public.raw_materials where id = p_material_id for update;
  if not found then raise exception 'Raw material not found'; end if;
  if v_unit = 'units' and p_delta <> trunc(p_delta) then raise exception 'Unit quantities must be whole numbers'; end if;
  if v_quantity + p_delta < 0 then raise exception 'Used quantity cannot exceed available stock'; end if;
  update public.raw_materials set quantity = quantity + p_delta where id = p_material_id returning quantity into v_quantity;
  return v_quantity;
end;
$$;

revoke all on function public.record_sale(uuid, numeric, text) from public;
revoke all on function public.record_order(jsonb, text, numeric) from public;
revoke all on function public.restock_product(uuid, numeric) from public;
revoke all on function public.adjust_raw_material(uuid, numeric) from public;
grant execute on function public.record_sale(uuid, numeric, text) to anon, authenticated;
grant execute on function public.record_order(jsonb, text, numeric) to anon, authenticated;
grant execute on function public.restock_product(uuid, numeric) to anon, authenticated;
grant execute on function public.adjust_raw_material(uuid, numeric) to anon, authenticated;

create or replace function public.rename_customer(p_customer_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_name text;
  v_new_name text := trim(coalesce(p_name, ''));
begin
  if char_length(v_new_name) not between 1 and 120 then raise exception 'Customer name must be between 1 and 120 characters'; end if;
  select name into v_old_name from public.customers where id = p_customer_id for update;
  if not found then raise exception 'Customer not found'; end if;
  if exists (select 1 from public.customers where id <> p_customer_id and lower(name) = lower(v_new_name)) then
    raise exception 'That customer already exists';
  end if;
  update public.customers set name = v_new_name where id = p_customer_id;
  update public.customer_orders set customer_name = v_new_name where customer_name = v_old_name;
  update public.sales set customer_name = v_new_name where customer_name = v_old_name;
end;
$$;

revoke all on function public.rename_customer(uuid, text) from public;
grant execute on function public.rename_customer(uuid, text) to anon, authenticated;

create or replace function public.remove_customer(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
begin
  select name into v_name from public.customers where id = p_customer_id for update;
  if not found then raise exception 'Customer not found'; end if;
  delete from public.customers where id = p_customer_id;
  update public.customer_orders set customer_name = '' where customer_name = v_name;
  update public.sales set customer_name = '' where customer_name = v_name;
end;
$$;

revoke all on function public.remove_customer(uuid) from public;
grant execute on function public.remove_customer(uuid) to anon, authenticated;
