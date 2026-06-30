[← Voltar para ADRs](./README.md)

# ADR-0041: Workers especializados por entrypoint + jobs one-shot via cron externo (sem job queue até multi-instância)

- **Status:** Accepted
- **Date:** 2026-06-16
- **Deciders:** Gabriel (tech lead / arquiteto). Pesquisa: agente `nodejs-runtime-expert` + teoria canônica (`acdg-skills` via fallback).
- **Origem:** A issue [#39](https://github.com/ERP-Bem-Comum/core-api/issues/39) (auto-expire de contratos) exige um **sweep periódico** (diário, D+1 `America/Sao_Paulo`). Antes de empilhar um `setInterval` no worker do outbox, decidiu-se desenhar a arquitetura de workers/jobs do projeto.
- **Estende:** [ADR-0006](./0006-modular-monolith-core-api.md) (modular monolith — processos não são serviços) · **Relacionado:** [ADR-0002](./0002-keep-nodejs-runtime.md)/[ADR-0009](./0009-node-24-typescript-6-with-7-roadmap.md) (Node único) · [ADR-0015](./0015-mysql-outbox-pattern.md) (outbox) · [ADR-0030](./0030-valkey-shared-store-deferred.md) (Valkey/Redis deferred)

---

## Contexto

Hoje há **dois processos** no `core-api`: o **HTTP server** (`src/server.ts`, Fastify) e o **worker de outbox**
(`src/modules/contracts/worker/run.ts` — loop contínuo ~100-500ms, `AbortController`, claim via `FOR UPDATE SKIP
LOCKED`). Surge a necessidade de **jobs agendados** (o sweep de auto-expire, e futuros: notificações, mais sweeps).

Restrições: **Redis/Valkey está deferido** (ADR-0030 — single-instance hoje); **Node 24 é o runtime único**
(ADR-0002/0009); dev tem **8 GB RAM** (paralelismo pesado é caro); infra é Docker + Watchtower (VPS-QA) + Lightsail (prod).

A pergunta: como separar responsabilidades em **workers sérios** sem acoplar cadências nem introduzir concorrência mal-gerida?

---

## Decisão (proposta)

1. **Workers especializados = um entrypoint por responsabilidade**, no **mesmo monorepo** (compartilham
   `domain/`/`application/`; **não** são microsserviços — ADR-0006 fala de _deployável_, não de _processo_).
   Topologia: `core-api` (HTTP) · `outbox-worker` (loop contínuo) · `contracts-sweeper` (job agendado).
2. **Jobs periódicos = processos one-shot disparados por cron externo** (systemd timer / container `ofelia` no
   Compose) — **não** `setInterval` long-running, **não** acoplados ao loop do outbox. O job: conecta → `UPDATE`
   em lote + `INSERT` outbox (**1 transação** — ADR-0015) → fecha o pool → `exit 0`.
3. **`worker_threads`/`cluster` não se aplicam a jobs I/O-bound** — `worker_threads` é para CPU-bound; `cluster`
   é escala de HTTP (porta TCP). A primitiva certa é `async/await` sobre o pool `mysql2` + sinais de processo.
4. **Coordenação multi-instância (quando chegar):** `GET_LOCK('contracts:auto-expire:<data>', 0)` do MySQL **ou**
   tabela `ctr_job_executions(job_name, run_date)` com `UNIQUE` + `INSERT IGNORE` (idempotência). **Sem Redis.**
   Hoje (single-instance) o cron já garante 1×/dia.
5. **Job queue (BullMQ/Valkey) fica deferida** até **(a)** ADR-0030 ser promovido a Accepted **ou** **(b)** 3+ jobs
   com dependência/fanout entre si. Até lá, cron + one-shot é YAGNI.

### Padrão canônico de "um job novo"

```text
src/jobs/<módulo>/<job>/
├── run.ts         # entrypoint one-shot: config → conexão → executa → fecha pool → process.exitCode
├── config.ts      # readJobConfig(env): Result<JobConfig, JobConfigError>
├── <job>.ts       # lógica PURA (recebe Clock port; testável sem DB)
└── <job>.test.ts  # node:test com repositório in-memory
```

- **Sem `AbortController`/`SIGTERM` listener** (diferente do outbox worker): o job é one-shot; um `SIGTERM` de
  emergência mata o processo no meio → a transação MySQL faz **rollback** → o próximo disparo refaz (idempotente).
- **`AsyncLocalStorage`** (`withNewCorrelation`) envolve a execução → `correlationId` único em todos os logs/eventos.
- **`uncaughtException`/rejeição não-tratada:** logar stack + fechar pool + sair com código ≠ 0 (nunca "resumir").

---

## Fundamentação

### Teoria — separação por responsabilidade e isolamento de falha (Parnas)

> Each task forms a separate, distinct program module. (...) At checkout time the integrity of the module is
> tested independently (...). Finally, the system is maintained in modular fashion; system errors and deficiencies
> can be traced to specific system modules, thus limiting the scope of detailed error searching.
> — D. Parnas, _On the Criteria To Be Used in Decomposing Systems into Modules_ (`acdg/skills_base/shared-references/architecture/criteria-for-modularization--parnas.md:28`)

E, crucialmente, **módulo = responsabilidade, não sub-rotina**:

> In this context "module" is considered to be a **responsibility assignment** rather than a subprogram.
> — Parnas, _idem_ (`:43`)

Isso sustenta a Decisão (1)/(2): cada worker é uma **responsabilidade** isolada (HTTP / entrega de eventos /
expiração agendada). Um crash no sweeper **não** derruba o outbox nem o HTTP, e o erro é rastreável ao processo —
exatamente "limiting the scope of detailed error searching". Acoplar o sweep ao loop do outbox (anti-padrão D) viola isto.

### Teoria — trabalho periódico fora do caminho crítico (Newman)

> Moving Fraud Detection to a background process can reduce concerns around the length of the call chain (...)
> Effectively, this means we're doing some of this work in parallel. By reducing the length of the call chain (...)
> we'll take one of our microservices out of the critical path.
> — S. Newman, _Building Microservices_ 2ª ed. (`.../architecture/building-microservices--sam-newman.md:1719-1724`)

> Long-running processes are an obvious candidate [for asynchronous communication].
> — Newman, _idem_ (`:1794`)

Sustenta tirar a expiração do caminho síncrono (HTTP) e tratá-la como **trabalho de fundo** — o que o auto-expire
é por natureza (não há cliente esperando). E a idempotência do job ecoa o padrão de migrations de Newman:

> These scripts are then run in strict order in an **idempotent** manner.
> — Newman, _idem_ (`:1514`)

→ a Decisão (4) (dedup por `GET_LOCK`/`UNIQUE`) é a aplicação direta disso.

### Runtime — por que não `worker_threads`/`cluster` (Node 24)

> Workers (threads) are useful for performing CPU-intensive JavaScript operations. They do not help much with
> I/O-intensive work. The Node.js built-in asynchronous I/O operations are more efficient than Workers can be.
> — `handbook/reference/nodejs/Worker threads.md:6-9`

> The cluster module allows easy creation of child processes that all share server ports.
> — `handbook/reference/nodejs/Cluster.md:3-13` (escala de HTTP, não de jobs)

Sinais e shutdown seguem o já-canônico do outbox (`Process.md:669-672` — `SIGTERM` handler remove o exit padrão;
`Process.md:329-345` — `uncaughtException` só faz cleanup síncrono); `AsyncLocalStorage` (`Asynchronous context
tracking.md:9-15`, Stability 2) para correlation-id.

---

## Consequências

### Positivas

- **Isolamento de falha real** (Parnas): cada worker cai/reinicia sozinho; erro rastreável ao processo.
- **Cadências desacopladas**: outbox (~ms) e sweep (24h) não competem pelo mesmo event loop.
- **Simplicidade operacional**: job one-shot é observável por exit code; sem timer pendurado 23h59; sem Redis.
- **Reaproveita o monorepo** (ADR-0006): o job importa o domínio/application existente — sem microsserviço, sem duplicação.

### Negativas / custos

- **Nova peça de infra**: um scheduler (systemd timer / `ofelia`) em `ERP-INFRA` por job agendado.
- **Sem retry/backoff sofisticado** nativo (o cron reexecuta no próximo tick) — aceitável para sweeps idempotentes; quando não for, é o gatilho do BullMQ.
- **Coordenação multi-instância adiada**: hoje confia no single-instance; o `GET_LOCK`/tabela-dedup só entra quando necessário (documentado, não implementado).

### Riscos e mitigação

- Job rodar 2× (multi-instância futura) → `GET_LOCK`/`UNIQUE(job_name, run_date)`.
- Cron disparar em fuso errado → o **cutoff D+1 é calculado no job em `America/Sao_Paulo`** (não confiar só no horário do cron).

---

## Alternativas consideradas

| Opção | Veredito |
| --- | --- |
| `setInterval` no loop do outbox | **Rejeitada** — cadências incompatíveis (~ms vs 24h); zero isolamento (anti-Parnas); viola SRP do outbox. |
| Processo long-running dedicado com `setInterval` | **Rejeitada p/ sweep diário** — fica acordado 23h59 à toa; one-shot é mais simples/observável. (Válido só p/ trabalho quasi-contínuo, como o outbox.) |
| `worker_threads` | **Rejeitada** — I/O-bound; não ajuda (`Worker threads.md:6-9`). |
| `node:cluster` p/ jobs | **Rejeitada** — escala de HTTP, não agendamento. |
| BullMQ/Valkey | **Adiada** — ADR-0030 (Redis deferred); reabrir com multi-instância ou 3+ jobs com dependência. |

---

## Aplicação imediata (CTR-AUTO-EXPIRE / #39)

O auto-expire é o **job piloto** deste padrão: `src/jobs/contracts/sweeper/` (one-shot) + disparo cron 00:05
`America/Sao_Paulo` em `ERP-INFRA`. O `000-request` do ticket será ajustado de `setInterval` → one-shot, mantendo
os 5 CAs e a guarda D+1 do domínio (`at > end`).

---

## Referências

- Parnas, _On the Criteria To Be Used in Decomposing Systems into Modules_ (`acdg/skills_base/.../criteria-for-modularization--parnas.md:28,43`).
- Newman, _Building Microservices_ 2ª ed. (`.../building-microservices--sam-newman.md:1514,1719-1724,1794`).
- `handbook/reference/nodejs/`: `Worker threads.md:6-9` · `Cluster.md:3-13` · `Process.md:329-345,669-672` · `Timers.md:144-155` · `Asynchronous context tracking.md:9-15`.
- ADR-0006 (modular monolith) · ADR-0002/0009 (Node único) · ADR-0015 (outbox) · ADR-0030 (Valkey deferred).
- `src/modules/contracts/worker/{run,outbox-worker,config}.ts` — padrão de worker contínuo existente.
