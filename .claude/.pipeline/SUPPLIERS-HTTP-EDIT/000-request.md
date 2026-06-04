# Ticket SUPPLIERS-HTTP-EDIT: edição cadastral (PUT) de Fornecedor com RBAC elevado

> `EPIC-PARTNERS-HTTP-EDIT`. Replica o piloto Financier para Supplier. Vital = `cnpj`. Reusa `makeHasPermission`.

## Contexto

Espelha FINANCIERS-HTTP-EDIT. Supplier tem payment-target (bankAccount/pixKey) **editável via `supplier:write`**
(não-vital) com a invariante "ao menos um". Vital = `cnpj` → exige `supplier:edit-sensitive` (síncrono).
PUT total. Regra do vital no use case.

## Escopo

- **`domain/supplier/events.ts`** — `SupplierEdited`.
- **`domain/supplier/types.ts`** — `EditSupplierInput` (campos cadastrais + payment target inputs).
- **`domain/supplier/supplier.ts`** — `edit(supplier, input, at)` (revalida como register: email/cnpj/category/payment-target; preserva id+estado).
- **`application/use-cases/edit-supplier.ts`** — `editSupplier({ supplierId, canEditSensitive, ...campos })`; erros `edit-supplier-{invalid-id,not-found,cnpj-duplicate,sensitive-forbidden}` + SupplierError + repo.
- **`adapters/http/supplier-schemas.ts`** — `updateSupplierBodySchema` (= create).
- **`adapters/http/composition.ts`** — expõe `editSupplier`.
- **`adapters/http/supplier-plugin.ts`** — `SuppliersHttpHooks` + `hasPermission`; `PUT /suppliers/:id`; FORBIDDEN/edit codes no writeErrorStatus.
- **`src/server.ts`** — passa `authDeps.hasPermission` ao suppliersHttpPlugin.

## Fora de escopo

- Collaborator EDIT (fatia seguinte); extras.

## Critérios de aceite

- [ ] `PUT /suppliers/:id` 401; 403 sem `supplier:write`; 400 `:id` não-UUID; 404 inexistente.
- [ ] `supplier:write` sem mudar cnpj (muda name/email/**payment target**) → **200**.
- [ ] `supplier:write` mudando cnpj → **403** (`edit-supplier-sensitive-forbidden`).
- [ ] `supplier:write` + `supplier:edit-sensitive` mudando cnpj → **200**; cnpj novo já usado → **409**.
- [ ] sem payment target (bankAccount+pixKey null) → **422** (invariante); email inválido → 422; cnpj curto → 400.
- [ ] `tsc` + `format:check` + `test` + `lint` verdes; zero regressão.

## Referências

- Piloto: `FINANCIERS-HTTP-EDIT`. `supplier.ts` (register — espelhar edit); `payment-target.ts`. ADR-0024/0027/0033.
