<<<<<<< HEAD
# StaySure

**Find a place. Check availability. Stay sure.**

A PG (Paying Guest) discovery and bed-availability platform for students in Guntur, Andhra Pradesh. Built with React + TypeScript + Vite + Tailwind CSS on the frontend, and Supabase (Auth, Postgres, Storage, Row Level Security) as the backend.

---

## 1. Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) account/project

## 2. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick any name/region, set a database password, and wait ~2 minutes for it to provision.
2. In your project, go to **Project Settings → API**. You'll need:
   - **Project URL**
   - **anon / public** key (never use the `service_role` key in the frontend)

## 3. Configure the app

```bash
cp .env.example .env
```

Edit `.env` and paste in your Project URL and anon key:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 4. Set up the database

In the Supabase Dashboard, open **SQL Editor → New query**, then:

1. Paste the contents of `supabase/schema.sql` and run it. This creates all tables, enums, triggers, RLS policies, and the two safe-booking functions (`create_bed_request`, `respond_to_request`) that guarantee two students can never claim the same bed.
2. Paste the contents of `supabase/seed.sql` and run it. This creates 4 demo login accounts and realistic Guntur PG demo data (multiple PGs, floors, rooms, a mix of available/taken beds, and one pending PG waiting on admin approval).

   > If PART A of `seed.sql` errors out (some Supabase versions restrict direct `auth.users` inserts), just register the four demo accounts by hand on the **Register** page instead — the emails/roles are listed at the top of `seed.sql` — then re-run PART B, which only needs those accounts to already exist.

### Demo logins (all password: `password123`)

| Role | Email |
|---|---|
| Admin | admin@staysure.app |
| PG Partner (verified, has 2 approved PGs) | partner@staysure.app |
| PG Partner (unverified, has 1 pending PG) | partner2@staysure.app |
| Student (has 1 pending request already) | student@staysure.app |

## 5. Turn off email confirmation (recommended for a hackathon demo)

By default Supabase requires a user to click a confirmation link before they can log in, which gets in the way of a live demo. To let people register and log in immediately:

Dashboard → **Authentication → Providers → Email** → turn off **Confirm email**.

(The seeded demo accounts already have their email pre-confirmed either way.)

## 6. Enable image uploads (optional but recommended)

PG partners can upload PG photos. This needs a public Storage bucket:

1. Dashboard → **Storage → New bucket**
2. Name it exactly `pg-images`, and toggle **Public bucket** on.

If you skip this, everything else still works — partners just won't be able to upload new images (the seeded demo PGs already have stock photos).

## 7. Run it

```bash
npm install
npm run dev
```

Open the printed local URL. Try the full flow:

**Register → Login → role-based redirect → browse PGs → view a PG → choose sharing/AC → pick an available bed → request it → log in as the partner → accept/reject in "Bed Requests" → log back in as the student → see the status update on the dashboard.**

For the admin flows, log in as `admin@staysure.app` to approve the pending PG (`Campus View Ladies PG`) and verify/suspend partners and students.

## 8. Build for production

```bash
npm run build
npm run preview
```

---

## Project structure

```
src/
  components/     Reusable UI: Navbar, PgCard, StatusBadge, ProtectedRoute
  context/        AuthContext — session, profile, sign in/up/out
  lib/            Supabase client
  pages/
    student/      Find PG, PG details + booking flow, student dashboard
    partner/      Partner dashboard, PG CRUD, room/bed management, requests
    admin/        Admin dashboard, users, PG approvals, all requests
  types/          Shared TypeScript types matching the DB schema
supabase/
  schema.sql      Tables, enums, RLS policies, triggers, booking RPC functions
  seed.sql        Demo accounts + realistic Guntur PG data
```

## How the core booking logic works

- Bed status is only ever changed by the `respond_to_request` Postgres function (SECURITY DEFINER), so it happens atomically: on **accept**, the bed flips to `taken`, the request flips to `accepted`, and any other pending requests on that same bed are auto-rejected. On **reject**, the bed stays `available`.
- `create_bed_request` checks the bed is still `available` inside the same transaction before inserting, and a unique index (`one_accepted_request_per_bed`) makes it impossible for two accepted requests to ever exist on one bed, even under concurrent requests.
- Students only ever see `approved` PGs (enforced by RLS, not just the UI) — pending/rejected listings are only visible to their partner and to admins.

## Notes for continuing development

- Admin accounts are never created through the public Register form — see `supabase/seed.sql` PART A, or promote a user manually with `update profiles set role = 'admin' where email = '...';`.
- All frontend Supabase calls use the anon key; every table has RLS enabled, so access control lives in the database, not just the UI.
- The codebase intentionally keeps one component/page per concern so it's easy for a small student team to extend after the hackathon.
=======
# StaySure
>>>>>>> 5a0b7220abe6f52a5f88f1e820540d18a91116a5
