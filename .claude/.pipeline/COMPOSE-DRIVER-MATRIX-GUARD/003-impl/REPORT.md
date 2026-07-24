# W1 — COMPOSE-DRIVER-MATRIX-GUARD — GREEN

Teste-only (nenhum código de produção; o compose já estava correto — mudá-lo seria a regressão).

- `tests/infra/module-driver-matrix-compose.test.ts` — 24 casos, GREEN no compose atual.
- `readFileSync` + regex sobre o texto do `compose.yaml` (molde `integration-matrix-workflow.test.ts`), ZERO dep (ADR-0011), SEM `docker compose config` → roda em `pnpm test` puro, sem skip-guard de Docker.
- Escopa ao bloco `http:` para não casar env de outros serviços. Guard `httpPresent()` se o bloco sumir.
- Tabela de módulos REPLICADA de `MODULE_SPECS`/`REPORTS_SOURCE_SPECS` de propósito: trava o ACOPLAMENTO compose↔guard.
