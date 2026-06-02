# W1 — GREEN — PARTNERS-ETL-READER

**Skill:** nodejs-runtime-expert + docker-compose-expert + mysql2-driver-expert · **Outcome:** GREEN

- `scripts/etl/legacy/decode.ts` — `Record<string,unknown>`→`LegacyXRow` (type predicates, acumula erros; `password` nunca referenciado).
- `compose.etl.yaml` — MySQL 8.4 efêmero: `tmpfs`, localhost-only porta 3309, `--mysql-native-password=ON`, healthcheck TCP, no-new-privileges.
- `scripts/etl/legacy/restore.ts` — `spawn`/`execFile` (nunca shell): up `--wait` + restore por stream (`docker exec -i mysql < dump`, senha via MYSQL_PWD) + `etl_ro` SELECT-only + teardown garantido (`withLegacyMysql` try/finally).
- `scripts/etl/legacy/connect.ts` + `reader.ts` — `mysql2` createConnection SELECT-only + SELECT por entidade + decode (decode-failures → quarentena).
- `scripts/etl/legacy/history-archive.ts` — `collaborator_history` → `.jsonl` cold storage (D11, gitignored).
- `package.json` script `test:integration:etl`; `.gitignore` cobre `scripts/etl/archive/`.

## Verificação end-to-end (Docker vivo)
`pnpm run test:integration:etl` → **1/1 pass (~13s)**: efêmero subiu, dump sintético restaurado, 4 entidades lidas+decodificadas, `password` ausente do decode, history arquivado (2 linhas), container removido no teardown.
