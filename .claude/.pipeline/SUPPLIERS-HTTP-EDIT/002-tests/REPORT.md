# W0 — RED — SUPPLIERS-HTTP-EDIT

> Skill: `tdd-strategist`. Edição (PUT) de Fornecedor; vital=cnpj; payment-target editável via write.

## Arquivo criado
- `tests/modules/partners/adapters/http/suppliers-edit.routes.test.ts`

## Testes (intenção)
401; 403 sem write; 400 :id / 404; 200 write sem mudar cnpj (muda name + troca bank→pix);
403 write mudando cnpj; 200 director mudando cnpj + 409 cnpj novo já usado; 422 sem payment target;
422 email inválido; 400 cnpj curto.

## Saída literal (`pnpm test`, isolado)
```
ℹ tests 7 · pass 0 · fail 7
```
→ RED correto: PUT, editSupplier, hasPermission no SuppliersHttpHooks e updateSupplierBodySchema não existem.

## Próximo passo
W1: Supplier.edit + SupplierEdited + EditSupplierInput; editSupplier (regra do vital); updateSupplierBodySchema;
composition (editSupplier); supplier-plugin (hasPermission + PUT); server.ts (hasPermission).
