# Estado do Ticket CTR-DB-SCHEMA-MYSQL-CTR-PREFIX

> Schema MySQL — prefixo `ctr_*`, índices F-H2/F-M2 e CHECKs F-L1/F-L2.
> Segundo ticket da sequência derivada de [ADR-0020](../../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md).

| Wave | Status | Skill / Framework | REPORT |
| :--- | :--- | :--- | :--- |
| W0 — RED | ✅ completed (2026-05-15) | `node:test` + `drizzle-orm/mysql-core` `getTableConfig` | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — GREEN | ✅ completed (2026-05-15) | `database-engineer` (refactor com citação) | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW | ✅ completed (2026-05-15, APPROVED) | `maestro:code-reviewer` (round 1, 0 Critical, 0 Important, 4 Suggestions) | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ completed (2026-05-15) | `ts-quality-checker` + polish da Suggestion #3 | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## ✅ TICKET FECHADO

- **2 arquivos** modificados (schema + test), **zero dep nova**
- **14/14 CAs verdes** + **408/408 testes antigos verdes** = **422/422** (zero regressão)
- **4 gates de qualidade verdes** (tsc, prettier, eslint, test)
- **W2 review APPROVED** com 0 Critical/0 Important + 4 Suggestions (1 aplicada, 3 deferidas para tickets futuros)
- **7 decisões D1-D7 aplicadas** com citação ancorando cada uma (ADR-0020, ADR-0018, audit findings, Ramakrishnan, MySQL Refman)
- **Polish Suggestion #3 (trade-off F-L1)** aplicado em `mysql.ts:69-73`

## Suggestions deferidas

| # | Sugestão | Destino |
| :--- | :--- | :--- |
| S-1 | CA-6/CA-7 deveriam assertar substring do SQL | `CTR-DB-MIGRATION-MYSQL` (#3) — quando migration real for gerada, validamos SQL emitido |
| S-2 | `mysql.ts:54` cita ADR-0018 (superseded) | `CTR-DOCS-UPDATE-FOR-ADR-0020` (#8) — varredura geral |
| S-3 | Trade-off F-L1 não documentado | ✅ **Resolvido neste W3** |
| S-4 | Falta CHECK `value_cents >= 0` | Novo ticket `CTR-DB-DOMAIN-INVARIANTS` |

## Próximo ticket

`CTR-DB-MIGRATION-MYSQL` (#3 da sequência ADR-0020):
- `drizzle.config.ts` apontando MySQL + `pnpm db:generate:mysql`
- Primeira migration MySQL gerada
- Smoke test: aplicar migration contra MySQL real do compose (oportunidade de absorver S-1 do W2)
