# Code Review — CTR-DOMAIN-CONTRACT-ACTIVATE — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-27
**Escopo revisado:** `contract.ts`, `events.ts`, `timeline/projection.ts`, `outbox.mapper.ts`, `public-api/events.ts`, `event-delivery/timeline-projection.delivery.ts`, `contract-pending.test.ts`.

---

## Conformidade

- ✅ **`Contract.activate`** sem `throw`/`class`/`any`; retorna `Result`. Constrói `ActiveContract`
  via `{ ...pending, status: 'Active', current = original }` — `endedAt` ausente (correto). Tipo do
  parâmetro `PendingContract` garante estaticamente a transição válida (CA4) — espelha `expire`/`terminate`.
- ✅ **`occurredAt = signedAt`** no `ContractActivated`, coerente com `ContractCreated`. Na timeline,
  `ContractCreated` (createdAt) precede `ContractActivated` (signedAt) — ordem temporal correta.
- ✅ **Round-trip simétrico do evento:** `serializeEvent` **e** `deserializeEvent` ganharam o case
  (mesmo shape de `ContractCreated`); `extractAggregateInfo` (type `Contract`); `KNOWN_EVENT_TYPES`;
  projeção timeline + delivery. `ContractActivated` é cidadão de 1ª classe do outbox/timeline.
- ✅ Switches exaustivos atualizados (timeline projection — `noFallthroughCasesInSwitch`; delivery —
  eslint `switch-exhaustiveness-check`). Gate read-only: typecheck/format/lint OK; CA-A1/2/3 GREEN.

## 🟡 Cobertura → ENDEREÇADA (2026-05-27, a pedido do usuário)

- Adicionados: **round-trip do `ContractActivated` no outbox** (`outbox.mapper.test.ts` —
  serialize→row→deserialize) e **projeção timeline** (`projection.test.ts` — kind/actor/subject).
  Ambos GREEN; gate verde. Lacuna fechada neste ticket; veredito permanece **APPROVED**.

## Nota arquitetural

`ContractsModuleEvent = ContractEvent | …` (acoplamento por construção): **todo** evento novo de
domínio vira público e exige tratamento na infra (outbox serialize/deserialize/extract, timeline,
decoder). Não é defeito — é o contrato do módulo; mas explica o blast radius de um ticket "S".

## Próximo passo

**APPROVED → W3.** A lacuna 🟡 de cobertura fica registrada para o ticket de use case `activate-contract`.
