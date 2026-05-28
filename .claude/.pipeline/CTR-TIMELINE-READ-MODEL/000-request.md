# CTR-TIMELINE-READ-MODEL — Projeção da Timeline (UC-08) — passada 1

> **Size:** L (split em passadas) · **Módulo:** contracts · **Decidido por:** [ADR-0022](../../../handbook/architecture/adr/0022-read-models-via-projection-over-event-stream.md)
> **Gap:** #2 do relatório de cobertura · **BC:** [`05-timeline-context.md`](../../../handbook/domain/contratos/05-timeline-context.md)

## Contexto

ADR-0022 decidiu: a Timeline é um **read-model projetado** sobre o stream de eventos
(o `ctr_outbox` é o log append-only), alimentado pelo **event-delivery existente**, com
**colunas decompostas** (ADR-0020, sem JSON), idempotente por `eventId`.

O port `EventDelivery` (`consumerId` + `deliver(ProcessedEvent)`) é o gancho exato do projetor:
o projetor da Timeline é um `EventDelivery` que o worker já sabe chamar.

### Achado de design — resolução de `contractId`

Nem todo evento carrega `contractId`:

- **Carregam:** `ContractCreated`, `ContractStateUpdated`, `ContractEnded`, `AmendmentCreated`.
- **Não carregam:** `AmendmentHomologated`, `AmendmentDocumentAttached` (só `amendmentId`);
  documentos carregam `parentId` (`Contract` → é o contractId; `Amendment` → precisa resolver).

→ O projetor mantém o vínculo `amendmentId → contractId` (aprendido do `AmendmentCreated`) na
própria projeção. O stream do outbox é **ordenado**, então `AmendmentCreated` é projetado antes
da homologação/anexo. Resolução via `TimelineRepository.findContractIdByAmendment`.

## Escopo — passada 1 (esta)

Mecanismo de projeção + leitura, **in-memory, totalmente testado**:

1. `domain/timeline/types.ts` — `TimelineEntry` (Readonly: `eventId`, `contractId`, `kind`,
   `occurredAt`, `actor: UserRef | null`) + `TimelineEntryKind` (union **EN**; PT fica no formatter, pass 2).
2. `domain/timeline/projection.ts` — `toTimelineEntry(event, eventId, contractId): TimelineEntry`
   (mapeamento puro e exaustivo sobre `ContractsModuleEvent`).
3. `domain/timeline/repository.ts` — `TimelineRepository` port: `append` (idempotente por `eventId`),
   `listByContract` (ordenado por `occurredAt`), `findContractIdByAmendment`.
4. `adapters/persistence/repos/timeline-repository.in-memory.ts`.
5. `adapters/event-delivery/timeline-projection.delivery.ts` — `EventDelivery` (`consumerId='timeline'`)
   que resolve `contractId`, projeta e faz append idempotente.
6. `application/use-cases/get-contract-timeline.ts` — **UC-08** query.

## Fora de escopo (passadas seguintes)

- **Pass 2:** UC-02 (`get-contract` devolve contrato + trilha), CLI (`ver-timeline` + `mostrar-contrato`
  exibindo a trilha, com formatter PT), persistência MySQL (`ctr_timeline_*` + Drizzle + migration),
  e wiring do projetor no `run-outbox-worker`.
- **AuditLog** (Inquiry-0018) — diferido até RBAC.

## Critérios de aceite (passada 1)

- **CA-1:** `toTimelineEntry` mapeia cada um dos 9 eventos de `ContractsModuleEvent` ao `kind`
  correto, preservando `occurredAt` e `actor` (quando o evento carrega).
- **CA-2:** entregar `ContractCreated` ao projetor → `listByContract(contractId)` retorna 1 entrada.
- **CA-3 (resolução):** entregar `AmendmentCreated` e depois `AmendmentHomologated` (sem contractId) →
  ambas as entradas atribuídas ao contrato correto.
- **CA-4 (idempotência):** entregar o mesmo `eventId` 2× → 1 entrada só.
- **CA-5 (ordem):** `listByContract` devolve entradas ordenadas por `occurredAt` ascendente.
- **CA-6 (UC-08):** `getContractTimeline({ contractId })` devolve a trilha; contrato inexistente → trilha vazia (`[]`).
- **CA-7:** entrada não-atribuível (amendment não resolvido) não quebra a entrega (skip idempotente).

## Pipeline

| Wave | Skill/Agente | Gate |
| :--- | :--- | :--- |
| W0 RED | `tdd-strategist` | `pnpm test` |
| W1 GREEN | `ts-domain-modeler` (types+projeção) + `ports-and-adapters` (repo+delivery+use case) | `pnpm test` + `typecheck` |
| W2 REVIEW | `code-reviewer` | `pnpm run lint` |
| W3 QUALITY | `ts-quality-checker` | typecheck + format:check + test + lint |
