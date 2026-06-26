# Skill Graph

GravityPath models calisthenics skills as a directed acyclic graph.

## Edge Types

- `PREREQUISITE` — must be unlocked before target node is available
- `ALTERNATIVE_PREREQUISITE` — alternate path satisfies requirement
- `PROGRESSION` — next difficulty level
- `REGRESSION` — easier fallback
- `TRANSFER` — strength transfer between families
- `REPLACEMENT` — can replace gym exercise
- `MAINTENANCE` — maintain without hard progression
- `CONTRAINDICATED_WITH` — warn about conflicting priorities
- `HIGH_FATIGUE_OVERLAP` — avoid simultaneous high volume

## Node Fields

- `difficulty`: fundamental → beginner → intermediate → advanced → expert
- `staticOrDynamic`: static hold vs dynamic reps
- `bentOrStraightArm`: arm classification
- `riskLevel`: low, medium, high, expert
- `unlockRule`: exposures, quality, video/coach requirements
- `volumeRule`: how the node contributes to volume

## Expert Locking

Nodes with `expertLocked: true` require:
- Coach verification, OR
- Verified video approval

The application never auto-assigns expert nodes to beginners.
