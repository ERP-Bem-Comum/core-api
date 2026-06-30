# W0 RED — CTR-AMENDMENT-CHRONOLOGY-R4

> **Skill:** `tdd-strategist` · **Outcome:** RED · **Data:** 2026-05-25

## Objetivo da wave

Descrever R4 (cronologia do aditivo) como teste do use case `homologateAmendment`:
rejeitar quando `amendment.createdAt < contract.signedAt`.

## Arquivo criado

- `tests/modules/contracts/application/use-cases/homologate-amendment.r4-chronology.test.ts`

**Não-tocado:** `src/`.

## Saída literal do gate (`node --test`)

```
✖ homologateAmendment — R4 cronologia (createdAt vs signedAt)
ℹ tests 3
ℹ suites 1
ℹ pass 2
ℹ fail 1
✖ failing tests:
✖ CA-1: rejeita aditivo com createdAt anterior ao signedAt do contrato
```

- **CA-1 (RED):** sem enforcement de R4, a homologação retroativa **passa** → a asserção
  `r.error === 'amendment-retroactive-to-contract-start'` falha. Este é o teste que dirige a impl.
- **CA-2/CA-3 (já verdes):** guardam o caminho feliz (igualdade e posterior homologam normalmente) —
  garantem que a impl não vai sobre-rejeitar.

## Próximo passo

W1 GREEN — skill `ports-and-adapters`: guard R4 em `homologate-amendment.ts` +
erro no union + string PT em `error.ts`.
