# Estado do Ticket CTR-DOCS-UPDATE-FOR-ADR-0020

> Varredura final de docs (CLAUDE.md, SKILLs, handbook) para o estado pós-ADR-0020.
> Oitavo e ÚLTIMO ticket da sequência derivada de [ADR-0020](../../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md).

| Wave | Status | Skill / Framework | REPORT |
| :--- | :--- | :--- | :--- |
| W0 — RED | ✅ completed | `pipeline-maestro` + `node:test` (assertions estruturais) | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — GREEN | ✅ completed | edição direta (prose) | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW | ✅ completed (APPROVED) | self-review (padrão #4-#7) | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ completed | `pnpm test` + `pnpm test:integration` | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## 🎉 Status final — sequência ADR-0020 ENCERRADA

- docs-update tests: 11/11 GREEN.
- Suite default: 444 / 433 pass / 0 fail / 11 skipped.
- Suite integration: 57/57 pass.
- typecheck + lint + format: ✅.
- 11 arquivos editados (CLAUDE.md, 2 handbook, 7 SKILLs, 1 test).
- ADR-0018 preservado como evidência histórica.
- ADR-0020 é a fonte vigente.

Módulo Contratos do `core-api` está **100% MySQL** em código, infra, tests e docs.

## Notas

- **Distinção crítica**: refs OPERACIONAIS (atualizar) vs HISTÓRICAS (preservar como evidência).
- Sem rename de arquivos — só edit de conteúdo.
- `database-theorist` mantém comparações teóricas (One-Size-Fits-All vs Polyglot etc); só atualiza paths que não existem mais.
- `ADR-0018` não toca (banner já tem); `CHANGELOG.md` não toca (entry de 2026-05-15 já correta); `adr/README.md` não toca (já mostra `Superseded by 0020`).
