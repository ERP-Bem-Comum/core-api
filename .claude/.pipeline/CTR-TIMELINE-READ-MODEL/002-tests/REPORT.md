# W0 RED — CTR-TIMELINE-READ-MODEL (passada 1)

> **Skill:** `tdd-strategist` · **Outcome:** RED · **Data:** 2026-05-26

## Arquivos criados

| Arquivo | Cobre |
| :--- | :--- |
| `tests/modules/contracts/domain/timeline/projection.test.ts` | CA-1 — `toTimelineEntry` (kind, occurredAt, actor, subjectAmendmentId) |
| `tests/modules/contracts/adapters/persistence/timeline-projection.test.ts` | CA-2/3/4/5/7 — projetor (EventDelivery) + repo in-memory: projeção, resolução amendment→contract, idempotência, ordem, skip não-resolvido |
| `tests/modules/contracts/application/use-cases/get-contract-timeline.test.ts` | CA-6 — UC-08 query |

## Contrato público que o W1 deve cumprir

```ts
// domain/timeline/types.ts
type TimelineEntry = Readonly<{ eventId: string; contractId: ContractId; kind: ContractsModuleEvent['type'];
  occurredAt: Date; actor: UserRef | null; subjectAmendmentId: AmendmentId | null }>;
// domain/timeline/projection.ts
const toTimelineEntry = (event: ContractsModuleEvent, eventId: string, contractId: ContractId) => TimelineEntry; // puro, exaustivo
// domain/timeline/repository.ts
type TimelineRepository = { append(entry) idempotente-por-eventId; listByContract(id) ordenado-occurredAt; findContractIdByAmendment(id) };
// adapters/.../timeline-repository.in-memory.ts → InMemoryTimelineRepository(): TimelineRepository
// adapters/event-delivery/timeline-projection.delivery.ts → TimelineProjectionDelivery(repo): EventDelivery (consumerId 'timeline')
// application/use-cases/get-contract-timeline.ts → getContractTimeline({timelineRepo})({contractId})
```

## Saída literal do gate (`node --test`)

```
ℹ tests 3 · pass 0 · fail 3
Error [ERR_MODULE_NOT_FOUND]: .../domain/timeline/projection.ts
Error [ERR_MODULE_NOT_FOUND]: .../repos/timeline-repository.in-memory.ts
```

(3 arquivos RED por inexistência dos módulos.)

## Próximo passo (W1)

`ts-domain-modeler` (types + projeção exaustiva) → `ports-and-adapters` (repo in-memory + projetor + UC-08).
Resolução `contractId`: direto (contract/AmendmentCreated) ou via `findContractIdByAmendment`
(amendment-homologated/doc-attached e document-on-amendment).
