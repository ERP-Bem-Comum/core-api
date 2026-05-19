# Estado do Ticket CTR-DB-DRIVER-POOL-TUNING

> Driver tuning: `idleTimeout` (H3) + `timezone:'Z'` (M2) + `applyMigrations` default-false (M5).
> Origem: audit `handbook/reviews/0002-...` §H3, §M2, §M5.
> Orquestração: `.claude/skills/pipeline-maestro/SKILL.md` (W0→W3).

## ⚠️ Skills obrigatórias

- 🔧 [`database-engineer`](../../skills/database-engineer/SKILL.md)
- 📚 [`database-theorist`](../../skills/database-theorist/SKILL.md)
- 🚦 [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md)

## Waves

| Wave | Status | Skill | REPORT |
| :--- | :--- | :--- | :--- |
| W0 — RED (CA-9/10 estruturais + CA-11/12 integration opt-in) | ✅ completed | database-engineer | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — GREEN (extrair `buildPoolOptions`, aplicar tunings) | ✅ completed | database-engineer | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW read-only | ✅ completed (APPROVED) | code-reviewer | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY gate | ✅ completed | ts-quality-checker | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## Status final

- 2026-05-18: ticket aberto e concluído na mesma sessão de `CTR-DB-MAPPER-NO-THROW`.
- **H3 endereçado**: `idleTimeout: 270_000` ms + `idleTimeoutMs?: number` opcional.
- **M2 endereçado**: `timezone: 'Z'` no pool.
- **M5 endereçado**: default `applyMigrations === true` invertido para `=== true` (omitido = false).
- **Refactor**: função pura `buildPoolOptions` extraída e exportada (testabilidade sem Docker).
- **Testes**: +5 CAs estruturais verdes + 2 CAs integration registrados (opt-in).
- Gates W3: typecheck ✅ · format:check ✅ · test 438/0/13 ✅ · lint ✅ (bonus).

## Próximo ticket do audit `0002` §3

`CTR-DB-REPO-LIST-N1` — H1 (N+1 em `listContracts.list`) + M4 (junction insert em batch). Tamanho M.
