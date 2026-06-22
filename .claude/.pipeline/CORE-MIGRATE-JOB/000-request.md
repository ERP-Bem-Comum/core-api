# CORE-MIGRATE-JOB — Slice A (aditivo)

> **Contexto:** Fase 5 da reorganização da raiz (ver memória `repo-structure-cleanup-fases`).
> Hoje cada módulo migra o schema **no boot do servidor HTTP** (`adapters/http/composition.ts`
> com `applyMigrations: true`). Isso causa race em deploy multi-instância — o próprio driver já
> antecipa o problema no comentário "M5" (`applyMigrations` default `false`, prod-safe). A Fase 5
> move a migração para um **job `migrate` one-shot dedicado**, rodado antes de http/workers.

## Decisão de fatiamento (Gabriel, 2026-06-22)

Fatiar em dois slices. **Este ticket entrega só o Slice A** (aditivo/reversível):

- **Slice A (aqui):** introduz o job `migrate` + a porta de migração por módulo + o service no
  compose. **NÃO** mexe nas compositions HTTP — o boot continua migrando (redundante, mas
  idempotente via journal do drizzle-kit). Zero risco de quebrar o boot/E2E existente.
- **Slice B (ticket próprio, depois):** inverte o boot — 5 compositions HTTP → `applyMigrations:false`,
  ajusta os 4 scripts `e2e-*.sh` para rodar o migrate antes, e amarra `http`/workers via
  `depends_on: migrate (service_completed_successfully)`. Alto risco; exige validação no Docker real.

## Escopo do Slice A

Módulos com migrations (6): `auth`, `contracts`, `financial`, `notifications`, `partners`, `programs`.

1. **Porta pública de migração por módulo** — `src/modules/<m>/public-api/migrate.ts`:
   exporta `applyMigrations(connectionString): Promise<Result<true, <M>MysqlDriverError>>`,
   reusando o `open<M>Mysql({ applyMigrations: true })` interno + `close()`. Único ponto público
   de migração de cada módulo (ADR-0006 — não vaza adapters).
2. **Orquestrador puro** — `src/jobs/migrate/migrate.ts`: recebe a lista de migradores
   `{ module, apply }` + a connection string, executa em ordem determinística, **fail-fast**
   (para na 1ª falha — schema é pré-condição), agrega num `Result` que identifica o módulo que
   falhou. Sem I/O direto → testável sem DB.
3. **Entrypoint one-shot** — `src/jobs/migrate/run.ts`: lê `MIGRATE_DATABASE_URL`, wira os 6
   migradores, chama o orquestrador, traduz para exit codes sysexits (`0` ok · `78` config · `1`
   runtime). Espelha o padrão de `src/jobs/contracts/sweeper/run.ts` (`process.exitCode`, sem
   `process.exit`).
4. **Compose** — service `migrate` one-shot sob profile `jobs` (`<<: *x-job-base`, `restart: "no"`,
   `depends_on: mysql healthy`, secret `migrate_database_url` via wrapper `$(cat)`, hardening
   cap_drop/read_only/tmpfs). Disparo: `docker compose --profile jobs run --rm migrate`.
5. **Secret** — `scripts/setup-secrets.ts` gera `migrate_database_url.txt` (0600, mesma URL).

## Fora de escopo (Slice B)

Trocar `applyMigrations: true → false` nas compositions HTTP · ajustar `e2e-*.sh` · `depends_on:
migrate` em http/workers · mover Dockerfile p/ deploy/ (vetado pelo docker-expert).

## Critérios de aceite

- **CA1** — cada um dos 6 módulos expõe `applyMigrations(connStr)` no `public-api/migrate.ts`,
  retornando `Result` (nunca `throw`). [unit: contrato/tipo · integração gated: migra de fato]
- **CA2** — `runMigrations(migrators, connStr)` aplica todos quando todos retornam ok → `ok`. [unit puro, fakes]
- **CA3** — fail-fast: se o módulo *k* falha, retorna `err` identificando o módulo e **não** chama
  os migradores seguintes. [unit puro, fakes]
- **CA4** — `run.ts` sem `MIGRATE_DATABASE_URL` (ou string vazia/inválida) → exit `78`. [unit]
- **CA5** — orquestrador preserva ordem determinística dos módulos. [unit]
- **CA6** — service `migrate` no compose: existe sob `--profile jobs`, `restart: "no"`,
  `depends_on.mysql.condition == service_healthy`, usa o secret `migrate_database_url`
  (serviço + top-level), `security_opt` no-new-privileges, `cap_drop: [ALL]`, `read_only: true`,
  entrypoint executa `src/jobs/migrate/run.ts` (não `server.ts`). [meta `docker compose config`]
- **CA7** — sem `--profile jobs`, o serviço `migrate` **não** é ativado (default só-infra). [meta]
- **CA8** — `setup-secrets.ts` gera `migrate_database_url.txt` com modo `0600`. [unit do script]
- **CA9** (guard de não-regressão) — as 5 compositions HTTP **permanecem** `applyMigrations: true`
  (o Slice A não inverte o boot). [grep assert]

## Tamanho

M — 6 módulos (porta pública pequena cada) + orquestrador + run + 1 service + 1 secret. Aditivo,
sem mudança de comportamento do boot.
