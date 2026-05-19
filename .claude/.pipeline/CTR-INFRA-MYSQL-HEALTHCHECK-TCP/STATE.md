# Estado do Ticket CTR-INFRA-MYSQL-HEALTHCHECK-TCP

> Fix do healthcheck do MySQL no `compose.yaml` para usar TCP (não socket Unix).
> Tech debt herdado do `CTR-CLI-MYSQL-SMOKE` (#7), identificado e corrigido após investigação empírica em 2026-05-16.

## ⚠️ Skills obrigatórias

Qualquer trabalho relacionado a este ticket (revisão, re-trabalho, dúvida) **DEVE** usar:

- 📚 [`database-theorist`](../../skills/database-theorist/SKILL.md)
- 🔧 [`database-engineer`](../../skills/database-engineer/SKILL.md)

## Waves

| Wave | Status | Skill (obrigatória) | REPORT |
| :--- | :--- | :--- | :--- |
| W0 — RED (caracterização) | ✅ completed | `database-theorist` | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — GREEN (fix) | ✅ completed | `database-engineer` | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW | ✅ completed (APPROVED) | `database-engineer` | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ completed | gates + 10 runs `test:integration` | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## Status final

- **Antes**: 5/20 runs failed (25%) em `pnpm test:integration`.
- **Depois**: 0/10 runs failed (0%) em 10 execuções back-to-back.
- typecheck + lint + format: ✅ clean.
- Causa raiz identificada (healthcheck via socket Unix vs cliente TCP do host) e endereçada.

## Artefatos

- `compose.yaml` — healthcheck do MySQL via `--protocol=tcp -h 127.0.0.1`.
- `eslint.config.js` — `tests/reports/**` em `ignores`.
- `tests/reports/CA-3-flakiness-investigation/REPORT.md` — relatório técnico completo (240 linhas, 5 logs de dados).

## Lições para futuros tickets de infra

1. **Healthchecks devem exercitar o caminho do cliente real**. Socket Unix interno ≠ TCP externo.
2. **`compose up --wait` é tão confiável quanto o healthcheck.**
3. **Caracterizar antes de prescrever** — primeira tentativa (retry no driver) foi rejeitada por mascarar 5 hipóteses sem evidência.
