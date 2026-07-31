---
paths:
  - "src/jobs/**/*.ts"
  - "src/workers/**/*.ts"
  - "src/shared/outbox/**/*.ts"
  - "tests/jobs/**/*.ts"
  - "tests/workers/**/*.ts"
---

# Regras invariantes — Jobs e Workers

Um **entrypoint por responsabilidade**, no mesmo monorepo ([ADR-0041](../../handbook/architecture/adr/0041-specialized-workers-and-oneshot-jobs.md)). Compartilham `domain/`/`application/` — **não** são microsserviços: o ADR-0006 fala de _deployável_, não de _processo_.

## Job periódico é one-shot, não loop

**Cron externo** (systemd timer / container `ofelia` no Compose) dispara um processo que:

```
conecta → UPDATE em lote + INSERT outbox (UMA transação) → fecha o pool → exit
```

- **Nunca `setInterval`** long-running, **nunca** acoplado ao loop do outbox worker.
- **Sem `AbortController`/listener de `SIGTERM`** — ao contrário do worker contínuo. Um `SIGTERM` mata o processo no meio, o MySQL faz **rollback**, e o próximo disparo refaz. A idempotência é a garantia, não o graceful shutdown.
- `uncaughtException`/rejeição não-tratada: logar stack → fechar pool → sair com código **≠ 0**. **Nunca "resumir" e seguir.**
- `AsyncLocalStorage` (`withNewCorrelation`) envolve a execução → um `correlationId` em todos os logs e eventos.

## Estrutura canônica de um job novo

```
src/jobs/<módulo>/<job>/
├── run.ts      # entrypoint one-shot: config → conexão → executa → fecha pool → exitCode
├── config.ts   # readJobConfig(env): Result<JobConfig, JobConfigError>
├── <job>.ts    # lógica PURA (recebe Clock port; testável sem DB)
└── <job>.test.ts
```

## Primitivas que **não** se aplicam

- **`worker_threads`** é para CPU-bound. Job de I/O não ganha nada — a primitiva certa é `async/await` sobre o pool `mysql2`.
- **`cluster`** é escala de HTTP (compartilha porta TCP). Não serve a job.
- **Job queue (BullMQ/Valkey) está diferida** até o ADR-0030 virar `Accepted` **ou** existirem 3+ jobs com dependência/fanout entre si. Até lá, cron + one-shot é a resposta — o resto é YAGNI.

## Projeção cross-módulo vive no composition root

Worker que lê o outbox de um módulo e escreve o read-model de outro ([ADR-0045](../../handbook/architecture/adr/0045-financial-supplier-read-model.md)) fica em `src/workers/`, **fora dos módulos** — como o `src/server.ts`. **Nenhum módulo importa o outro**; a lógica de aplicação vem da `public-api` do destino.

Idempotência e ordenação: `ON DUPLICATE KEY UPDATE` + **guard de recência** por `occurred_at`. Ver [`adapters.md`](./adapters.md).

## Coordenação multi-instância (quando chegar)

`GET_LOCK('<job>:<data>', 0)` do MySQL **ou** tabela de execuções com `UNIQUE` + `INSERT IGNORE`. **Sem Redis.** Hoje, single-instance, o próprio cron garante 1×/dia.
