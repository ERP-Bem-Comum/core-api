# W0 — RED — FINANCIERS-HTTP-EDIT

> Skill: `tdd-strategist`. Piloto de edição (PUT) com RBAC elevado p/ campo vital.

## Arquivo criado
- `tests/modules/partners/adapters/http/financiers-edit.routes.test.ts`

## Testes (intenção)
401; 403 sem write; 400 :id não-UUID; 404 inexistente; 200 write sem mudar cnpj; **403 write mudando
cnpj** (sensitive-forbidden); 200 director mudando cnpj; 409 cnpj novo duplicado; 422 name vazio; 400 cnpj curto.

## Saída literal (`pnpm test`, isolado)
```
ℹ tests 9 · pass 1 · fail 8
```
→ RED correto: PUT, editFinancier, hasPermission (auth) e updateFinancierBodySchema não existem. (O 1 verde é o 404 por rota inexistente.)

## Próximo passo
W1: Financier.edit (domínio) + FinancierEdited; editFinancier (use case, regra do vital); makeHasPermission (auth) + AuthHttpDeps.hasPermission; updateFinancierBodySchema; PUT no plugin + hook hasPermission; server.ts.
