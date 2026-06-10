# 000 — Request CTR-HTTP-CANCEL-PENDING

> Origem: `handbook/tickets/todo/CTR-HTTP-CANCEL-PENDING.md` (handoff do front web-app v2).
> Permitir **cancelar** (soft-delete) um contrato **Pendente** via `DELETE /contracts/:id`.
> Contratos já efetivados (Active/Expired/Terminated) permanecem imutáveis. Size M.

## Decisões de modelagem (pipeline + aval do humano, 2026-06-09)

- **D1 — Novo estado terminal `Cancelled` (5º estado).** Espelha `Terminated`/`Expired` em ter
  `endedAt`, mas nasce de `PendingContract` → carrega só `ContractRegistration` (sem `signedAt`/
  vigência efetiva). Rejeitada a alternativa "flag de soft-delete" (reintroduz optional-as-state,
  anti-padrão eliminado pelo domínio). Cf. ADR-0039 (estende ADR-0023).
- **D2 — Evento próprio `ContractCancelled`** (`{ type, contractId, occurredAt }`). Timeline usa
  `kind: event.type` → marcador "Cancelado" correto (CA-4). Consumidores (Financeiro) ignoram drafts
  cancelados sem special-case. Rejeitado estender `ContractEnded(kind:'Cancelled')` (timeline mostraria
  "Encerrado"). Aditivo ao schema v1 (não quebra consumers — public-api §"Schema version").
- **D3 — `DELETE /contracts/:id`** (ação "Excluir" do front): Pending → **200** (corpo = contrato
  cancelado); não-Pending → **409** `contract-not-pending` (conflito de estado, não 405); inexistente
  → **404**; auth `contract:write`. Substitui o atual 405 incondicional `contract-delete-forbidden`.
- **D4 — ADR-0039** documenta o 5º estado (accepted) + entrada no CHANGELOG. Exclusão FÍSICA permanece
  proibida (a rota não apaga row; faz transição de estado).

## Critérios de Aceitação

1. Cancelar contrato **Pendente** → 200; contrato fica `Cancelled` (soft), não é exclusão física.
2. Cancelar contrato **não-Pendente** (Active/Expired/Terminated/Cancelled) → 409 `contract-not-pending`.
3. `contract:write`; contrato inexistente → 404; id malformado → 400 (Zod no param).
4. Evento `ContractCancelled` publicado no outbox (auditoria/timeline).

## Superfície de mudança (mapeada)

- **Domínio:** `types.ts` (`CancelledContract` + união + `ContractStatus`), `contract.ts`
  (`cancel` + `parsePending`), `events.ts` (`ContractCancelled`), `errors.ts` (`ContractNotPending`).
- **Persistência:** `schemas/mysql.ts` (CHECK `status` + `ended_at` + `pending_consistency` incluem
  `Cancelled`), migration nova (ALTER dos 3 CHECKs), `mappers/contract.mapper.ts` (row↔`Cancelled`),
  `mappers/outbox.mapper.ts` (payload + serialize + deserialize + `extractAggregateInfo`).
- **public-api:** `events.ts` (`KNOWN_EVENT_TYPES` += `ContractCancelled`).
- **Application:** novo use case `cancel-contract.ts`.
- **Timeline:** `domain/timeline/projection.ts` + `domain/timeline/types.ts` (caso `ContractCancelled`).
- **Borda HTTP:** `plugin.ts` (handler DELETE reescrito), `schemas.ts` (DTO `Cancelled` no list-item +
  detail + filtro de status), `contract-dto.ts` (serialização), `contracts-csv.ts`.
- **CLI:** `cli/formatters/contract.ts`, `cli/state.ts` (status enum).
- **ADR/handbook:** `adr/0039-*`, `CHANGELOG.md`, `gestao-contratos.md` (máquina 5 nós).

## Fora de escopo

- Exclusão física (permanece proibida). Cancelar contrato já efetivado. "Descancelar".

## Fechamento

W0 RED → W1 GREEN → W2 (drizzle-orm-expert + typescript-language-expert) → W3 (typecheck/format/lint/
test + integração escopada) → close. Mover ticket `todo/` → `done/`.
