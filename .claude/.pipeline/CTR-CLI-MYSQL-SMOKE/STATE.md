# Estado do Ticket CTR-CLI-MYSQL-SMOKE

> Smoke E2E completo da CLI da P.O. rodando contra MySQL real (driver mysql wired).
> Sétimo ticket da sequência derivada de [ADR-0020](../../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md).

| Wave | Status | Skill / Framework | REPORT |
| :--- | :--- | :--- | :--- |
| W0 — RED | ✅ completed | `pipeline-maestro` + `node:test` | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — GREEN | ✅ completed | `application-cli-builder` | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW | ✅ completed (APPROVED) | self-review (padrão #4/#5) | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ completed | gates + `pnpm test:integration` | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## Status final

**Ticket pronto para commit.**

- Smoke 10/10 GREEN em 13.8s.
- Suite integration completa: 57/57 (10 novos + 47 pré-existentes).
- Suite default: 422 pass / 0 fail / 11 skipped.
- typecheck + lint + format: ✅.
- Cobertura completa da pirâmide MySQL: migration → driver → repo → CLI E2E.

## Próximo ticket

**`CTR-DOCS-UPDATE-FOR-ADR-0020` (#8)** — varredura final de docs/SKILLs para refletir o estado pós-ADR-0020 (sem SQLite). Último da sequência.

## Notas

- Reuso de `tests/cli/helpers/run-cli.ts` — sem inventar harness novo.
- Conexão via `127.0.0.1:3306` (porta exposta pelo compose); senha `apppw-migration-test-only` é o secret dev fixo do `test:integration` script.
- Smoke roda do host (`node` direto), não do container app. Compose `--profile app` é validado indiretamente pela mesma sequência.
- Cobertura: 6 subcomandos (`criar-contrato`, `listar-contratos`, `mostrar-contrato`, `criar-aditivo`, `anexar-documento`, `homologar-aditivo`) + fluxo de aditivo Addition completo + persistência cross-invocation + invariantes UNIQUE/RN-12.
