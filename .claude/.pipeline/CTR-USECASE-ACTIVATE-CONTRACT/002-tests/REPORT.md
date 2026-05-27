# W0 (RED) — CTR-USECASE-ACTIVATE-CONTRACT

**Skill:** tdd-strategist
**Data:** 2026-05-27
**Resultado:** 🔴 RED — `ERR_MODULE_NOT_FOUND` (`use-cases/activate-contract.ts` inexistente).

## Comando

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/contracts/application/use-cases/activate-contract.test.ts
# falha no import (módulo não existe) — todos os CAs falham até o W1
```

## Testes adicionados — `activate-contract.test.ts`

Fakes InMemory (contractRepo + documentRepo + outbox + ClockFixed), fixture `seedPending`
(`Contract.createPending`) e `signedContractDoc` (`Document.create` categoria `signed_contract`,
parentType `Contract`).

| Teste | Exige no W1 | W0 |
| :--- | :--- | :--- |
| CA1 | Pending + doc `signed_contract` Active → `activateContract` ativa, persiste, retorna `ActiveContract` | 🔴 |
| CA2a | contrato inexistente → `'contract-not-found'` | 🔴 |
| CA2b | contrato não-`Pending` (Active) → `'contract-not-pending'` (narrowing inline na union) | 🔴 |
| CA3 | sem doc `signed_contract` Active → `'activate-contract-no-signed-document'` (via `documentRepo.findByParent('Contract', contractId)`) | 🔴 |

> Detalhe confirmado: `findByParent(parentType, parentId)` — ordem (tipo, id).

CA4 (signedAt inválido) e CA5 (evento publicado pós-save) ficam para o W1 detalhar; os 4 acima são
os REDs dirigentes.

## Mapa W1

- `application/use-cases/activate-contract.ts`: factory `(deps) => (cmd) => Promise<Result>`.
  Sequência: parse `contractId`/`signedAt` → `contractRepo.findById` → narrowing `Pending`
  (`status !== 'Pending'` → `'contract-not-pending'`) → `documentRepo.findByParent('Contract', id)`
  + verifica `signed_contract` Active (senão `'activate-contract-no-signed-document'`) →
  `Contract.activate(pending, signedAt)` → `contractRepo.save(active, [event])`.
- Deps: `contractRepo`, `documentRepo`, `clock`.
