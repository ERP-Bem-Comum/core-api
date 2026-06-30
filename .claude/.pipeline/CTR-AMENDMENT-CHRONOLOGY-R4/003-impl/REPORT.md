# W1 GREEN — CTR-AMENDMENT-CHRONOLOGY-R4

> **Skill:** `ports-and-adapters` · **Outcome:** GREEN · **Data:** 2026-05-25

## Arquivos editados

| Arquivo | Ação |
| :--- | :--- |
| `src/modules/contracts/application/use-cases/homologate-amendment.ts` | guard R4 (passo 4b) + erro no union `HomologateAmendmentError` |
| `src/modules/contracts/cli/formatters/error.ts` | string PT-BR para `amendment-retroactive-to-contract-start` |

## Implementação (mínima)

```ts
// 4b. R4 cronologia (04-aditivos-context.md:86)
if (amendment.createdAt.getTime() < contract.signedAt.getTime()) {
  return err('amendment-retroactive-to-contract-start');
}
```

- Posicionado **após** mismatch check, **antes** de `parsePendingWithDocument` — fail-fast,
  sem efeito colateral (nada persistido, outbox intacto).
- Igualdade (`createdAt === signedAt`) passa (operador `<`).
- Consistente com o guard `amendment-contract-mismatch` no mesmo use case.

## Saída literal dos gates

`node --test` (R4 + regressão do homologate):

```
ℹ tests 23
ℹ pass 23
ℹ fail 0
```

`pnpm test` (suíte completa, +3 testes R4, zero regressão):

```
ℹ tests 1123
ℹ pass 1107
ℹ fail 0
ℹ skipped 16
```

`pnpm run typecheck`: zero erros.

## Próximo passo

W2 REVIEW — `code-reviewer`.
