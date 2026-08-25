---
name: contract-status-enumeration-sites
description: Lista canônica dos pontos que enumeram ContractStatus/ContractEvent no módulo contracts — quais o compilador força e quais são buracos silenciosos (Set/Record/Zod/CHECK SQL)
metadata:
  type: project
---

Ao adicionar um novo `ContractStatus` (estado refinado do agregado `Contract`) ou um novo `ContractEvent['type']`, estes são TODOS os pontos que precisam ser tocados. Levantado na auditoria W2 do CTR-HTTP-CANCEL-PENDING (5º estado `Cancelled`, ADR-0039).

**Why:** o `tsc` (`noFallthroughCasesInSwitch` + exhaustiveness) pega switches sobre a union, mas NÃO pega allowlists em runtime (Set/Record string-keyed, Zod enums, CHECK SQL). Esses são buracos silenciosos — passam o typecheck verdes e falham só em runtime/integração.

**How to apply:** ao revisar um ticket que adiciona estado/evento, faça `grep` por um valor existente (ex.: `'Terminated'`, `'ContractEnded'`) em `src/` e cheque cada hit contra esta lista.

Pontos que o COMPILADOR força (switch exaustivo sobre a union, sem `default`):
- `adapters/http/contract-dto.ts` `contractToListItem` switch(c.status)
- `adapters/http/contracts-csv.ts` `cellsFor` switch(dto.status)
- `adapters/persistence/mappers/contract.mapper.ts` switch(row.status) final (Active|Expired|Terminated) + branches early-return para Pending/Cancelled
- `adapters/persistence/mappers/outbox.mapper.ts` `serializeEvent` switch(event.type) — exaustivo sem default; `extractAggregateInfo` idem
- `cli/formatters/status.ts` `Record<ContractStatus, string>` STATUS_LABELS — Record força exaustividade
- `domain/timeline/projection.ts` `toTimelineEntry` switch(event.type)

Pontos que o compilador NÃO pega (buracos silenciosos — revisar manualmente):
- `cli/state.ts` `CONTRACT_STATUSES` = `new Set<ContractStatus>([...])` (allowlist de desserialização) + branch shape por status em `isValidContract`
- `adapters/persistence/mappers/contract.mapper.ts` `KNOWN_STATUSES` array `as const` + guard `isStatus`
- `adapters/http/schemas.ts` Zod: `contractListItemSchema` + `contractFullDetailSchema` (discriminatedUnion por status) + filtro `status: z.enum([...])`
- `adapters/persistence/schemas/mysql.ts` 3 CHECKs: `status_chk` (lista de estados), `pending_consistency_chk` (registration-only: Pending|Cancelled), `ended_at_consistency_chk` (terminais com endedAt: Expired|Terminated|Cancelled). Migration ALTER correspondente.
- `public-api/events.ts` `KNOWN_EVENT_TYPES` Set (allowlist do type guard) — para eventos novos
- `adapters/persistence/mappers/outbox.mapper.ts` `deserializeEvent` switch(eventType: string) com `default` → unknown-event-type (eventos novos)
- `adapters/event-delivery/timeline-projection.delivery.ts` switch(event.type) de resolução de contractId

Padrão estrutural relevante: `CancelledContract` estende só `ContractRegistration` (registration-only, como Pending) + `endedAt`, NÃO `EffectiveContractCore`. Distingue-o de Expired/Terminated. Narrowings `c.status !== 'Active'` que acessam `c.endedAt` ficam sound porque Pending/Cancelled retornam early antes.

---

ANÁLOGO PARA O AGREGADO `Amendment` (3 estados: PendingWithoutDocument / PendingWithDocument / Homologated; discriminador composto status + signedDocumentRef===null). Ao adicionar/mudar campo per-estado do Amendment (ex.: `signedAt` no CTR-AMENDMENT-SIGNEDAT-AND-NUMBER), checar TODOS:

Pontos que o compilador FORÇA (switch exaustivo / DTO tipado):
- `domain/amendment/amendment.ts` — refinement constructors + transições (tipos refinados pegam shape errado)
- `adapters/http/amendment-dto.ts` `amendmentToDto` — switch(a.kind); `signedAt` via narrowing `a.signedDocumentRef === null ? null : a.signedAt`
- `adapters/persistence/mappers/amendment.mapper.ts` `amendmentToInsert` (switch kind) + `amendmentFromRow` (switch status + sub-branch signedDocumentRef===null) — round-trip por estado, defesa em profundidade

Pontos que o compilador NÃO pega (buracos silenciosos):
- `cli/state.ts` `isValidAmendment` — validador shape-by-status do state file JSON. **NÃO valida `signedAt`** (gap achado na auditoria W2 de CTR-AMENDMENT-SIGNEDAT-AND-NUMBER): aceita Pending-with-doc/Homologated sem `signedAt` e aceita PendingWithoutDocument COM `signedAt` — assimétrico vs. o `amendment.mapper.ts` que rejeita ambos via `amendmentMapperImpossibleShape`. Silencioso porque `state.test.ts` nunca exercita amendment com documento. Também `DATE_KEYS` Set em state.ts (precisa conter o novo campo Date — `signedAt` JÁ ESTAVA lá).
- `cli/state.ts` `AMENDMENT_STATUSES` Set (`Pending`/`Homologated`) + `AMENDMENT_KINDS` Set
- `adapters/persistence/schemas/mysql.ts` CHECK `ctr_amendments_signed_at_consistency_chk` (`signed_at IS NOT NULL = signed_document_ref IS NOT NULL`) + `homologation_completeness_chk` + coluna `signed_at`. Migration ALTER.
- `adapters/persistence/mappers/amendment.mapper.ts` `KINDS`/`STATUSES` arrays + guards `isKind`/`isStatus`
- `adapters/http/schemas.ts` Zod: `amendmentSchema`/`amendmentDtoShape` (`signedAt` nullable), `createAmendmentBodySchema` (G3: SEM `amendmentNumber`), `amendmentDocumentUploadQuerySchema` (extend com `signedAt`)

Lição recorrente: o `cli/state.ts isValidAmendment` é o ponto que mais frequentemente fica para trás quando um campo per-estado do Amendment muda. É a contraparte do `amendment.mapper.ts` para o backend `memory`, mas sem testes que o exercitem em estados com documento.
