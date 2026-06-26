# Workout State Machine

## States

- `idle` — no active workout
- `active` — workout in progress
- `completed` — workout finished, pending sync

## Transitions

1. User starts workout → `active`
2. User logs set → store in Zustand + AsyncStorage
3. Rest timer starts automatically
4. User finishes exercise / next exercise → advance index
5. User finishes workout → `completed`
6. Online sync → push pending sets to Supabase

## Offline-First

- Client-generated stable IDs prevent duplicates
- All data persisted locally before sync
- Sync status displayed on dashboard
- Conflict resolution: server timestamp wins, offline data retained in audit
