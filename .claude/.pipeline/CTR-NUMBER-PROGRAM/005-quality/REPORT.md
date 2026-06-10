# 005 — W3 (quality gate) — CTR-NUMBER-PROGRAM

**Resultado: GREEN** — todos os 4 gates verdes.

| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | ✓ sem erros |
| Format | `pnpm run format:check` (`prettier --check .`) | ✓ All matched files use Prettier code style |
| Lint | `pnpm run lint` (`eslint .`) | ✓ exit 0, 0 problemas |
| Test | `pnpm test` (`node --test`) | ✓ 2571 tests · **2554 pass · 0 fail** · 17 skip |

## Notas
- Suíte subiu de 2562 → 2571 (9 testes novos da borda program: DTO + CSV + rotas).
- Correções de regressão aplicadas no W1 (lint pré-existente + testes W0) — ver `003-impl/REPORT.md`.
- Integração programs+contracts em mysql não exercitada aqui (driver memory + port fake cobrem o
  contrato da borda); a abertura real do `ProgramReadPort` via `PROGRAMS_DATABASE_URL` é wiring de
  `server.ts` validável no E2E (Bruno / test:integration).
