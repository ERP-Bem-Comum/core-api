# W1 — GREEN — SUPPLIERS-HTTP-REGISTER (S2)

> Skill: `ports-and-adapters`. POST de cadastro de fornecedor (writer pool).

## Arquivos editados
- `adapters/http/composition.ts` — supplier writer repo (memory `makeInMemorySupplierStore` / mysql `createDrizzleSupplierStore`) + `registerSupplier`.
- `adapters/http/supplier-schemas.ts` — `createSupplierBodySchema` (cnpj[14], serviceCategory, bankAccount/pixKey input nullable default null).
- `adapters/http/supplier-plugin.ts` — `POST /suppliers` (201+Location) + helper `writeErrorStatus`/`sendWriteError` (409/404/400/422/503).

## Decisões
- Espelha P2 colaboradores (201 + Location; sem corpo).
- Invariante "ao menos um payment target" é do domínio → 422 (`supplier-payment-target-required`); Zod aceita ambos null.
- cnpj `z.string().length(14)`: shape errado → 400; 14-díg DV inválido → 422 (domínio).

## Saída literal do gate
`tsc` zero · `prettier` clean · `eslint` zero ·
```
ℹ tests 2058
ℹ pass 2041
ℹ fail 0
ℹ skipped 17
```
Teste S2 isolado: 7 · pass 7 · fail 0.
→ GREEN: zero regressão (2041 = 2034 + 7 novos).

## Próximo passo
W2 (REVIEW).
