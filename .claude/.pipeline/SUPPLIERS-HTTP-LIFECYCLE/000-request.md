# Ticket SUPPLIERS-HTTP-LIFECYCLE: desativar + reativar Fornecedor (S3)

> Fatia **S3** do `EPIC-SUPPLIERS-HTTP-V1`. Soft-delete via dois endpoints. Fecha o CRUD core de Fornecedores.

## Contexto

Decisão do épico v1: **dois endpoints** (`POST /:id/deactivate` + `POST /:id/reactivate`). Diferente de
colaborador, Supplier **não tem `disableBy`** → `deactivate` é **sem body**. Writer pool (já existe da S2).
Os sets de erro do `writeErrorStatus` (supplier-plugin) já incluem os códigos de deactivate/reactivate.

## Escopo

- **`adapters/http/composition.ts`** — expõe `deactivateSupplier` + `reactivateSupplier` (writer).
- **`adapters/http/supplier-plugin.ts`** — `POST /:id/deactivate` (sem body) + `POST /:id/reactivate`
  (sem body), ambos `authorize('supplier:write')`, 200; reusa `sendWriteError` + `supplierIdParamSchema`.

## Fora de escopo

- PUT update (gap de domínio) → S-EDIT; extras `/options`/`/csv`/`/nameOrCNPJ`; smoke E2E.

## Critérios de aceite

- [ ] `POST /:id/deactivate` sem token → 401; sem `supplier:write` → 403; `:id` não-UUID → 400.
- [ ] `deactivate` id inexistente → 404; de um ativo → **200**; 2ª vez → **409** (`supplier-already-inactive`).
- [ ] `POST /:id/reactivate` de um inativo → **200**; de um ativo → **409** (`supplier-already-active`); inexistente → 404.
- [ ] `tsc` + `format:check` + `test` + `lint` verdes; zero regressão.

## Referências

- `deactivate-supplier.ts`, `reactivate-supplier.ts`. Padrão: P3 de `EPIC-COLLABORATORS-HTTP-V1`. ADR-0026/0027/0033.
