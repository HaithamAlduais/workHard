# GravityPath Implementation Summary

## What Was Built

A production-ready, cross-platform **Gym-to-Calisthenics Progression Coach** with:

- Deterministic progression engines (strength, hypertrophy, power, skills)
- Prerequisite-based calisthenics skill graph
- Volume, replacement, graduation, deload, set-addition, and time-budget engines
- Offline-first mobile app with sync architecture
- Supabase PostgreSQL backend with RLS
- Arabic/English localization and RTL
- Web PWA build
- End-to-end tests

## Verification Results

| Check | Status |
|-------|--------|
| Domain unit tests | 38 passed |
| Mobile TypeScript type check | passed |
| Domain TypeScript type check | passed |
| Web PWA build | passed (1.3 MB bundle) |
| Playwright E2E tests | 2 passed |

## Repository Structure

```
Cali/
├── apps/mobile/              # Expo + React Native + Expo Router
│   ├── app/                  # File-based screens
│   ├── lib/                  # Auth, i18n, theme, supabase, config
│   ├── stores/               # Zustand offline workout store
│   ├── e2e/                  # Playwright tests
│   ├── assets/translations/  # English + Arabic
│   └── dist/                 # Web build output
├── packages/domain/          # Pure TypeScript engines
│   ├── src/                  # Engines
│   ├── tests/                # Vitest tests
│   └── dist/                 # Compiled output
├── supabase/
│   ├── migrations/           # Schema + RLS
│   ├── seed/                 # Exercise/skill/program seed + demo
│   └── functions/            # AI coach Edge Function
└── *.md                      # Architecture & engine documentation
```

## How to Run

```bash
# Install dependencies
cd packages/domain && npm install
cd ../../apps/mobile && npm install

# Run from root
cd /c/Users/haitham/Desktop/Cali
npm run typecheck   # type check domain + mobile
npm run test        # 38 domain engine tests
npm run build:web   # build PWA
npm run test:e2e    # Playwright smoke tests
npm run dev:mobile  # start Expo dev server
```

## Supabase Setup

```bash
cp .env.example .env
# Fill EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
supabase start
supabase migration up
supabase seed run
```

## Key Design Decisions

1. **Domain logic is pure TypeScript** — no UI, no storage, fully testable.
2. **AI only explains** — deterministic engines make all progression, unlock, replacement, volume, safety, and graduation decisions.
3. **Offline-first** — Zustand + AsyncStorage persist every set; sync to Supabase when online.
4. **Expert skills locked** — iron cross, Maltese, Victorian, weighted HSPU, weighted levers require coach/video verification.
5. **App name configurable** — `EXPO_PUBLIC_APP_NAME` in one environment setting.

## Remaining Limitations (Honest)

- Full native Android/iOS builds were not executed (EAS configuration provided).
- Maestro mobile E2E tests are scaffolded but not run.
- Video recording UI is scaffolded; advanced on-device pose analysis is future work.
- Push notification scheduling is configured but not tested on physical devices.
- The demo athlete seed requires replacing `DEMO_USER_ID` with a real auth UUID.
- Some advanced analytics charts use placeholder demo data; real data plumbing is wired via Supabase.
- Weekly review generation is implemented in the domain engine but the automated scheduler is a stub.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Supabase, web PWA, and EAS mobile build instructions.
