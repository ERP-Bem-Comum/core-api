---
paths:
  - 'src/jobs/**/*.ts'
  - 'src/workers/**/*.ts'
  - 'src/modules/*/worker/**/*.ts'
  - 'src/shared/outbox/**/*.ts'
  - 'tests/jobs/**/*.ts'
  - 'tests/workers/**/*.ts'
  - 'tests/modules/*/worker/**/*.ts'
verify:
  - claim: 'a topologia de produção é por grupo, e o seletor vive só no runner'
    root: 'src'
    pattern: 'WORKER_GROUP'
    expect:
      - 'src/workers/runner/run.ts'
      - 'src/workers/runner/specs.ts'
  - claim: 'a spec de worker é declarada num lugar só, e é o mesmo que agrupa'
    root: 'src'
    pattern: 'SpecBuilder'
    expect:
      - 'src/workers/runner/specs.ts'
  - claim: 'a coordenação multi-instância de job existe e é exercida pelo sweeper'
    root: 'src'
    pattern: 'claimJobRun'
    expect:
      - 'src/jobs/contracts/sweeper/run.ts'
      - 'src/modules/contracts/adapters/persistence/repos/job-run.drizzle.ts'
---

A disciplina one-shot do job — sem `setInterval`, sem listener de sinal — e o shutdown cooperativo do worker contínuo são cobrados por `tests/cleanup/jobs-oneshot-discipline.test.ts`, com a razão de cada uma no docblock de lá. Não repetir aqui.

- **Produção roda 3 processos por grupo, não um por worker.** O `compose.yaml` — que gera os taskdefs — sobe `src/workers/runner/run.ts` com `WORKER_GROUP=outbox|projections|email`. Os 6 workers standalone foram consolidados nesses 3 (#407), para cortar tasks Fargate e pools contra o RDS depois do [Incident-0001](../../handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md). Ao raciocinar sobre paralelismo ou conexões, a unidade é o **grupo**, não o worker.

- **Responsabilidade nova = `SpecBuilder` novo, NUNCA processo novo.** Acrescentar um worker é escrever a factory em `src/workers/runner/specs.ts` e listá-la num dos três grupos do `GROUPS` — não criar entrypoint. O `SpecBuilder` recebe `env` e o `PoolRegistry` por parâmetro, devolve `Result<WorkerSpec, string>`, e o `WorkerSpec` é só `{ name, run(signal) }`: **cadência e ciclo de vida não entram nele** — quem cuida de SIGTERM e do `abortSignal` é o `run.ts` do runner. Spec que lê `process.env`, abre pool próprio ou agenda a si mesma quebra a consolidação e devolve o pool redundante que o Incident-0001 custou. [ADR-0041](../../handbook/architecture/adr/0041-specialized-workers-and-oneshot-jobs.md) pedia um entrypoint por responsabilidade; o que sobrevive dele é a **separação de responsabilidades na spec** — a contagem de PROCESSOS é decisão operacional (pools contra o RDS, tasks Fargate), não consequência de quantas responsabilidades existem.

- **Os `run.ts` de `modules/*/worker/` não são o caminho de produção.** Seguem invocáveis por `pnpm run worker:outbox` e `worker:outbox:partners` (uso local e debug), mas o runner tem composition root próprio e **não os importa**. Do diretório `worker/` de um módulo, o runner consome apenas `config.ts` e `outbox-worker.ts` — mudar esses dois afeta produção; mudar `run.ts`, não. É a assimetria mais fácil de errar aqui.

- **A coordenação multi-instância existe desde 2026-06-17** — `claimJobRun` faz `INSERT IGNORE` em `ctr_job_runs` (PK `job_name`+`run_key`): a primeira instância insere e roda, as demais batem na PK e desistem. É lock de **eficiência**, não de correção: os jobs já são idempotentes, e o cron singleton continua sendo a garantia primária. Não escrever código novo assumindo que só o cron protege.

- **Projeção cross-módulo vive em `src/workers/`, nunca dentro do módulo.** Worker que lê o outbox de um módulo e escreve o read-model de outro ([ADR-0045](../../handbook/architecture/adr/0045-financial-supplier-read-model.md)) é composition root, como o `src/server.ts` — nenhum módulo importa o outro; a lógica vem da `public-api` do destino. Idempotência e ordenação por `ON DUPLICATE KEY UPDATE` + guard de recência em `occurred_at`; ver [`adapters.md`](./adapters.md).

- **Job queue (BullMQ/Valkey) segue diferida.** O gatilho do [ADR-0030](../../handbook/architecture/adr/0030-valkey-shared-store-deferred.md) (`Proposed`) exige o ADR virar `Accepted` **ou** existirem 3+ jobs com dependência entre si. Há 6 jobs, todos independentes — contagem não dispara o gatilho, fanout dispararia. Até lá, cron + one-shot; o resto é YAGNI.
