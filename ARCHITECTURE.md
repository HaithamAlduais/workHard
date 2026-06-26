# GravityPath Architecture

## Overview

GravityPath is a monorepo with a shared deterministic domain package and a cross-platform mobile/web frontend.

## Layers

### 1. Domain Package (`packages/domain`)

Pure TypeScript functions. No UI, no storage, no side effects.

- `strength/progression.ts` — add reps, add load, reduce load, hold for safety
- `skills/progression.ts` — static/dynamic skill decisions, quality-drop stop rule
- `skills/unlock.ts` — prerequisite graph evaluation
- `volume/engine.ts` — direct sets, technique sets, static exposure, weighted math
- `replacement/engine.ts` — gym-to-calisthenics replacement percentages
- `graduation/engine.ts` — contract evaluation and four-week transition
- `time-budget/engine.ts` — tier-based session trimming
- `deload/engine.ts` — deload triggers and parameters
- `set-addition/engine.ts` — conservative set-addition rules

### 2. Mobile App (`apps/mobile`)

- Expo Router file-based routing
- Zustand for local state and offline persistence
- AsyncStorage for offline-first workout data
- Supabase client for auth and sync
- React Hook Form + Zod for forms
- Theme and i18n contexts

### 3. Backend (`supabase`)

- PostgreSQL with Row Level Security
- Auth triggers create profiles
- Edge Functions for AI coach proxy (optional)
- Storage for videos

## Data Flow

1. User completes set offline
2. Zustand persists to AsyncStorage
3. When online, app pushes pending sets to Supabase
4. Server runs deterministic engines or calls Edge Function
5. Next workout targets computed from actual data

## Key Constraints

- Domain logic never lives in UI components
- AI only explains deterministic decisions; never overrides engines
- RLS protects all private user data
- Expert skills require coach/video verification
