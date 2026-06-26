# Offline-First Sync

## Cached Data

- Active program
- Skill graph
- Current nodes
- Next workout
- Exercise media needed for session

## Persisted Data

- Every set and hold
- Rest timer state
- Video metadata
- Session state
- Overrides
- Pain flags

## Sync Rules

- Client-generated stable IDs
- Deduplication by ID
- Preserve offline timestamps
- Queue video uploads
- Show sync status
- Server timestamp wins for conflicts
- Offline data retained in audit log

## Storage

- Native: AsyncStorage (Zustand persistence)
- Web: localStorage / IndexedDB via AsyncStorage
