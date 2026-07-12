# Ticket CORE-WORKER-CONSOLIDATION-DEPLOY

> **Categoria:** Infra/deploy — consolidação dos workers no runtime (Fatia 2: deploy).
> **Origem:** issue [#407](https://github.com/ERP-Bem-Comum/core-api/issues/407) + [`handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md`](../../../handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md) (causa #2: proliferação de pools).
> **Depende de:** `CORE-WORKER-RUNNER-POOL-REGISTRY` (Fatia 1 — código do runner + `PoolRegistry`, PR #410, mergeada na `dev`).
> **Tamanho:** M. **Fatia 2 = deploy** (compose 6→3 + taskdefs Fargate 6→3 + doc de aritmética + validação x99).

---

## Contexto

A Fatia 1 entregou o `worker-runner` (`src/workers/runner/run.ts`): dado `WORKER_GROUP=outbox|projections|email`, resolve as factories do grupo, cria **1 `PoolRegistry`** (dedup por connection-string) e roda os loops em `Promise.allSettled` com shutdown que drena os pools. Falta o **runtime** usar isso: hoje o `compose.yaml` (profile `workers`) e os taskdefs Fargate de prod ainda sobem **6 processos standalone**, cada um abrindo pool(s) próprio(s).

Aritmética de pools contra o RDS (`max_connections=60`) hoje (6 processos standalone, sem registry):

| Processo | Pools |
| --- | --- |
| outbox-contracts | 1 (contracts) |
| outbox-partners | 1 (partners) |
| supplier-projection | 2 (partners + financial) |
| payable-projection | 1 (financial) |
| contract-count-projection | 2 (contracts + partners) |
| email-dispatch | 2 (auth + partners) |
| **Total** | **9 pools / 6 processos** |

Como **todas as `*_DATABASE_URL` são idênticas em valor** (mesmo RDS/db `core`/user `core_app` — ADR-0014 isola por prefixo de tabela, não por conexão), o `PoolRegistry` deduplica por string e **colapsa cada grupo em 1 pool**:

| Grupo (processo) | Workers | Pools (dedup) |
| --- | --- | --- |
| `outbox` | contracts + partners | **1** |
| `projections` | supplier + payable + contract-count | **1** |
| `email` | email-dispatch (auth [+ partners]) | **1** |
| **Total** | | **3 pools / 3 processos** |

Corte: **9→3 pools** e **6→3 processos/tasks Fargate** (custo direto de ENI + task).

---

## Escopo

### O que entra

1. **`compose.yaml`** (profile `workers`): substituir os 6 serviços standalone por **3** — `worker-outbox`, `worker-projections`, `worker-email` — cada um rodando `src/workers/runner/run.ts` com `WORKER_GROUP` + a **união** dos secrets do grupo. Preserva o hardening do `x-worker-base` (cap_drop, read_only, no-new-privileges, depends_on healthy).
2. **Taskdefs Fargate** (`ERP-INFRA/platform/aws-ecs-prod/taskdefs/`) — **JÁ FEITO** na branch `feat/worker-consolidation-407` (não-mergeada): 3 taskdefs de grupo (`worker-outbox`, `worker-projections`, `worker-email`), cada um = 1 container `src/workers/runner/run.ts` + `WORKER_GROUP` + secrets do grupo via Secrets Manager, conferidos consistentes com este `compose.yaml`. **Os 5 taskdefs antigos permanecem no repo (rollback — decisão do runbook `worker-consolidation-407.md`)**; a remoção é em runtime (`delete-service` no cutover), não no repo. `payable-view` entra em prod pela 1ª vez no grupo `projections` (backfill rastreado). **Validação x99 do runner já feita (2026-07-10)**.
3. **Doc de aritmética de conexões**: tabela 9→3 pools no request + referência cruzada no incidente 0001 (causa #2 endereçada).

### O que NÃO entra

- 🔸 Mudança na semântica FIFO/single-instance dos loops (mantida — cada worker roda 1×).
- 🔸 Pool sharing no HTTP (`server.ts`) → `CORE-DB-POOL-CONSOLIDATE-READPORTS`.
- 🔸 Connection budget de 1ª classe → `CORE-DB-CONNECTION-BUDGET`.

---

## Decisões

- **D1 — 1 container por task (não N containers).** O runner é 1 processo Node rodando N loops em `Promise.allSettled`; a task ECS/serviço compose expõe 1 container que executa o `runner/run.ts`. Isolamento é de loop (try/catch por worker), não de container.
- **D2 — União de secrets por grupo.** `worker-projections` recebe contracts+partners+financial; `worker-email` recebe auth+partners+smtp_pass. O runner só usa o que o grupo pede; secrets a mais são inertes.
- **D3 — `WORKER_GROUP` via env (compose) / `environment` (taskdef).** Única chave que seleciona o grupo; sem flags de CLI.
- **D4 — Nomes de serviço/família por GRUPO** (`worker-outbox`…), não por worker. Facilita o mapa 1:1 serviço↔task↔grupo.

---

## Plano de testes W0 (RED)

**Estrutural (sem subir container — `docker compose config --format json`, skip-guard se o plugin `docker compose` faltar):** `tests/infra/worker-runner-compose.test.ts`

- **CA-1:** com `--profile workers`, existem **exatamente 3** serviços de worker (`worker-outbox`, `worker-projections`, `worker-email`); os 6 nomes antigos **não** existem.
- **CA-2:** cada serviço executa `src/workers/runner/run.ts` (entrypoint+command) e **não** o `server.ts` nem um `run.ts` por-módulo.
- **CA-3:** cada serviço tem `WORKER_GROUP` = `outbox`/`projections`/`email` (via env resolvido).
- **CA-4:** secrets por grupo — outbox: {contracts,partners}; projections: {contracts,partners,financial}; email: {auth,partners,smtp_pass}. Todos declarados no `secrets:` top-level.
- **CA-5:** hardening preservado (cap_drop ALL + read_only + no-new-privileges + depends_on mysql/http healthy).
- **CA-6:** sem `--profile workers`, nenhum dos 3 é ativado (opt-in).

---

## Critérios de aceite (DoD)

- [ ] `compose.yaml`: 3 serviços de worker (grupo), runner + `WORKER_GROUP`, união de secrets, hardening preservado.
- [x] `ERP-INFRA`: 3 taskdefs de grupo já criados em `feat/worker-consolidation-407` (consistentes com o compose); 5 antigos mantidos p/ rollback (decisão do runbook).
- [ ] CA-1..CA-6 verdes onde há `docker compose` (CI/x99); `docker compose config` exit 0.
- [x] Aritmética 9→3 pools documentada (request + incidente 0001 §6.3).
- [ ] `typecheck`/`lint`/`format:check`/`pnpm test` verdes.
- [x] Validação x99 do **runner** já feita (2026-07-10, runbook §"validado no x99"); falta validar o **compose consolidado** (teste de infra) no x99/CI.
- [ ] #407 atualizada: Fatia 2 (deploy) entregue; #407 pode fechar após cutover em prod (ops).

---

## Referências

- Issue [#407](https://github.com/ERP-Bem-Comum/core-api/issues/407) · Incidente `handbook/incidents/0001-...md`
- Fatia 1: `src/workers/runner/{run,group,specs}.ts` + `src/shared/persistence/pool-registry.ts`
- Padrão de teste de infra: `tests/infra/contracts-sweeper-compose.test.ts`
- Padrão de taskdef: `ERP-INFRA/platform/aws-ecs-prod/taskdefs/outbox-contracts.taskdef.json`
