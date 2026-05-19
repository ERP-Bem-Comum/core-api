# Estado do Ticket CTR-DB-REPO-LIST-N1

> H1 (N+1 em `list()`) + M4 (junction insert linha-a-linha) — drizzle MySQL repo.
> Origem: audit `handbook/reviews/0002-...` §H1 + §M4.
> Orquestração: `.claude/skills/pipeline-maestro/SKILL.md` (W0→W3).

## ⚠️ Skills obrigatórias

- 🔧 [`database-engineer`](../../skills/database-engineer/SKILL.md)
- 📚 [`database-theorist`](../../skills/database-theorist/SKILL.md)
- 🚦 [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md)

## Waves

| Wave | Status | Skill | REPORT |
| :--- | :--- | :--- | :--- |
| W0 — RED (regression guards estruturais) | ✅ completed | database-engineer | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — GREEN (inArray + values batch) | ✅ completed | database-engineer | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW | ✅ completed (APPROVED) | code-reviewer | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ completed | ts-quality-checker | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## Status final

- 2026-05-18: ticket aberto e concluído na mesma sessão dos 2 anteriores (CTR-DB-MAPPER-NO-THROW + CTR-DB-DRIVER-POOL-TUNING).
- **H1 endereçado**: `list()` 1+N → 1+1 (SELECT + `inArray` + Map agrupador).
- **M4 endereçado**: junction insert em `values([...])` batch único.
- Testes: +3 regression guards (CA-13.1/13.2/14). Suite contratual inalterada e verde.
- Impacto: `list()` 1.000 contratos = 2 queries (era 1.001); `persistContract` 50 aditivos = 2 stmts (era 51).
- Gates W3: typecheck ✅ · format:check ✅ · test 441/0/13 ✅ · lint ✅.

## Próximo ticket do audit `0002` §3

`CTR-DB-SCHEMA-HARDENING` — M1 + M3 + M6 + L2 (charset/collate por tabela, SELECT FOR UPDATE no upsert, limpeza de comentário SQLite, nome de FK longo). Tamanho M — schema + migration nova.
