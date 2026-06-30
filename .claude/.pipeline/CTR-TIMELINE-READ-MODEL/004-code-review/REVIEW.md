# W2 REVIEW — CTR-TIMELINE-READ-MODEL (passada 1)

> **Skill:** `code-reviewer` · **Veredito:** ✅ APPROVED · **Round:** 1/3 · **Data:** 2026-05-26

## Escopo auditado

- `domain/timeline/{types,projection,repository}.ts`
- `adapters/persistence/repos/timeline-repository.in-memory.ts`
- `adapters/event-delivery/timeline-projection.delivery.ts`
- `application/use-cases/get-contract-timeline.ts`

## Audit log

| Regra | Verificação | OK |
| :--- | :--- | :--- |
| Fidelidade ao ADR-0022 | read-model projetado; outbox=log; sem event-store novo; colunas decompostas (sem JSON) | ✅ |
| Camadas: domain não importa application | `TimelineSourceEvent` montado dos eventos de domínio (não de `ContractsModuleEvent`) | ✅ |
| projeção pura, sem `throw`/`class` | `toTimelineEntry` é função pura; switch exaustivo sem default | ✅ |
| exhaustividade sobre os 9 eventos | `toTimelineEntry` e resolução no `deliver` cobrem todos os `type` | ✅ |
| idempotência (ADR-0022) | `append` ignora `eventId` repetido | ✅ |
| ordem cronológica | `listByContract` ordena por `occurredAt` | ✅ |
| evento não-atribuível não quebra | `deliver` faz skip (CA-7), retorna `ok` | ✅ |
| projetor é `EventDelivery` (reusa caminho existente) | `consumerId: 'timeline'`, sem novo write-path de domínio | ✅ |
| use case = factory `(deps)=>(cmd)=>Promise<Result>` | `getContractTimeline` conforme | ✅ |
| casts justificados | `parentId as ContractId/AmendmentId` sob guarda `parentType`, comentado | ✅ |
| `actor` best-effort documentado | só eventos com UserRef; trilha completa depende de RBAC (Inquiry-0018) | ✅ |
| módulo isolation (ADR-0014) | só `contracts/` (`ctr_` quando MySQL chegar, pass 2) | ✅ |

## Observações (não-bloqueantes)

- `findContractIdByAmendment` depende da ordem do stream (AmendmentCreated antes da homologação) — garantida pelo outbox ordenado; CA-7 cobre o caso degenerado.
- Persistência real (`ctr_timeline_*`), CLI e UC-02 ficam para a pass 2.

## Gate

```
> eslint .
(zero erros)
```

## Veredito

**APPROVED** — segue para W3.
