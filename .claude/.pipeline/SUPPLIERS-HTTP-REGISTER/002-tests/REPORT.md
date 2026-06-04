# W0 — RED — SUPPLIERS-HTTP-REGISTER (S2)

> Skill: `tdd-strategist`. POST de cadastro de fornecedor (writer pool).

## Arquivo criado
- `tests/modules/partners/adapters/http/suppliers-register.routes.test.ts`

## Testes (intenção)
POST /suppliers: 401 · 403 · 201+Location (body válido com payment target) · 409 cnpj duplicado ·
400 cnpj curto (Zod) · 422 cnpj DV inválido (domínio) · 422 sem payment target (invariante).

## Saída literal (`pnpm test`, isolado)
```
ℹ tests 7
ℹ pass 0
ℹ fail 7
```
→ RED correto: rota POST /suppliers e `registerSupplier` no composition não existem.

## Próximo passo
W1 — `ports-and-adapters`: supplier writer repo + registerSupplier no composition;
`createSupplierBodySchema`; POST /suppliers (201+Location) + helper writeErrorStatus/sendWriteError.
