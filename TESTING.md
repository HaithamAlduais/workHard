# Testing

## Unit Tests

Domain engine tests are in `packages/domain/tests/` using Vitest.

```bash
cd packages/domain
npm test
```

Covered:
- Strength add-rep, add-load, reduction, safety rules
- Hypertrophy double progression
- Power quality stop rule
- Static and dynamic skill progression
- Skill unlock, regression, expert locking
- Pain blocking unlock
- Volume classification (technique, static, painful sets)
- Weighted calisthenics math
- Replacement percentages and blocking conditions
- Graduation contract completion
- Movement-pattern blocking
- Four-week transition generation
- Time-budget tier trimming
- Deload triggers
- Set-addition restrictions

## End-to-End Tests

E2E tests are scaffolded with Playwright for web and Maestro for mobile.

```bash
cd apps/mobile
npm run e2e:web    # Playwright
npm run e2e:mobile # Maestro
```

## Type Checking

```bash
cd packages/domain && npm run typecheck
cd ../../apps/mobile && npm run typecheck
```

## Build Verification

```bash
cd apps/mobile
npm run build:web
```
