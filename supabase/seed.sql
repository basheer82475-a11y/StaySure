-- ============================================================================
-- StaySure — demo seed data
-- Run this AFTER schema.sql, once.
--
-- PART A creates 3 demo login accounts directly in auth.users:
--   admin@staysure.app    / password123   (admin)
--   partner@staysure.app  / password123   (PG partner, verified)
--   partner2@staysure.app / password123   (PG partner, unverified — for the
--                                           admin-approval demo)
--   student@staysure.app  / password123   (student)
--
-- This uses a well-known trick for seeding auth.users directly from SQL.
-- If your Supabase project's auth schema differs and this errors out, skip
-- PART A and just register these accounts through the app's UI instead (role
-- pickers on the Register page cover student/partner; make the admin one
-- admin by running: update profiles set role='admin' where email='...'
-- after they sign up). Then run PART B, which only depends on the emails
-- above already existing in profiles.
-- ============================================================================

-- ---------- PART A: demo accounts ----------
do $$
declare
  v_admin_id uuid := gen_random_uuid();
  v_partner1_id uuid := gen_random_uuid();
  v_partner2_id uuid := gen_random_uuid();
  v_student_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    ('00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
     'admin@staysure.app', crypt('password123', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"StaySure Admin","phone":"9000000001","role":"admin"}', false,
     '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_partner1_id, 'authenticated', 'authenticated',
     'partner@staysure.app', crypt('password123', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Ravi Kumar","phone":"9000000002","role":"partner"}', false,
     '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_partner2_id, 'authenticated', 'authenticated',
     'partner2@staysure.app', crypt('password123', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Lakshmi Devi","phone":"9000000003","role":"partner"}', false,
     '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_student_id, 'authenticated', 'authenticated',
     'student@staysure.app', crypt('password123', gen_salt('bf')), now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Anitha Reddy","phone":"9000000004","role":"student"}', false,
     '', '', '', '')
  on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values
    (gen_random_uuid(), v_admin_id, v_admin_id::text, jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@staysure.app'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_partner1_id, v_partner1_id::text, jsonb_build_object('sub', v_partner1_id::text, 'email', 'partner@staysure.app'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_partner2_id, v_partner2_id::text, jsonb_build_object('sub', v_partner2_id::text, 'email', 'partner2@staysure.app'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_student_id, v_student_id::text, jsonb_build_object('sub', v_student_id::text, 'email', 'student@staysure.app'), 'email', now(), now(), now())
  on conflict do nothing;
exception when others then
  raise notice 'PART A skipped (auth schema mismatch) — register these accounts via the UI instead: %', sqlerrm;
end $$;

-- Admin's role wouldn't be settable through the public Register UI (by design),
-- so make sure it's correct even if PART A partially ran.
update profiles set role = 'admin' where email = 'admin@staysure.app';
update pg_partners set verified = true
  where profile_id = (select id from profiles where email = 'partner@staysure.app');

-- ============================================================================
-- PART B: demo PGs, floors, rooms, beds, and a sample bed request
-- (depends only on the profiles/pg_partners created above by email)
-- ============================================================================
do $$
declare
  v_partner1 uuid;
  v_partner2 uuid;
  v_student uuid;
  v_pg1 uuid; v_pg2 uuid; v_pg3 uuid;
  v_floor uuid;
  v_room uuid;
  v_bed_available uuid;
begin
  select id into v_partner1 from pg_partners where profile_id = (select id from profiles where email = 'partner@staysure.app');
  select id into v_partner2 from pg_partners where profile_id = (select id from profiles where email = 'partner2@staysure.app');
  select id into v_student from profiles where email = 'student@staysure.app';

  if v_partner1 is null then
    raise notice 'PART B skipped — demo partner profiles not found. Run PART A or register demo accounts first.';
    return;
  end if;

  -- ---------------- PG 1: Sunrise Residency (approved) ----------------
  insert into pgs (partner_id, name, area, location, nearby_college, distance_from_college, description, contact_number, status)
  values (v_partner1, 'Sunrise Residency', 'Lakshmipuram', 'Lakshmipuram, Guntur', 'JKC College', '0.8 km',
    'A well-maintained PG close to JKC College with spacious rooms, home-style food, and a quiet study environment.',
    '9000000002', 'approved')
  returning id into v_pg1;

  insert into pg_images (pg_id, url, sort_order) values
    (v_pg1, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 0),
    (v_pg1, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 1);

  insert into pg_amenities (pg_id, amenity_id)
    select v_pg1, id from amenities where name in ('Wi-Fi','Food','Laundry','CCTV','Power Backup','Hot Water');

  -- Floor 1: Room 101 (3 sharing, AC) — 3 beds, 1 taken
  insert into floors (pg_id, floor_number, label) values (v_pg1, 1, 'Floor 1') returning id into v_floor;
  insert into rooms (floor_id, pg_id, room_number, sharing_type, ac) values (v_floor, v_pg1, '101', 3, true) returning id into v_room;
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 1', 'available');
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 2', 'taken');
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 3', 'available') returning id into v_bed_available;

  -- Floor 1: Room 102 (2 sharing, Non-AC)
  insert into rooms (floor_id, pg_id, room_number, sharing_type, ac) values (v_floor, v_pg1, '102', 2, false) returning id into v_room;
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 1', 'available');
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 2', 'taken');

  -- Floor 2: Room 201 (2 sharing, Non-AC) — both available
  insert into floors (pg_id, floor_number, label) values (v_pg1, 2, 'Floor 2') returning id into v_floor;
  insert into rooms (floor_id, pg_id, room_number, sharing_type, ac) values (v_floor, v_pg1, '201', 2, false) returning id into v_room;
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 1', 'available');
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 2', 'available');

  -- Floor 2: Room 202 (4 sharing, AC)
  insert into rooms (floor_id, pg_id, room_number, sharing_type, ac) values (v_floor, v_pg1, '202', 4, true) returning id into v_room;
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 1', 'available');
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 2', 'available');
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 3', 'taken');
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 4', 'available');

  -- ---------------- PG 2: Green Valley PG (approved) ----------------
  insert into pgs (partner_id, name, area, location, nearby_college, distance_from_college, description, contact_number, status)
  values (v_partner1, 'Green Valley PG', 'Brodipet', 'Brodipet, Guntur', 'Nagarjuna University', '2.1 km',
    'Modern PG with single and double sharing rooms, in-house dining, and 24/7 security near Nagarjuna University.',
    '9000000002', 'approved')
  returning id into v_pg2;

  insert into pg_images (pg_id, url, sort_order) values
    (v_pg2, 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800', 0);

  insert into pg_amenities (pg_id, amenity_id)
    select v_pg2, id from amenities where name in ('Wi-Fi','Food','Parking','CCTV','Housekeeping');

  insert into floors (pg_id, floor_number, label) values (v_pg2, 1, 'Floor 1') returning id into v_floor;
  insert into rooms (floor_id, pg_id, room_number, sharing_type, ac) values (v_floor, v_pg2, '1', 1, true) returning id into v_room;
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 1', 'available');

  insert into rooms (floor_id, pg_id, room_number, sharing_type, ac) values (v_floor, v_pg2, '2', 2, true) returning id into v_room;
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 1', 'taken');
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 2', 'taken');

  insert into rooms (floor_id, pg_id, room_number, sharing_type, ac) values (v_floor, v_pg2, '3', 5, false) returning id into v_room;
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 1', 'available');
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 2', 'available');
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 3', 'available');
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 4', 'taken');
  insert into beds (room_id, bed_label, status) values (v_room, 'Bed 5', 'available');

  -- ---------------- PG 3: Campus View Ladies PG (pending approval — for admin demo) ----------------
  if v_partner2 is not null then
    insert into pgs (partner_id, name, area, location, nearby_college, distance_from_college, description, contact_number, status)
    values (v_partner2, 'Campus View Ladies PG', 'Arundelpet', 'Arundelpet, Guntur', 'AC College', '1.4 km',
      'Ladies-only PG with home-cooked food, laundry service, and a short walk to AC College.',
      '9000000003', 'pending')
    returning id into v_pg3;

    insert into pg_images (pg_id, url, sort_order) values
      (v_pg3, 'https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?w=800', 0);

    insert into pg_amenities (pg_id, amenity_id)
      select v_pg3, id from amenities where name in ('Wi-Fi','Food','Laundry','Hot Water');

    insert into floors (pg_id, floor_number, label) values (v_pg3, 1, 'Floor 1') returning id into v_floor;
    insert into rooms (floor_id, pg_id, room_number, sharing_type, ac) values (v_floor, v_pg3, '101', 3, false) returning id into v_room;
    insert into beds (room_id, bed_label, status) values (v_room, 'Bed 1', 'available');
    insert into beds (room_id, bed_label, status) values (v_room, 'Bed 2', 'available');
    insert into beds (room_id, bed_label, status) values (v_room, 'Bed 3', 'taken');
  end if;

  -- ---------------- Sample pending bed request from the demo student ----------------
  if v_student is not null and v_bed_available is not null then
    insert into bed_requests (student_id, pg_id, room_id, bed_id, status)
    select v_student, v_pg1, room_id, v_bed_available, 'pending' from beds where id = v_bed_available;
  end if;

end $$;
