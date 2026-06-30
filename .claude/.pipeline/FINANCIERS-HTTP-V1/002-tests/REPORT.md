# W0 — RED — FINANCIERS-HTTP-V1

> Skill: `tdd-strategist`. CRUD de Financiadores (fatia única) espelhando Fornecedores.

## Arquivo criado
- `tests/modules/partners/adapters/http/financiers.routes.test.ts` (reads + cadastro + lifecycle).

## Testes (intenção)
reads: 401/403; POST→lista(search)+GET/:id(detalhe cnpj/legalRepresentative/active); 404/400.
cadastro: 403; 201+Location; 409 cnpj dup; 400 cnpj curto; 422 cnpj DV inválido.
lifecycle: deactivate 200/409; reactivate 200/409; 404.

## Saída literal (`pnpm test`, isolado)
```
SyntaxError: ... does not provide an export named 'FINANCIER_PERMISSION'
ℹ tests 1 · pass 0 · fail 1
```
→ RED correto: FINANCIER_PERMISSION, financiersHttpPlugin e o financier reader/writer no composition não existem.

## Próximo passo
W1 — espelhar o épico supplier: FINANCIER_PERMISSION; FinancierReader (+2 adapters); FinancierListFilter +
financierMatchesFilter; financier-{schemas,dto,list-query,plugin}.ts; composition (reader+writer+use cases+seed); server.ts.
