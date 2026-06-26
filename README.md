# GravityPath — Gym-to-Calisthenics Progression Coach

A production-ready cross-platform application that guides users from a gym-supported strength program into fully independent weighted-calisthenics training.

## Quick Start

```bash
# Install dependencies
cd packages/domain && npm install
cd ../../apps/mobile && npm install

# Run unit tests
cd packages/domain && npm test

# Start mobile app
cd apps/mobile && npm start

# Build web PWA
cd apps/mobile && npm run build:web
```

## Supabase Setup

1. Install Supabase CLI
2. Copy `.env.example` to `.env` and fill values
3. Run migrations:

```bash
supabase start
supabase migration up
supabase seed run
```

## Project Structure

```
Cali/
├── apps/mobile/          # Expo + React Native + Expo Router app
├── packages/domain/      # Deterministic progression engines (pure TypeScript)
├── supabase/
│   ├── migrations/       # PostgreSQL schema + RLS
│   └── seed/             # Exercise library, skill graph, programs
└── docs/                 # Architecture and engine docs
```

## Key Features Implemented

- Deterministic strength, hypertrophy, power, and skill progression engines
- Prerequisite-based calisthenics skill graph
- Volume, replacement, graduation, deload, set-addition, and time-budget engines
- Offline-first workout logging with Zustand + AsyncStorage
- Arabic and English localization with RTL support
- Dark/light theme
- Active workout state machine with rest timer
- Skill tree, journey, analytics, and AI coach screens
- Supabase auth, PostgreSQL schema, RLS policies
- Web PWA build

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATABASE.md](./DATABASE.md)
- [PROGRESSION_ENGINE.md](./PROGRESSION_ENGINE.md)
- [SKILL_GRAPH.md](./SKILL_GRAPH.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [TESTING.md](./TESTING.md)
