-- FEPC Gestão Companhia v13 - Supabase/Postgres

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  employee_number text not null,
  full_name text not null,
  role text not null check (role in ('operacional','chefe_equipa','chefe_brigada','comandante')),
  base_monthly_salary numeric default 1446.51,
  fixed_supplements numeric default 623.72,
  hourly_rate numeric default 9.54,
  active boolean default true,
  created_at timestamptz default now()
);

create table shifts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  work_date date not null,
  shift_type text not null,
  hours numeric default 0,
  night_hours numeric default 0,
  created_at timestamptz default now()
);

create table monthly_totals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  year int not null,
  month int not null,
  required_hours numeric default 0,
  worked_hours numeric default 0,
  bank_hours numeric default 0,
  overtime_125 numeric default 0,
  overtime_1375 numeric default 0,
  overtime_150 numeric default 0,
  estimated_debt numeric default 0,
  unique(profile_id, year, month)
);

create table payslips (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  year int not null,
  month int not null,
  gross_paid numeric default 0,
  net_paid numeric default 0,
  overtime_125_paid numeric default 0,
  overtime_1375_paid numeric default 0,
  overtime_150_paid numeric default 0,
  uploaded_file_url text,
  created_at timestamptz default now()
);
