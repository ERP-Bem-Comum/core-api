# W0 REPORT — CTR-OUTBOX-PUBLIC-API (RED)

Status: RED confirmed. Skill: tdd-strategist. Data: 2026-05-21.

File: tests/modules/contracts/public-api/events.test.ts (8 scenarios CA-T1..T8 + case constructors).

Runner output: ERR_MODULE_NOT_FOUND for public-api/events.ts. pass 0 / fail 1.

CA-T1: CONTRACTS_SCHEMA_VERSION===1. CA-T2: isContractsModuleEvent valid types. CA-T3: unknown type. CA-T4: null/primitive/no-type. CA-T5: valid row decode ok. CA-T6: version mismatch err. CA-T7: corrupt payload err. CA-T8: compile-time smoke.
