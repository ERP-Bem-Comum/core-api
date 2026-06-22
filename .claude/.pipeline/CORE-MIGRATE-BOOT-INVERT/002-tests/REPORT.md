# W0 — Testes RED — CORE-MIGRATE-BOOT-INVERT (Slice B)

**Skill:** `tdd-strategist`. **Resultado:** RED (11 fail / 1 pass).

## Arquivos

- **Novo:** `tests/infra/migrate-boot-inversion.test.ts` — CA-B1 (5 compositions=false), CA-B2/B2b
  (http depends_on migrate completed + migrate no profile app), CA-B3 (4 e2e migram antes do server),
  CA-B4 (default só-infra).
- **Editado:** `tests/infra/migrate-compose.test.ts` — removido o guard CA9 do Slice A (afirmava
  `applyMigrations: true`; o Slice B inverte esse invariante).

## Status RED

- CA-B1 ✖ (5) — compositions ainda `true`.
- CA-B2/B2b ✖ — compose sem `http.depends_on.migrate`; migrate ainda não no profile app.
- CA-B3 ✖ (4) — e2e ainda não invocam o migrate.
- CA-B4 ✔ — guard de não-regressão (default só-infra) já verde.
