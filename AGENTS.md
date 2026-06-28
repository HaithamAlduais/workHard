# Agent Notes

## Supabase local development

- Use `npx supabase start` / `npx supabase stop` from the repo root.
- If the default ports are occupied by another Supabase project, change them in `supabase/config.toml` (e.g. `db.port = 54332`).
- Migration files must have ordered unique timestamps (e.g. `20240626000001_*.sql`). Underscore-only prefixes such as `20240626_*.sql` will collide on the `schema_migrations_pkey` index.
- `supabase/seed/seed.sql` is re-applied on every `npx supabase db reset --local`. Make sure `NOT NULL` columns (like `program_exercises.order_index`) have values for every inserted row.
- The local API URL is `http://127.0.0.1:54321` by default. Copy `apps/mobile/.env.local.example` to `apps/mobile/.env.local` and paste the keys from `npx supabase status`. `.env.local` is gitignored.

## Backend validation

- Run `npm run validate:backend` (or `cd apps/mobile && npm run validate:backend`).
- `apps/mobile/scripts/validate-backend-roundtrip.mjs` creates a fresh test user, signs in, and writes/reads profiles, equipment, workout sessions, session exercises, set logs, progression decisions, skill attempts, exercise prescriptions, skill prescriptions, and graduation contracts. It cleans up test records when `SUPABASE_SERVICE_ROLE_KEY` is provided.
- RLS policies require grants for the `authenticated` role. Add new tables to `supabase/migrations/20240626000004_grants.sql` (or a later migration) and run `npx supabase db reset --local`.

## Domain / mobile workflow

- `packages/domain` builds to `dist/`. Run `npm run build` there after adding new exports so `apps/mobile` typechecks against the published package output.
- `npm run typecheck` and `npm run test` at the repo root cover both workspaces.
- `npm run validate:backend` requires the local Supabase stack to be running.
