# W1 REPORT — CTR-OUTBOX-PUBLIC-API (GREEN)

Status: GREEN - 706 tests, 693 pass, 0 fail, 13 skipped (MySQL integration).
Skill: ts-domain-modeler + modular-monolith. Data: 2026-05-21.

Files created:
- src/modules/contracts/public-api/events.ts
- src/modules/contracts/public-api/index.ts

Files updated:
- tests/modules/contracts/public-api/events.test.ts (fixture UUID v4 fix)
- CLAUDE.md (public-api/ in layer map + anti-pattern #13)

Design decisions:
1. CONTRACTS_SCHEMA_VERSION=1 as const — type narrows to literal 1.
2. KNOWN_EVENT_TYPES ReadonlySet<string> — O(1) guard, closed set, exhaustive.
3. decodeContractsModuleEventV1 delegates entirely to outboxRowToEvent — no duplication of mapper logic.
4. OutboxRow re-exported from public-api — consumers never need to import from adapters/
5. Import path: ../../../shared/result.ts (depth 3 from src/modules/contracts/public-api/)
6. No import cycle: public-api -> adapters/mappers; adapters/mappers -> domain (no reverse).
