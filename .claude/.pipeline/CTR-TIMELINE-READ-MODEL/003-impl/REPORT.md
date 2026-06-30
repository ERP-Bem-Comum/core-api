# W1 GREEN — CTR-TIMELINE-READ-MODEL (passada 1)

> **Skills:** `ts-domain-modeler` (types+projeção) + `ports-and-adapters` (repo+delivery+use case) · **Outcome:** GREEN · **Data:** 2026-05-26

## Arquivos criados

| Arquivo | Conteúdo |
| :--- | :--- |
| `domain/timeline/types.ts` | `TimelineEntry` + `TimelineEntryKind` + `TimelineSourceEvent` (união dos eventos de **domínio** — evita import de application). |
| `domain/timeline/projection.ts` | `toTimelineEntry` puro, switch exaustivo sobre os 9 eventos (kind, occurredAt, actor, subjectAmendmentId). |
| `domain/timeline/repository.ts` | port `TimelineRepository` (append idempotente, listByContract ordenado, findContractIdByAmendment). |
| `adapters/persistence/repos/timeline-repository.in-memory.ts` | repo in-memory + índice amendmentId→contractId. |
| `adapters/event-delivery/timeline-projection.delivery.ts` | `TimelineProjectionDelivery` — `EventDelivery` (consumer 'timeline') que resolve contractId e projeta. |
| `application/use-cases/get-contract-timeline.ts` | **UC-08** query. |

## Decisões de design

- **Camadas:** projeção/types/port em `domain/` (sem importar application — a união de eventos é montada dos módulos de domínio, estruturalmente idêntica a `ContractsModuleEvent`).
- **Resolução de contractId** inlinada no `deliver` (evita armadilha de lint async/await): direto (contract/AmendmentCreated) ou via `findContractIdByAmendment` (homologação/anexo de aditivo, documento-de-aditivo).
- **Idempotência** por `eventId`; **ordem** por `occurredAt`; **skip** de evento não-atribuível (CA-7).

## Saída literal dos gates

`node --test` (3 arquivos do ticket):

```
ℹ tests 13
ℹ pass 13
ℹ fail 0
```

`pnpm test` (suíte completa, +13, zero regressão):

```
ℹ tests 1162
ℹ pass 1146
ℹ fail 0
ℹ skipped 16
```

`pnpm run typecheck` e `pnpm run lint`: zero erros (1 fix: `prefer-readonly-parameter-types` em `amendmentOfDoc`).

## Próximo passo

W2 REVIEW. Pass 2 (sub-ticket): UC-02 + CLI + persistência MySQL + wiring no worker.
