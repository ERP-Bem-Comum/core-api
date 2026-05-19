# Estado do Ticket CTR-DB-COMPOSE-MYSQL

> MySQL 8.4 via Docker Compose — config production-grade.
> Primeiro ticket da sequência derivada de [ADR-0020](../../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md).

| Wave | Status | Skill / Framework | REPORT |
| :--- | :--- | :--- | :--- |
| W0 — RED | ✅ completed (2026-05-15) | `node:test` nativo + `child_process` | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — GREEN | ✅ completed (2026-05-15) | manual (infra) | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW | ✅ completed (2026-05-15, APPROVED with non-blocking findings) | `code-reviewer` (auto-review com conflito de interesse declarado) | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ completed (2026-05-15) | `pnpm test` + `nodejs-fs-scripter` + bash measurements | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## ✅ TICKET FECHADO

- **11 arquivos** entregues (8 novos + 3 atualizados), zero dep nova
- **406/406 testes verdes** (20 CAs novos + 386 antigos, zero regressão)
- **4 gates de qualidade verdes** (typecheck, format, lint, test)
- **Bugs MySQL 8.4 descobertos e corrigidos** (`default-authentication-plugin` e `--skip-host-cache` removidos em 8.4)
- **Findings do W2 fechados:** I-1 (digest pin) ✅, I-3 (TTY-aware) ✅ via conversão setup-secrets.ts
- **Bônus W3:** conversão `setup-secrets.sh` → `setup-secrets.ts` via skill `nodejs-fs-scripter` (writeAtomic, Result-like, sem `any`, sem `throw` fora do `main`)

## Medições operacionais

- Tempo até `healthy` (cold start): **11s** (limite healthcheck: 90s — folga 8×)
- RAM idle: 435 MiB
- Tamanho do volume após bootstrap: 221.3 MB
- Versão MySQL ativa: `8.4.9` (image pinada por digest `sha256:c36050af...`)

## Pendências adiadas (ticket futuro `CTR-COMPOSE-POLISH`)

- I-2 (MinIO ainda usa env var com default — sem `secrets:`)
- S-1 (heredoc bash + aspa simples em senha)
- S-2 (nota de versão mínima Compose 2.24+ em `compose.ci.yaml`)
- S-3 (magic numbers em `tests/infra/mysql-compose.test.ts`)
- S-4 (slow query log misturado com datadir)

## Próximo ticket

`CTR-DB-SCHEMA-MYSQL-CTR-PREFIX` — `schemas/mysql.ts` com prefixo `ctr_*`, charset/collation explícito por tabela, índices F-H2/F-M2 e CHECKs F-L1/F-L2.
