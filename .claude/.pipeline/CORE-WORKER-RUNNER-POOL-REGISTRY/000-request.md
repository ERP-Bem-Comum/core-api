# Ticket CORE-WORKER-RUNNER-POOL-REGISTRY

> **Categoria:** Infra/runtime — consolidação de workers + pool sharing (Fatia 1: código).
> **Origem:** issue [#407](https://github.com/ERP-Bem-Comum/core-api/issues/407) + [`handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md`](../../../handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md) (causa #2: proliferação de pools).
> **Depende de:** `CORE-DB-POOL-CONFIG-INVARIANT` (usa `src/shared/persistence/mysql-pool-config.ts`; branch `fix/pool-config-invariant`). Branch stacked.
> **Tamanho:** L. **Fatia 1 = código** (runner + registry + factories + testes). **Fatia 2 = deploy** (compose 6→3 + taskdefs Fargate + x99) = ticket próprio.

---

## Descobertas de infra (ERP-INFRA, ancoram o design)

- **Launch type = Fargate** (`platform/aws-ecs-prod/taskdefs/*.taskdef.json`): cada worker = 1 taskdef = 1 task com custo + ENI próprios. Consolidar 6→3 tasks corta custo direto.
- **Todas as `*_DATABASE_URL` = `mysql://core_app:***@<mesmo-rds>:3306/core`** (`docs/env-and-secrets.reference.yaml:92-98`). ADR-0014 = isolamento por **prefixo de tabela** (`ctr_*`/`fin_*`/`par_*`) no MESMO db `core`, MESMO user `core_app`. Logo as connection-strings são **idênticas em valor**.
- **Consequência:** pool por connection-string **colapsa em 1 pool por processo** (não 1 por módulo). Grupo de 3 projeções → **1 pool**, com 3 drizzle instances (schema por módulo) sobre ele.
- **Bulkhead (Newman, `building-microservices:6478`) NÃO se aplica** — não há downstream distinto (destino único: 1 RDS). Múltiplos pools = fragmentação contra `max_connections=60`, zero isolamento real.

---

## Objetivo

Consolidar os 6 workers long-running em **3 processos por afinidade**, cada um com **1 pool MySQL compartilhado** (dedup por connection-string via `PoolRegistry`), rodando os loops em `Promise.allSettled` com isolamento de falha e shutdown que drena tudo. Corta processos (Fargate), pools e conexões contra o RDS.

Agrupamento (#407): **A** outbox (contracts + partners) · **B** projeções (supplier-view + payable-view + contract-count) · **C** email-dispatch (isolado — SMTP externo).

---

## Escopo

### O que entra (Fatia 1 — código)

1. **`src/shared/persistence/pool-registry.ts`** (novo): `getOrCreate(connectionString): Result<Pool, PoolConfigError>` — dedup por string; usa `buildPoolOptions` (invariante `maxIdle` do ticket anterior); `closeAll(): Promise<void>`. `connectionLimit` do pool compartilhado derivado do **budget** (`floor(60 × margem / N_processos)`, afinado no W1 com `mysql-database-expert`).
2. **`openXMysql` aceita pool externo** (variante que recebe o `Pool` do registry e cria só o `drizzle`+schema por cima, em vez de sempre `createPool`). Preserva a API atual (pool próprio) para callers standalone.
3. **`src/workers/runner/run.ts`** (novo): dado `WORKER_GROUP` (env), resolve as factories do grupo, cria 1 registry, monta cada worker (drizzle+adapters sobre o pool do registry) e roda os loops em `Promise.allSettled`; `AbortController` compartilhado; SIGTERM/SIGINT → abort + `registry.closeAll()`.
4. **Factories dos 6 workers**: extrair o bootstrap inline de cada `run.ts` para `buildXWorker(deps): { loopDeps, loopConfig }`, reutilizável pelo runner. Os `run.ts` standalone atuais podem passar a delegar ao runner com grupo unitário (ou ficar como estão até a Fatia 2).

### O que NÃO entra

- 🔸 **Deploy** (compose 6→3 serviços + taskdefs Fargate 6→3 + validação x99) → **Fatia 2** (`CORE-WORKER-CONSOLIDATION-DEPLOY`).
- 🔸 **Pool sharing no HTTP** (`server.ts`) → reusa o `PoolRegistry` no `CORE-DB-POOL-CONSOLIDATE-READPORTS`.
- 🔸 Mudança na semântica FIFO/single-instance dos workers (mantida).

---

## Decisões

- **D1 — 1 pool por connection-string (registry).** Dedup por valor da string. Como todas as URLs são idênticas, colapsa em 1 pool/grupo. Drizzle por módulo sobre o pool compartilhado.
- **D2 — `connectionLimit` do pool compartilhado derivado do budget.** `floor(max_connections × margem / N_processos)`, com folga para DBA/ETL. Valor exato afinado no W1 (`mysql-database-expert`); a fórmula é o que importa.
- **D3 — Isolamento por `Promise.allSettled`.** Um loop que rejeita não derruba os irmãos do grupo; a falha é logada. (Bulkhead real = destino único; o isolamento aqui é de *processo/loop*, não de pool.)
- **D4 — `PoolRegistry` em `src/shared/persistence/`** (reutilizável por HTTP depois). Não fere ADR-0014 (config/conexão puras; schemas seguem por módulo).

---

## Plano de testes W0 (RED)

**Estruturais (sem Docker):**
- **CA-1:** `getOrCreate(url)` cria 1 pool na 1ª chamada (`ok`).
- **CA-2:** `getOrCreate(url)` 2× com a MESMA string → **mesmo** pool (dedup; não cria outro).
- **CA-3:** `getOrCreate(urlA)` vs `getOrCreate(urlB)` → pools distintos.
- **CA-4:** `getOrCreate` propaga `err` de `buildPoolOptions` (config inválida) sem criar pool.
- **CA-5:** `closeAll()` fecha todos os pools registrados (idempotente).
- **CA-6:** runner roda os N loops do grupo em paralelo (todos iniciam antes de qualquer terminar).
- **CA-7:** um worker cujo loop rejeita → os demais do grupo continuam (`allSettled`), rejeição logada.
- **CA-8:** SIGTERM/abort → todos os loops recebem o sinal e o runner chama `closeAll()`.

**Efeito / integração (opt-in `MYSQL_INTEGRATION=1`, x99):**
- **CA-9:** grupo com 3 workers na MESMA URL → **1 pool**; conexões totais ao RDS ≤ `connectionLimit` do pool único (prova o dedup real — não 3× pools).

---

## Critérios de aceite (DoD)

- [ ] `PoolRegistry` criado: dedup por connection-string, usa `buildPoolOptions`, `closeAll`.
- [ ] `openXMysql` aceita pool externo (drizzle sobre pool compartilhado) sem quebrar a API atual.
- [ ] `worker-runner` roda os grupos A/B/C com `Promise.allSettled` + shutdown que drena (`closeAll`).
- [ ] CA-1..CA-8 verdes em `pnpm test`; CA-9 validado no x99 (prova 1 pool p/ grupo).
- [ ] `Result` na borda; erros EN kebab; sem `throw` cruzando adapter.
- [ ] `typecheck`/`lint`/`format:check`/`pnpm test` verdes.
- [ ] #407 atualizada: Fatia 1 (código) entregue; Fatia 2 (deploy) rastreada.

---

## Referências

- Issue [#407](https://github.com/ERP-Bem-Comum/core-api/issues/407) · Incidente `handbook/incidents/0001-...md`
- Base: `src/shared/persistence/mysql-pool-config.ts` (CORE-DB-POOL-CONFIG-INVARIANT)
- Infra: `ERP-INFRA/platform/aws-ecs-prod/taskdefs/` + `ERP-INFRA/docs/env-and-secrets.reference.yaml`
- Bulkhead: `building-microservices--sam-newman.md:6478` (por que NÃO se aplica aqui)
