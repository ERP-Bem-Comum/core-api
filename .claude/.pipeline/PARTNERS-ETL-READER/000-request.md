# PARTNERS-ETL-READER — Leitura do legado (decode + MySQL efêmero + reader)

> **Size:** M · **Slice 2/5** de [`PARTNERS-ETL-BOOTSTRAP`](../PARTNERS-ETL-BOOTSTRAP/000-request.md). Skills: `nodejs-process-runner`, `nodejs-fs-scripter`, `mysql2-driver-expert`, `docker-compose-expert`.

## Contexto

Restaura o dump num **MySQL 8.4 efêmero** e lê via `SELECT` com `mysql2`, decodificando cada linha para os tipos `LegacyXRow` do CORE. O dump de PRODUÇÃO só é consumido na migração real (orquestrador, slice WRITER); **os testes usam um dump sintético** (fixture fake, sem PII).

## Escopo (`scripts/etl/legacy/`)

1. **`decode.ts`** (PURO) — `Record<string, unknown>` (linha mysql2) → `Result<LegacyXRow, QuarantineReason[]>` via type predicates por campo: string/nullable-string/number/boolean(tinyint)/Date. Zero-date `0000-00-00` → `DateInvalid`. `decimal` como string. **`password` nunca decodificado** (D6).
2. **`compose.etl.yaml`** — service `mysql-legacy`: MySQL 8.4, `tmpfs` em `/var/lib/mysql`, network `internal:true`, **sem `ports`**, healthcheck TCP, credenciais descartáveis. Dump montado `:ro` por env var `LEGACY_DUMP_PATH`.
3. **`restore.ts`** — `spawn`/`execFile` (`node:child_process`, nunca shell): `docker compose -f compose.etl.yaml up --wait` + restore via `docker exec mysql-legacy mysql < dump` (stream). Exit code → `Result`. Teardown (`down -v`) garantido.
4. **`reader.ts`** — `mysql2` `createConnection` (GRANT SELECT-only, `multipleStatements:false`, `timezone` do legado, `decimalNumbers:false`), `SELECT` por entidade → `decode` → `LegacyXRow[]`. `pool.end`/`connection.end` em `finally`.
5. **`history-archive.ts`** — exporta `collaborator_history` (273) → `scripts/etl/archive/collaborator_history.jsonl` (cold storage D11, fora do git via `.gitignore`).

## Fora de escopo

- Writer idempotente + orquestrador + map `legacyId→UUID` + `auth.User` (WRITER). Tokens de reset (RESET-*).

## Critérios de aceite

- [ ] `decode` válido → `LegacyXRow`; tipo errado/zero-date → quarentena (`DateInvalid`/estrutural).
- [ ] `password` jamais decodificado.
- [ ] Restore do **dump sintético** num MySQL efêmero + reader devolve as linhas decodificadas (teste de integração gated `PARTNERS_ETL_INTEGRATION=1`).
- [ ] Efêmero descartável: `tmpfs` + `down -v`; sem `ports` (coexiste com stack de dev); teardown em falha.
- [ ] `collaborator_history` exportado para `.jsonl` (cold storage, `.gitignore`).
- [ ] W3 verde: typecheck + lint + format + testes unitários do `decode` (sem Docker).

## Notas de disciplina

- **Dump de produção NUNCA nos testes** — fixture sintético `tests/etl/fixtures/legacy-mini.sql` (dados fake). Dump real só no orquestrador.
- Efêmero: rede isolada, sem portas, `tmpfs`, credenciais geradas e descartadas. PII nunca persiste nem vaza em log.
