# scripts/

Automação de **desenvolvimento, CI e operações** do core-api — TypeScript (Node 24 +
`--experimental-strip-types`) e bash. **Não** é código de produção (esse vive em `src/`).

> Programas auxiliares **compilados** (ex.: o dead-man's switch em Go) ficam em
> [`../tools/`](../tools/README.md), não aqui. A distinção: `scripts/` = automação **interpretada**
> do projeto (TS/bash); `tools/` = programas **compilados/deployáveis** (Go).

| Subpasta    | Propósito                                                                                                                                             | Comandos pnpm                        |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `ci/`       | Tooling de CI / supply-chain: `test-integration.ts` (orquestrador dos `test:integration:*`) e `only-allow-pnpm.ts` (guard do `preinstall`, ADR-0012). | `test:integration:*`                 |
| `e2e/`      | Smoke E2E da borda HTTP (bash): sobem server real + MySQL e rodam o smoke/Bruno.                                                                      | `test:e2e:*`, `test:integration:all` |
| `setup/`    | Bootstrap do ambiente local: `secrets.ts` gera `secrets/*.txt` para o compose.                                                                        | `secrets:setup`                      |
| `seed/`     | Seeds de dados de domínio.                                                                                                                            | `db:seed:partners`                   |
| `etl/`      | ETL do legado (parsing, reconcile, mappers). Importado por testes via `#scripts/etl/*`.                                                               | `etl:*`                              |
| `pipeline/` | CLI do pipeline fail-first W0→W3.                                                                                                                     | `pipeline:*`                         |
| `data/`     | Geração de datasets (municípios IBGE etc).                                                                                                            | —                                    |

Subpath import: `#scripts/*` → `./scripts/*` (declarado em `package.json#imports`).
