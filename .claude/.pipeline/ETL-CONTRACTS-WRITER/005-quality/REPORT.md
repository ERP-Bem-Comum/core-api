# W3 — Quality gate (ETL-CONTRACTS-WRITER)

- typecheck: PASS · format:check: PASS · lint: PASS
- pnpm test: 3378 tests, 3360 pass, 0 fail (18 skip = integração gated, correto)
- Integração gated executada na VM do lab: readers 2/2 (serializados) +
  writer full-cycle 2/2 (contra DB isolado core_it, incl. idempotência 2×)
- Dry-run com dump REAL: programs 2/2, contracts 39=38+1 (ExcludedByDecision),
  seq plan {2025:2, 2026:38}
