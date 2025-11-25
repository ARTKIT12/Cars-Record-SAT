export const APP_NAME = "Cars Record SAT";
export const DB_SCHEMA_SQL = `
-- COPY THIS INTO SUPABASE SQL EDITOR --

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Create Employees Table if not exists
create table if not exists employees (
  id uuid default uuid_generate_v4() primary key,
  first_name text not null,
  last_name text not null,
  department text,
  position text,
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Vehicles Table if not exists
create table if not exists vehicles (
  id uuid default uuid_generate_v4() primary key,
  employee_id uuid references employees(id) on delete cascade not null,
  license_plate text not null unique,
  type text check (type in ('CAR', 'MOTORCYCLE')),
  make text,  -- Brand e.g. Toyota
  model text, -- Model e.g. Altis
  color text, -- Color e.g. White
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Access Logs Table
create table if not exists access_logs (
  id uuid default uuid_generate_v4() primary key,
  employee_id uuid references employees(id) not null,
  vehicle_id uuid references vehicles(id), -- Nullable for 'WIN'
  vehicle_type text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  guard_id text
);

-- 5. MIGRATION: Add columns if they don't exist (Run this safely even if tables exist)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'vehicles' and column_name = 'make') then
    alter table vehicles add column make text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'vehicles' and column_name = 'model') then
    alter table vehicles add column model text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'vehicles' and column_name = 'color') then
    alter table vehicles add column color text;
  end if;
end $$;

-- 6. Seed Data (Optional - Safe to run multiple times)
insert into employees (first_name, last_name, department, position, photo_url) values
('สมศรี', 'มีมาก', 'HR', 'ผู้จัดการ', 'https://ui-avatars.com/api/?name=Somsri+Meemark&background=random'),
('สมชาย', 'ใจดี', 'IT', 'นักพัฒนา', 'https://ui-avatars.com/api/?name=Somchai+Jaidee&background=random')
on conflict do nothing;
`;