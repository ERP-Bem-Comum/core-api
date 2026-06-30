# 004 — W2 (code-review) — CTR-HTTP-CANCEL-PENDING

Audit read-only por `drizzle-orm-expert` (persistência/CHECKs) + `typescript-language-expert`
(soundness + exaustividade do 5º estado). Round 1.

## Veredito: **APPROVED**

Zero BLOCKER, MAJOR, MINOR. Só NITs cosméticos, nenhum regressivo.

## drizzle-orm-expert — APPROVED

Verificou os 3 CHECKs estado-a-estado (tabela-verdade completa dos 5 estados): `status_chk`,
`ended_at_consistency` (`Cancelled` ∈ terminais-com-endedAt) e `pending_consistency` (`Pending`/
`Cancelled` ⟺ vigência NULL) — todos corretos e **mutuamente consistentes** para `Cancelled`
(ended_at NOT NULL + vigência NULL simultâneos, sem contradição). Migration `0011` com sintaxe MySQL
8.4 correta (DROP+ADD, sem CREATE → sem hardening). `contractToInsert`/`contractFromRow` round-trip
correto; switch final mantém exaustividade após Pending/Cancelled retornarem early. Outbox
`ContractCancelled` round-trip e `aggregate_type='Contract'` ok.

NITs (não aplicados — cosméticos/pré-existentes):
- `terminationReason` omitido no branch Pending|Cancelled (→ NULL, correto) vs explícito no efetivo.
- guard de profundidade do mapper não checa `currentPeriodStart` (igual ao branch Pending existente;
  o CHECK `pending_consistency` no banco cobre).

## typescript-language-expert — APPROVED

`CancelledContract` estrutural correto (estende só `ContractRegistration`, não `EffectiveContractCore`).
`cancel(PendingContract, at)` garante a regra em compile-time; spread não vaza campos efetivos.
**Varredura exaustiva** dos pontos de enumeração de `ContractStatus`/`ContractEvent['type']`,
separando os que o `tsc`/ESLint forçam (switches sem default, `Record`) dos **buracos silenciosos**
que o compilador NÃO pega (Set/Record-literal/Zod discriminatedUnion/CHECK SQL): TODOS cobertos com
`Cancelled` — `cli/state.ts CONTRACT_STATUSES` + shape, `KNOWN_STATUSES`, Zod (list-item/detail/filtro),
`KNOWN_EVENT_TYPES`, `deserializeEvent`, timeline delivery. **Zero holes.**

Confirmações úteis (não-achados):
- `contract-not-pending` (kebab) em CONFLICT_CODES NÃO é morto — `activate-contract.ts` ainda o emite;
  coexiste com o tag `ContractNotPending` (cancel). Ambos → 409. Manter.
- `EffectiveContract` é tipo exportado órfão **pré-existente** (não relacionado a Cancelled) —
  housekeeping futuro, fora de escopo.

## Decisão de promoção

APPROVED round 1. NITs documentados, nenhum aplicado (cosméticos/pré-existentes; evitar churn).
Promove para W3.
