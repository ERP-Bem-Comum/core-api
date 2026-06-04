# W0 — RED — SUPPLIERS-HTTP-READS (S1)

> Skill: `tdd-strategist`. Reads de Fornecedores espelhando P1a/P1b de colaboradores.

## Arquivo criado
- `tests/modules/partners/adapters/http/suppliers-reads.routes.test.ts`

## Testes (intenção)
GET /suppliers: 401 · 403 · 200 meta legado + item detalhe (legacyId/cnpj/serviceCategory/active) ·
filtros categories/active/search. GET /:id: 200 (cnpj normalizado 14 díg + serviceCategory) · 404 · 400.
Composition: seed.suppliers + getSupplierById + listSupplierRecords.

## Saída literal (`pnpm test`, isolado)
```
SyntaxError: ... does not provide an export named 'SUPPLIER_PERMISSION'
✖ tests/modules/partners/adapters/http/suppliers-reads.routes.test.ts 'test failed'
```
→ RED correto: `SUPPLIER_PERMISSION`, `suppliersHttpPlugin`, `supplier-reader` e seed.suppliers não existem.

## Próximo passo
W1 — `ports-and-adapters`: SUPPLIER_PERMISSION; SupplierReader (+2 adapters); SupplierListFilter +
supplierMatchesFilter; supplier-{schemas,dto,list-query,plugin}.ts; composition supplier reads; server.ts.
