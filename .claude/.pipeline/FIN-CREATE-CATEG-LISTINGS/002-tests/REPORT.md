# W0 — Testes RED (FIN-CREATE-CATEG-LISTINGS)

Skill: `tdd-strategist`. RED por inexistência da API de `costCenterRef`.

## Testes escritos

1. `tests/modules/financial/application/use-cases/save-document.test.ts` (+2):
   - `#147: persiste costCenterRef informado no comando` — falha: `document.costCenterRef` é `undefined`.
   - `#147: rejeita costCenterRef com formato inválido` — falha: comando não valida (retorna ok).
2. `tests/modules/financial/adapters/http/create-categorization-refs.http.test.ts` (novo, 3):
   - `CA1+CA2` create Open com `costCenterRef` → GET ecoa `categoryRef/costCenterRef/programRef/budgetPlanRef` — falha: detail não expõe os refs.
   - `CA1` create Draft com `costCenterRef` → GET ecoa — falha idem.
   - `CA1.err` `costCenterRef` malformado → 400 — falha: borda aceita (201; schema descarta campo desconhecido).

## Saída (RED)

- use-case: `actual: undefined, expected: 'cccc...'` e `false !== true`.
- http: `actual: undefined` no detail; `201 !== 400` na ref malformada.

Conforme esperado: nenhum `src/` tocado. Próximo: W1 implementa até GREEN.
