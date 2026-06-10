# 003 — W1 (impl) — CTR-HTTP-CANCEL-PENDING

5º estado `Cancelled` (ADR-0039): `DELETE /contracts/:id` cancela (soft-delete) contrato `Pending`.

## Mudanças por camada

### Domínio
- `types.ts`: `CancelledContract` (= `ContractRegistration` + `endedAt`, sem vigência efetiva) +
  união + comentário de transições.
- `contract.ts`: `parsePending` (refinement) + `cancel` (Pending → Cancelled + evento). Namespace.
- `events.ts`: evento `ContractCancelled`.
- `errors.ts`: `ContractNotPending` (tagged, carrega `currentStatus`) + constructor + união.

### Persistência
- `schemas/mysql.ts`: 3 CHECKs incluem `Cancelled` — `status`, `ended_at_consistency`
  (`Cancelled` ∈ terminais com endedAt), `pending_consistency` (`Pending`/`Cancelled` ⟺ vigência NULL).
- Migration `0011_kind_tigra.sql` (ALTER DROP+ADD dos 3 CHECKs).
- `mappers/contract.mapper.ts`: `KNOWN_STATUSES += Cancelled`; `contractToInsert` (Pending|Cancelled
  registration-only, endedAt só p/ Cancelled); `contractFromRow` (branch Cancelled).
- `mappers/outbox.mapper.ts`: payload + `extractAggregateInfo` + serialize + deserialize do
  `ContractCancelled`.

### public-api + timeline
- `public-api/events.ts`: `KNOWN_EVENT_TYPES += ContractCancelled`.
- `domain/timeline/projection.ts` + `adapters/event-delivery/timeline-projection.delivery.ts`: caso
  `ContractCancelled` (timeline kind = 'ContractCancelled' → "Cancelado").

### Application + borda HTTP
- `application/use-cases/cancel-contract.ts` (novo): rehydrate → fetch → parsePending → cancel → save.
- `adapters/http/composition.ts`: wire `cancelContract` (writer pool + clock).
- `adapters/http/plugin.ts`: handler DELETE reescrito (200/409/404); `CONFLICT_CODES += ContractNotPending`.
- `adapters/http/{schemas,contract-dto,contracts-csv}.ts`: variante `Cancelled` (list-item + detail +
  filtro de status + DTO + CSV).

### CLI + handbook
- `cli/formatters/{status,contract}.ts`: label "Cancelado" + branch de exibição.
- `cli/state.ts`: allowlist `CONTRACT_STATUSES += Cancelled` + shape de desserialização (registration + endedAt).
- `handbook/.../gestao-contratos.md`: máquina 5 nós + StatusContrato + RN-CV-03; ADR-0039 + CHANGELOG.

## Testes ajustados
- `patch-contract-metadata.routes.test.ts`: "DELETE → 405 forbidden" → "DELETE de Active → 409 não-cancelável".
- `homologate-amendment.test.ts`: narrowing exclui `Cancelled` além de `Pending`.

## Resultado
- W0 (3 arquivos cancel): **GREEN**.
- Suíte completa: **2673 pass / 0 fail / 19 skipped** (2692 total).
- typecheck ✓ · format:check ✓ · lint ✓ (corrigido switch exaustivo em timeline-projection.delivery).

Integração (CHECKs + round-trip Cancelled) será validada no W3 contra MySQL real.
Próximo: W2 (drizzle-orm-expert + typescript-language-expert).
