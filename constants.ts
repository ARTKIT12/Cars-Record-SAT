export const APP_NAME = "SoftGuard";
export const DB_SCHEMA_SQL = `
-- COPY THIS INTO SUPABASE SQL EDITOR --

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Employees Table
create table employees (
  id uuid default uuid_generate_v4() primary key,
  first_name text not null,
  last_name text not null,
  department text,
  position text,
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Vehicles Table (One employee can have many)
create table vehicles (
  id uuid default uuid_generate_v4() primary key,
  employee_id uuid references employees(id) on delete cascade not null,
  license_plate text not null unique,
  type text check (type in ('CAR', 'MOTORCYCLE')),
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Logs Table
create table access_logs (
  id uuid default uuid_generate_v4() primary key,
  employee_id uuid references employees(id) not null,
  vehicle_id uuid references vehicles(id), -- Nullable for 'WIN'
  vehicle_type text not null, -- Stores the actual type used that day (CAR, MOTORCYCLE, WIN)
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  guard_id text -- Could be a UUID if we had a users table
);

-- Seed Data (Optional)
insert into employees (first_name, last_name, department, position, photo_url) values
('Somsri', 'Meemark', 'HR', 'Manager', 'https://picsum.photos/200'),
('Somchai', 'Jaidee', 'IT', 'Developer', 'https://picsum.photos/201');

insert into vehicles (employee_id, license_plate, type) 
select id, '1กก-9999', 'CAR' from employees where first_name = 'Somsri';

insert into vehicles (employee_id, license_plate, type) 
select id, '2ขข-8888', 'MOTORCYCLE' from employees where first_name = 'Somchai';
`;
