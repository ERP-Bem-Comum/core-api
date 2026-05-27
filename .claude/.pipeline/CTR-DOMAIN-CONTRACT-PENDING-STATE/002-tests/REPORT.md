# W0 (RED) — CTR-DOMAIN-CONTRACT-PENDING-STATE

**Skill:** ts-domain-modeler
**Data:** 2026-05-27
**Resultado:** 🔴 RED — 7 testes falham por inexistência de `Contract.createPending`; CA-P5 (regressão) verde.

## Comando

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/contracts/domain/contract/contract-pending.test.ts
# tests 8 · pass 1 · fail 7
```

## Decisão de API (refino W0)

Construtor **separado `Contract.createPending`** em vez de sobrecarregar `create` com `signedAt`
opcional. Razão (registrada no `000-request.md`): preserva 100% o `create → Active` (CA3 trivial,
retorno não vira union) e espelha o agregado `Amendment` (`create` nasce no estado inicial). O
caminho "nascer já Active" segue via `create`; a ponte `Pending → Active` é o próximo ticket.

## Testes adicionados — `tests/modules/contracts/domain/contract/contract-pending.test.ts`

| Teste | Exige no W1 | Estado W0 |
| :--- | :--- | :--- |
| CA-P1 | `createPending` → `PendingContract` (`status:'Pending'`) **sem** `signedAt`/`currentValue`/`currentPeriod`/`homologatedAmendmentIds`; com dados de cadastro | 🔴 |
| CA-P2 | evento `ContractCreated` com `occurredAt = createdAt` (timestamp injetado, não `signedAt`) | 🔴 |
| CA-P3a–e | validações de cadastro (sequentialNumber req/formato, title, objective, originalValue≠0) no `createPending` | 🔴 |
| CA-P5 | regressão: `create` segue produzindo `ActiveContract` com `signedAt` | 🟢 guard (CA3) |

Os 7 RED falham por `Contract.createPending` inexistente (TypeError). CA-P5 é guard de regressão
verde por design — trava o invariante "o caminho Active não muda" durante a introdução do Pending.

## Mapa W1 (ts-domain-modeler)

- `types.ts`: refinar `ContractCore` separando **campos de cadastro** (id, sequentialNumber, title,
  objective, originalValue, originalPeriod) dos **campos de vigência efetiva** (signedAt,
  currentValue, currentPeriod, homologatedAmendmentIds). Novo `PendingContract` (`status:'Pending'`)
  só com cadastro. `Contract` union += `PendingContract`. `ContractStatus` += `'Pending'`.
  Novo input `CreatePendingContractInput` (sem `signedAt`, com `createdAt`).
- `contract.ts`: `createPending(input)` com as validações de cadastro + evento `ContractCreated`
  (`occurredAt = createdAt`). `create` (→ Active) **inalterado**.
- Verificar switches exaustivos sobre `ContractStatus`/`Contract` no domínio (sem `default`).
- Garantia estática (CA1): acesso a `signedAt`/`currentValue` num `PendingContract` deve ser erro
  de compilação — validado no `tsc` do W3.
