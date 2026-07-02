# W0 — testes RED (ETL-CONTRACTS-WRITER)

tests/etl/contracts/mapper.test.ts: 18 casos cobrindo normalização Pacote A (inclui
Overflow >9999 e seq zero), plano Active (VOs, signedAt=periodStart, Money round,
remaps supplier/program, budgetPlan→artefato), plano Terminated (endedAt=updatedAt),
allowlist→ExcludedByDecision, quarentenas de remap/valor/status/contractor, e
mapper de programas. RED por inexistência do módulo scripts/etl/contracts/mapper.ts
(ERR_MODULE_NOT_FOUND) — fail-first conforme pipeline.
