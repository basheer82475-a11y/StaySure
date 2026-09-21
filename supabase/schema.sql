-- ============================================================================
-- StaySure — Supabase schema
-- Run this once in your project's SQL editor (Supabase Dashboard > SQL Editor).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
-- ============================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Storage ----------
-- Creates the public bucket used by partner PG photo uploads. Safe to re-run.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pg-images', 'pg-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------- Enums ----------
do $$ begin
  create type user_role as enum ('student', 'partner', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status as enum ('active', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pg_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type bed_status as enum ('available', 'taken');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_status as enum ('pending', 'accepted', 'rejected');
exception when duplicate_object then null; end $$;

-- ---------- Tables ----------

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role user_role not null default 'student',
  status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pg_partners (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  business_name text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pgs (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references pg_partners(id) on delete cascade,
  name text not null,
  area text not null,
  location text not null,
  full_address text,
  pincode text,
  transport_available boolean not null default false,
  nearby_college text,
  distance_from_college text,
  description text,
  contact_number text,
  owner_name text,
  status pg_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Added after the initial release. These statements make existing databases
-- compatible too, without affecting their existing listings.
alter table pgs add column if not exists full_address text;
alter table pgs add column if not exists pincode text;
alter table pgs add column if not exists transport_available boolean not null default false;
alter table pgs add column if not exists owner_name text;

-- Keep existing installations aligned with the submission-and-approval flow.
alter table pgs alter column status set default 'pending';

create table if not exists pg_images (
  id uuid primary key default gen_random_uuid(),
  pg_id uuid not null references pgs(id) on delete cascade,
  url text not null,
  sort_order int not null default 0
);

create table if not exists amenities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text
);

create table if not exists pg_amenities (
  pg_id uuid not null references pgs(id) on delete cascade,
  amenity_id uuid not null references amenities(id) on delete cascade,
  primary key (pg_id, amenity_id)
);

create table if not exists floors (
  id uuid primary key default gen_random_uuid(),
  pg_id uuid not null references pgs(id) on delete cascade,
  floor_number int not null,
  label text,
  available_seats int check (available_seats is null or available_seats >= 0)
);

-- A partner can provide a floor-wise seat estimate while submitting a PG.
alter table floors add column if not exists available_seats int check (available_seats is null or available_seats >= 0);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references floors(id) on delete cascade,
  pg_id uuid not null references pgs(id) on delete cascade, -- denormalized for simpler RLS
  room_number text not null,
  sharing_type int not null check (sharing_type between 1 and 5),
  ac boolean not null default false
);

create table if not exists beds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  bed_label text not null,
  status bed_status not null default 'available'
);

create table if not exists bed_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  pg_id uuid not null references pgs(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  bed_id uuid not null references beds(id) on delete cascade,
  status request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one ACCEPTED request may ever exist per bed at a time.
create unique index if not exists one_accepted_request_per_bed
  on bed_requests (bed_id)
  where (status = 'accepted');

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- One review per student per PG. Students can update their own rating/comment.
create table if not exists pg_reviews (
  id uuid primary key default gen_random_uuid(),
  pg_id uuid not null references pgs(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(trim(comment)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pg_id, student_id)
);

create index if not exists idx_pgs_status on pgs(status);
create index if not exists idx_pgs_partner on pgs(partner_id);
create index if not exists idx_rooms_pg on rooms(pg_id);
create index if not exists idx_beds_room on beds(room_id);
create index if not exists idx_bed_requests_student on bed_requests(student_id);
create index if not exists idx_bed_requests_pg on bed_requests(pg_id);
create index if not exists idx_pg_reviews_pg on pg_reviews(pg_id, created_at desc);

-- ---------- updated_at trigger helper ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

drop trigger if exists trg_pgs_updated_at on pgs;
create trigger trg_pgs_updated_at before update on pgs
  for each row execute function set_updated_at();

drop trigger if exists trg_bed_requests_updated_at on bed_requests;
create trigger trg_bed_requests_updated_at before update on bed_requests
  for each row execute function set_updated_at();

drop trigger if exists trg_pg_reviews_updated_at on pg_reviews;
create trigger trg_pg_reviews_updated_at before update on pg_reviews
  for each row execute function set_updated_at();

-- ---------- New-user trigger: auto-create profile (+ partner row) on signup ----------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'student');

  insert into profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.email,
    new.raw_user_meta_data->>'phone',
    v_role
  )
  on conflict (id) do nothing;

  if v_role = 'partner' then
    insert into pg_partners (profile_id, business_name)
    values (new.id, new.raw_user_meta_data->>'full_name')
    on conflict (profile_id) do nothing;
  end if;

  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Helper: current user's role (used in RLS policies) ----------
create or replace function auth_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$;

create or replace function owns_pg(p_pg_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from pgs
    join pg_partners on pg_partners.id = pgs.partner_id
    where pgs.id = p_pg_id and pg_partners.profile_id = auth.uid()
  );
$$;

-- Storage objects: uploaded images are public to view, while only partner
-- accounts can add files. The PG-specific database policies still control
-- which image URLs are attached to a listing.
drop policy if exists "pg_images_partner_upload" on storage.objects;
create policy "pg_images_partner_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'pg-images' and auth_role() = 'partner');

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table profiles enable row level security;
alter table pg_partners enable row level security;
alter table pgs enable row level security;
alter table pg_images enable row level security;
alter table amenities enable row level security;
alter table pg_amenities enable row level security;
alter table floors enable row level security;
alter table rooms enable row level security;
alter table beds enable row level security;
alter table bed_requests enable row level security;
alter table notifications enable row level security;
alter table pg_reviews enable row level security;

-- profiles
drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin" on profiles for select
  using (auth.uid() = id or is_admin());

drop policy if exists "profiles_update_own_or_admin" on profiles;
create policy "profiles_update_own_or_admin" on profiles for update
  using (auth.uid() = id or is_admin());

-- pg_partners
drop policy if exists "partners_select_own_public_or_admin" on pg_partners;
create policy "partners_select_own_public_or_admin" on pg_partners for select
  using (true); -- non-sensitive; needed so students can see "Verified partner" on approved PGs

drop policy if exists "partners_update_own_or_admin" on pg_partners;
create policy "partners_update_own_or_admin" on pg_partners for update
  using (profile_id = auth.uid() or is_admin());

drop policy if exists "partners_insert_own" on pg_partners;
create policy "partners_insert_own" on pg_partners for insert
  with check (profile_id = auth.uid());

-- amenities (public reference data)
drop policy if exists "amenities_select_all" on amenities;
create policy "amenities_select_all" on amenities for select using (true);
drop policy if exists "amenities_admin_write" on amenities;
create policy "amenities_admin_write" on amenities for all using (is_admin()) with check (is_admin());

-- pgs
drop policy if exists "pgs_select_approved_or_owner_or_admin" on pgs;
create policy "pgs_select_approved_or_owner_or_admin" on pgs for select
  using (
    status = 'approved'
    or is_admin()
    or exists (select 1 from pg_partners where pg_partners.id = pgs.partner_id and pg_partners.profile_id = auth.uid())
  );

drop policy if exists "pgs_insert_own_partner" on pgs;
create policy "pgs_insert_own_partner" on pgs for insert
  with check (exists (select 1 from pg_partners where pg_partners.id = partner_id and pg_partners.profile_id = auth.uid()));

drop policy if exists "pgs_update_owner_or_admin" on pgs;
create policy "pgs_update_owner_or_admin" on pgs for update
  using (owns_pg(id) or is_admin());

drop policy if exists "pgs_delete_admin" on pgs;
drop policy if exists "pgs_delete_owner_or_admin" on pgs;
create policy "pgs_delete_owner_or_admin" on pgs for delete
  using (owns_pg(id) or is_admin());

-- pg_images / pg_amenities / floors / rooms / beds share the same visibility rule:
-- visible if the parent PG is approved, or owned by the requesting partner, or admin.

drop policy if exists "pg_images_select" on pg_images;
create policy "pg_images_select" on pg_images for select
  using (exists (select 1 from pgs where pgs.id = pg_images.pg_id and (pgs.status = 'approved' or owns_pg(pgs.id) or is_admin())));
drop policy if exists "pg_images_write" on pg_images;
create policy "pg_images_write" on pg_images for all
  using (owns_pg(pg_id) or is_admin()) with check (owns_pg(pg_id) or is_admin());

drop policy if exists "pg_amenities_select" on pg_amenities;
create policy "pg_amenities_select" on pg_amenities for select
  using (exists (select 1 from pgs where pgs.id = pg_amenities.pg_id and (pgs.status = 'approved' or owns_pg(pgs.id) or is_admin())));
drop policy if exists "pg_amenities_write" on pg_amenities;
create policy "pg_amenities_write" on pg_amenities for all
  using (owns_pg(pg_id) or is_admin()) with check (owns_pg(pg_id) or is_admin());

drop policy if exists "floors_select" on floors;
create policy "floors_select" on floors for select
  using (exists (select 1 from pgs where pgs.id = floors.pg_id and (pgs.status = 'approved' or owns_pg(pgs.id) or is_admin())));
drop policy if exists "floors_write" on floors;
create policy "floors_write" on floors for all
  using (owns_pg(pg_id) or is_admin()) with check (owns_pg(pg_id) or is_admin());

drop policy if exists "rooms_select" on rooms;
create policy "rooms_select" on rooms for select
  using (exists (select 1 from pgs where pgs.id = rooms.pg_id and (pgs.status = 'approved' or owns_pg(pgs.id) or is_admin())));
drop policy if exists "rooms_write" on rooms;
create policy "rooms_write" on rooms for all
  using (owns_pg(pg_id) or is_admin()) with check (owns_pg(pg_id) or is_admin());

drop policy if exists "beds_select" on beds;
create policy "beds_select" on beds for select
  using (exists (
    select 1 from rooms join pgs on pgs.id = rooms.pg_id
    where rooms.id = beds.room_id and (pgs.status = 'approved' or owns_pg(pgs.id) or is_admin())
  ));
drop policy if exists "beds_write" on beds;
create policy "beds_write" on beds for all
  using (exists (select 1 from rooms where rooms.id = beds.room_id and (owns_pg(rooms.pg_id) or is_admin())))
  with check (exists (select 1 from rooms where rooms.id = beds.room_id and (owns_pg(rooms.pg_id) or is_admin())));

-- bed_requests: students see/create their own; partners see/manage requests on their PGs; admin sees all
drop policy if exists "bed_requests_select" on bed_requests;
create policy "bed_requests_select" on bed_requests for select
  using (student_id = auth.uid() or owns_pg(pg_id) or is_admin());

drop policy if exists "bed_requests_insert_own" on bed_requests;
create policy "bed_requests_insert_own" on bed_requests for insert
  with check (student_id = auth.uid());

drop policy if exists "bed_requests_update_partner_or_admin" on bed_requests;
create policy "bed_requests_update_partner_or_admin" on bed_requests for update
  using (owns_pg(pg_id) or is_admin());

-- notifications
drop policy if exists "notifications_select_own" on notifications;
create policy "notifications_select_own" on notifications for select using (profile_id = auth.uid());
drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_own" on notifications for update using (profile_id = auth.uid());

-- Reviews: published PG reviews are public; students can only create or edit their own review.
drop policy if exists "pg_reviews_select_visible" on pg_reviews;
create policy "pg_reviews_select_visible" on pg_reviews for select
  using (exists (select 1 from pgs where pgs.id = pg_reviews.pg_id and (pgs.status = 'approved' or owns_pg(pgs.id) or is_admin())));

drop policy if exists "pg_reviews_insert_own_student" on pg_reviews;
create policy "pg_reviews_insert_own_student" on pg_reviews for insert
  with check (student_id = auth.uid() and auth_role() = 'student');

drop policy if exists "pg_reviews_update_own_student" on pg_reviews;
create policy "pg_reviews_update_own_student" on pg_reviews for update
  using (student_id = auth.uid() and auth_role() = 'student')
  with check (student_id = auth.uid() and auth_role() = 'student');

drop policy if exists "pg_reviews_delete_own_or_admin" on pg_reviews;
create policy "pg_reviews_delete_own_or_admin" on pg_reviews for delete
  using (student_id = auth.uid() or is_admin());

-- ============================================================================
-- Booking logic as RPC functions (SECURITY DEFINER) — this is what prevents
-- two students from ever successfully claiming the same bed, and keeps the
-- "accept" action atomic (bed -> taken, request -> accepted, siblings -> rejected).
-- ============================================================================

create or replace function create_bed_request(p_bed_id uuid)
returns bed_requests language plpgsql security definer set search_path = public as $$
declare
  v_room_id uuid;
  v_pg_id uuid;
  v_partner_profile_id uuid;
  v_status bed_status;
  v_request bed_requests;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select room_id, status into v_room_id, v_status from beds where id = p_bed_id for update;

  if v_room_id is null then
    raise exception 'Bed not found';
  end if;
  if v_status <> 'available' then
    raise exception 'This bed is no longer available';
  end if;

  select pg_id into v_pg_id from rooms where id = v_room_id;

  insert into bed_requests (student_id, pg_id, room_id, bed_id, status)
  values (auth.uid(), v_pg_id, v_room_id, p_bed_id, 'pending')
  returning * into v_request;

  select pg_partners.profile_id into v_partner_profile_id
    from pgs join pg_partners on pg_partners.id = pgs.partner_id
    where pgs.id = v_pg_id;
  insert into notifications (profile_id, message)
  values (v_partner_profile_id, 'You have a new bed booking request. Review it in Booking Requests.');

  return v_request;
end; $$;

grant execute on function create_bed_request(uuid) to authenticated;

create or replace function respond_to_request(p_request_id uuid, p_action text)
returns bed_requests language plpgsql security definer set search_path = public as $$
declare
  v_request bed_requests;
  v_is_owner boolean;
begin
  if p_action not in ('accept', 'reject') then
    raise exception 'Invalid action';
  end if;

  select * into v_request from bed_requests where id = p_request_id for update;
  if v_request.id is null then
    raise exception 'Request not found';
  end if;

  v_is_owner := owns_pg(v_request.pg_id);
  if not (v_is_owner or is_admin()) then
    raise exception 'Not authorized';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Request already handled';
  end if;

  if p_action = 'accept' then
    update beds set status = 'taken' where id = v_request.bed_id;
    update bed_requests set status = 'accepted' where id = p_request_id;
    -- Any other pending requests for the same bed are now moot.
    update bed_requests set status = 'rejected'
      where bed_id = v_request.bed_id and id <> p_request_id and status = 'pending';

    insert into notifications (profile_id, message)
    values (v_request.student_id, 'Your bed request was accepted! Check your dashboard for details.');
  else
    update bed_requests set status = 'rejected' where id = p_request_id;
    insert into notifications (profile_id, message)
    values (v_request.student_id, 'Your bed request was declined by the PG partner.');
  end if;

  select * into v_request from bed_requests where id = p_request_id;
  return v_request;
end; $$;

grant execute on function respond_to_request(uuid, text) to authenticated;

-- ============================================================================
-- Convenience view: available bed count per PG (used on Find PG cards)
-- ============================================================================
create or replace view pg_available_beds as
select
  pgs.id as pg_id,
  count(beds.id) filter (where beds.status = 'available') as available_beds_count
from pgs
left join rooms on rooms.pg_id = pgs.id
left join beds on beds.room_id = rooms.id
group by pgs.id;

grant select on pg_available_beds to anon, authenticated;

-- ============================================================================
-- Seed reference data: amenities
-- ============================================================================
insert into amenities (name, icon) values
  ('Wi-Fi', 'wifi'),
  ('Food', 'utensils'),
  ('Laundry', 'shirt'),
  ('Parking', 'car'),
  ('CCTV', 'camera'),
  ('Power Backup', 'zap'),
  ('Hot Water', 'droplet'),
  ('Housekeeping', 'sparkles')
on conflict (name) do nothing;
