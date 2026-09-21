# EduPulse ERP — Setup Guide

This project has two parts:
- `/` — React + Vite frontend (runs on http://localhost:8080)
- `/school-erp-backend` — Node.js + Express + Prisma backend (runs on http://localhost:5001), using **PostgreSQL**

## What changed in this update

- **Fixed the core bug**: the "New Student" form called `GET /api/classes` to look up
  class/section IDs, but that route did not exist on the backend at all. It has been
  added (`school-erp-backend/src/modules/classes`). This is why admissions were failing
  or saving mismatched class/section data.
- Fixed the Class dropdown offering "KG" when the database only ever seeds "LKG"/"UKG"
  (mismatch meant that option could never be submitted successfully).
- Added the full admission field set to the New Student form and backend:
  Roll Number, First/Middle/Last Name, Gender, Date of Birth, Blood Group, Category
  (General/OBC/SC/ST/EWS), Religion, Nationality, Aadhaar (optional), Passport Number
  (optional), Student Mobile (optional), Email, and Profile Photo (JPG/PNG, max 2MB).
- Admission Number is now **auto-generated** server-side (format `ADM-2026-0001`) and is
  no longer a manually-typed field.
- Added validation: DOB cannot be in the future, Aadhaar must be exactly 12 digits,
  roll number must be unique **within a class**, email must be valid, photo must be
  JPG/PNG under 2MB.
- Classes Nursery → 12 (Nursery, LKG, UKG, 1st–12th Grade) with sections A/B/C/D were
  already seeded in `prisma/seed.ts` — no change needed there.
- Fixed 6 pre-existing TypeScript compile errors on the frontend and several on the
  backend (implicit `any`s, an orphaned unused SSR entry file referencing a package
  that isn't even installed, a type mismatch on the dashboard's fee query).
- `guardianName`/`guardianMobile` were required in the database but marked optional in
  validation — fixed so the two now agree (a mismatch that could cause silent insert
  failures).

## 1. Install PostgreSQL

Install PostgreSQL locally (or use Docker):

```bash
docker run --name school-erp-postgres -e POSTGRES_PASSWORD=12345 -e POSTGRES_DB=school_erp -p 5432:5432 -d postgres:16
```

Or install PostgreSQL natively and create a database:

```sql
CREATE DATABASE school_erp;
```

## 2. Configure the backend

```bash
cd school-erp-backend
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL` to match your Postgres instance, e.g.:

```
DATABASE_URL="postgresql://postgres:12345@localhost:5432/school_erp"
```

## 3. Install dependencies, migrate, and seed

```bash
cd school-erp-backend
npm install
npx prisma generate
npx prisma migrate deploy   # applies all migrations, including the new admission fields
npx prisma db seed          # creates the demo tenant, admin user, and Nursery–12 classes/sections
```

Login after seeding:
- Email: `admin@school.edu`
- Password: `Admin@123`

## 4. Run the backend

```bash
npm run dev
```

Backend runs on `http://localhost:5001`, API base `http://localhost:5001/api`.
Uploaded student photos are served from `http://localhost:5001/uploads/students/...`.

## 5. Run the frontend

In a separate terminal, from the project root:

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:8080`.

## Notes

- `node_modules` was intentionally excluded from this zip to keep it small — run
  `npm install` in both the root and `school-erp-backend` folders.
- If you already have an existing database from before this update, `prisma migrate
  deploy` includes a migration that safely backfills any existing rows before
  tightening constraints (e.g. filling blank emails with a placeholder before making
  the column required) — no manual data cleanup should be needed.
