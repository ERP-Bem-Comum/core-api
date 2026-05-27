# W1 (GREEN) — CTR-DOMAIN-CONTRACT-ACTIVATE

**Skill:** ts-domain-modeler
**Data:** 2026-05-27
**Resultado:** 🟢 GREEN — CA-A1/A2/A3 verdes; gate completo OK (1207 pass).

## Implementação

| Arquivo | Mudança |
| :--- | :--- |
| `domain/contract/events.ts` | `ContractEvent` += `ContractActivated` (`{ type, contractId, occurredAt }`). |
| `domain/contract/contract.ts` | `Contract.activate(pending: PendingContract, signedAt)` → `ActiveContract` (`current = original`, `signedAt`, `homologatedAmendmentIds: []`) + evento `ContractActivated`. Exporta no namespace. Valida `signedAt` (`ContractInvalidSignedAt`). |

## Blast radius — `ContractActivated` é evento PÚBLICO por construção

`ContractsModuleEvent = ContractEvent | AmendmentEvent | DocumentEvent` (`ports/event-bus.ts`).
Adicionar ao `ContractEvent` propagou ao **público**, exigindo tratar o novo evento em todos os
switches exaustivos sobre `ContractsModuleEvent`/`TimelineSourceEvent`:

| Arquivo | Tratamento |
| :--- | :--- |
| `domain/timeline/projection.ts` | case `ContractActivated` (sem actor/aditivo, como `ContractCreated`) |
| `adapters/.../outbox.mapper.ts` | `ContractActivatedPayload` + `serializeEvent` + `deserializeEvent` + `extractAggregateInfo` (type `Contract`) — round-trip completo |
| `public-api/events.ts` | `KNOWN_EVENT_TYPES` += `'ContractActivated'` (guard + decoder v1) |
| `adapters/event-delivery/timeline-projection.delivery.ts` | case no resolvedor de `contractId` |

`ContractActivated` agora serializa/deserializa/projeta como cidadão de 1ª classe do outbox/timeline.
**Nenhum módulo externo (Financeiro) ainda consome** — só a infra trata.

## Gate

```
node --test contract-pending.test.ts (CA-A1/2/3) → GREEN
pnpm run typecheck   → OK
pnpm run format:check → OK
pnpm run lint        → OK
pnpm test            → tests 1223 · pass 1207 · fail 0 · skipped 16
```

CA-A4 (garantia estática: `activate` só aceita `PendingContract`) validada no typecheck — o parâmetro
é `PendingContract` e passar outro estado é erro de compilação.

## Fora deste ticket (próximo da série)

- **Use case `activate-contract`** (application): verifica documento assinado (RN-CV-02), carrega o
  Pending, chama `Contract.activate`, persiste + publica via `save`.
- CLI expondo `activate`.
