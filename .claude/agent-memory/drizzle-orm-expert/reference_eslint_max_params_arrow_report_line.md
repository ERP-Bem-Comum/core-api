---
name: eslint-max-params-arrow-report-line
description: markFailed(consumerId, eventId, now, errorTag, attempt) violava max-params; resolvido com OutboxFailure, não eslint-disable
metadata:
  type: reference
---

`@typescript-eslint/max-params` (limite 4 neste projeto) estourou quando `markFailed` ganhou
`consumerId` como 1º parâmetro (#800/#824) e chegou a 5 posicionais. Cheguei a propor
`eslint-disable` em bloco (`/* eslint-disable */ ... /* eslint-enable */` — necessário porque a
regra reporta a violação na linha do `=>` de uma arrow function multi-linha, não na da
declaração; `eslint-disable-next-line` antes da declaração vira "unused directive"). O
team-lead **rejeitou** essa saída: "oito supressões de uma regra que está apontando um design
ruim é silenciar o gate, não passar por ele. A regra tem razão."

**Solução estrutural adotada** — objeto de falha em `src/shared/outbox/types.ts`:

```ts
export type OutboxFailure = Readonly<{ now: Date; errorTag: string; attempt: number }>;

// WorkerOutboxOps.markFailed:  (consumerId, eventId, failure: OutboxFailure) — 3 params
// OutboxBatchOps.markFailed:   (eventId, failure: OutboxFailure)             — 2 params
```

`OutboxFailure` é reexportado dos ports de cada módulo (`contracts`, `partners`, `partners`
email, `auth`) — importar de lá, não do shared direto, mesmo padrão de `OutboxBatchOps`.

**Padrão de implementação** (nos 5 lugares que usam `markFailed`, top-level e dentro de
`withPendingBatch`):

```ts
// helper público do repo — `now` NÃO é desestruturado quando não há coluna de "hora da
// última falha" (a maioria dos casos: só `fin_outbox`/`auth_outbox`/`par_email_outbox` têm
// essa lacuna; nenhum tem essa coluna hoje).
const markFailed = async (consumerId: string, eventId: string, { errorTag, attempt }: OutboxFailure) => …

// dentro de withPendingBatch (ops, ligado ao consumerId do batch):
markFailed: async (eventId, { errorTag, attempt }) => safe(…)

// no in-memory, ops delegando ao helper top-level:
markFailed: async (eventId, failure) => markFailed(consumerId, eventId, failure)
```

Motivo dado pelo próprio comentário que o team-lead deixou em `types.ts`: `(consumerId, eventId,
now, errorTag, attempt)` é uma sequência de três valores do mesmo tipo primitivo (`string`/`Date`
misturados) onde trocar dois de lugar compila e falha em silêncio — nomeado, não troca.

Ver [[project-outbox-fanout-consumer-id]].
