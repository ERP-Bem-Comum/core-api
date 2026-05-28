# W0 (RED) — CTR-DOMAIN-CONTRACT-ACTIVATE

**Skill:** tdd-strategist
**Data:** 2026-05-27
**Resultado:** 🔴 RED — 3 testes falham por `Contract.activate is not a function`.

## Comando

```bash
node --test --experimental-strip-types --no-warnings \
  --test-name-pattern="CA-A[123]" tests/modules/contracts/domain/contract/contract-pending.test.ts
# tests 3 · pass 0 · fail 3
```

## Testes adicionados — `contract-pending.test.ts` (describe `Contract.activate`)

| Teste | Exige no W1 | W0 |
| :--- | :--- | :--- |
| CA-A1 | `activate(pending, signedAt)` → `ActiveContract` com `signedAt`, `currentValue = originalValue`, `currentPeriod = originalPeriod`, `homologatedAmendmentIds: []`; cadastro preservado | 🔴 |
| CA-A2 | `signedAt` inválido → `ContractInvalidSignedAt` | 🔴 |
| CA-A3 | emite `ContractActivated` (`occurredAt = signedAt`, `contractId`) | 🔴 |

Fixture `buildPending()` via `Contract.createPending` (já existe). Todos os 3 falham por
`Contract.activate` inexistente (TypeError) — RED por inexistência da API.

CA-A4 (garantia estática: `activate` só aceita `PendingContract`) é validada no `tsc` do W3 — o W1
tipa o parâmetro como `PendingContract`, e passar `ActiveContract` vira erro de compilação.

## Mapa W1

- `events.ts`: `ContractEvent` += `ContractActivated` (`{ type, contractId, occurredAt }`).
- `contract.ts`: `Contract.activate(pending: PendingContract, signedAt: Date)` — valida `signedAt`,
  constrói `ActiveContract` (`current = original`), emite `ContractActivated`. Exporta no namespace.
- Verificar `switch` exaustivos sobre `ContractEvent` (mappers de evento/timeline/outbox) — atualizar
  se algum quebrar com o novo membro.
