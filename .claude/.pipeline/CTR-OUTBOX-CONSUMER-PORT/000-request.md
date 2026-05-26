# CTR-OUTBOX-CONSUMER-PORT — contrato de consumo do outbox mora num port (desacoplar `OutboxRow`)

## Origem

Dívida registrada em `CTR-OUTBOX-SKIPLOCKED-DUP` (fechado 2026-05-26), seção
`004-code-review/REVIEW.md` §"Adendo pós-aprovação" → item 🟡. Naquele ticket o ciclo de
import concreto `outbox-repository.drizzle.ts ↔ outbox-worker.ts` foi **parcialmente**
quebrado: `OutboxQueryError` subiu para o port (`application/ports/outbox.ts`), tornando a
aresta `worker→adapter` inexistente. Restou uma aresta unidirecional `adapter→worker`.

## Problema

O contrato de **consumo** do outbox — `OutboxBatchOps` e `WorkerOutboxOps` — vive na camada
worker (`src/modules/contracts/worker/outbox-worker.ts`), e os adapters o importam:

- `src/modules/contracts/adapters/persistence/repos/outbox-repository.drizzle.ts:15`
  → `import type { OutboxBatchOps } from '../../../worker/outbox-worker.ts'`
- `src/modules/contracts/adapters/outbox/outbox.in-memory.ts:8` → idem.

Isso é uma dependência na direção errada: um **adapter** (camada baixa) depende de um tipo
declarado na camada **worker** (camada alta). O lar canônico de um contrato implementado
por adapters é um **port** (`application/ports/`), conforme ADR-0006 (ports & adapters).

### Por que não foi resolvido no ticket anterior

Mover `OutboxBatchOps`/`WorkerOutboxOps` para o port exige que o port referencie
`OutboxRow`. Mas:

```
src/modules/contracts/adapters/persistence/mappers/outbox.mapper.ts:20
  export type OutboxRow = typeof ctrOutbox.$inferSelect;
```

`OutboxRow` é **inferido do schema Drizzle** — é intrinsecamente um tipo de adapter. Um port
importando `OutboxRow` violaria `.claude/rules/application.md` ("Application... Sem importar
de `adapters/`. Application conhece apenas tipos de port."). Trocar o ciclo type-only atual
por uma violação `port→adapter` seria pior. Daí a dívida.

## Objetivo

Permitir que o contrato de consumo do outbox (`OutboxBatchOps`, `WorkerOutboxOps` e o tipo
de linha que eles expõem) viva num port, **sem** que a camada application/port importe de
`adapters/`. Resultado esperado: dependência `adapter → port ← worker` (direção correta),
ciclo eliminado de fato.

## Hipóteses de solução (a decidir no W1, não obrigatórias)

1. **`OutboxRow` canônico no port + conformidade no adapter.** Definir o tipo de linha do
   outbox explicitamente em `application/ports/` (campos escalares: `eventId`,
   `aggregateId`, `aggregateType`, `eventType`, `schemaVersion`, `occurredAt`, `enqueuedAt`,
   `processedAt`, `attempts`, `payload`). O mapper mantém `typeof ctrOutbox.$inferSelect` e
   adiciona um assert type-level de compatibilidade (`satisfies` / `AssertEqual`) para
   travar drift schema↔port em tempo de compilação.
2. **Contrato genérico no port.** `WorkerOutboxOps<Row>` / `OutboxBatchOps` parametrizados
   pelo tipo de row, com o adapter fixando `Row = OutboxRow`. Mantém o port agnóstico, mas
   pode complicar a ergonomia do worker.
3. Outra abordagem que o W0/W1 julgar mais simples respeitando `application.md` e ADR-0006.

## Critérios de aceitação

- CA1: `OutboxBatchOps` e `WorkerOutboxOps` **não** moram mais na camada worker; o adapter
  não importa tipo algum de `worker/`.
- CA2: nenhum arquivo sob `application/` ou `application/ports/` importa de `adapters/`
  (verificável por grep + `application.md`).
- CA3: o ciclo de import worker↔adapter está eliminado (não só reduzido). Verificável: o
  worker importa o contrato + o tipo de row do port; o adapter importa o contrato do port.
- CA4: se a abordagem mantiver `OutboxRow = $inferSelect`, há um guard type-level que
  **falha o typecheck** se o schema divergir do tipo do port.
- CA5: gate W3 verde (typecheck + lint + format + test) e suíte de integração do outbox
  (worker CA-I1..I3 + repo Drizzle) permanece verde — refatoração sem mudança de
  comportamento observável.

## Fora de escopo

- Mudança de comportamento do worker, do claim transacional ou do fluxo DLQ (entregue e
  fechado em `CTR-OUTBOX-SKIPLOCKED-DUP`).
- Alteração do schema físico `ctr_outbox` / migrations.
- Mover `OutboxQueryError` (já está no port desde o ticket anterior).
