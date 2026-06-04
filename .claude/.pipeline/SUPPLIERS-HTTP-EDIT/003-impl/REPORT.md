# W1 — GREEN — SUPPLIERS-HTTP-EDIT

> Skill: `ports-and-adapters` + domínio. Replica o piloto Financier para Supplier (vital=cnpj).

## Arquivos criados
- `domain/supplier/supplier.ts` (M) — `Supplier.edit` (revalida como register; preserva id+estado).
- `domain/supplier/events.ts` (M) — `SupplierEdited`; `types.ts` (M) — `EditSupplierInput`.
- `application/use-cases/edit-supplier.ts` — regra do vital (cnpj) + payment-target não-vital.

## Arquivos editados
- `adapters/http/supplier-schemas.ts` — `updateSupplierBodySchema` (= create).
- `adapters/http/composition.ts` — expõe `editSupplier`.
- `adapters/http/supplier-plugin.ts` — `SuppliersHttpHooks.hasPermission`; `PUT /suppliers/:id`; FORBIDDEN/edit codes.
- `src/server.ts` — passa `authDeps.hasPermission` ao suppliersHttpPlugin.
- `tests/.../suppliers-{reads,register,lifecycle}.routes.test.ts` — makeApp passa `hasPermission` (hook agora obrigatório).

## Decisões
- Reusa `makeHasPermission` (criado no piloto Financier). Payment-target editável via `supplier:write` (não-vital); CNPJ vital → `supplier:edit-sensitive`. Regra no use case.

## Saída literal do gate (encadeado, exit 0)
```
$ tsc / prettier / eslint → verdes
ℹ tests 2089 · pass 2072 · fail 0 · skipped 17
```
Teste edit isolado: 7 · pass 7 · fail 0.
→ GREEN: zero regressão (2072 = 2065 + 7 novos).

## Próximo passo
W2 (REVIEW).
