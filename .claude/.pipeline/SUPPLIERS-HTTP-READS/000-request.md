# Ticket SUPPLIERS-HTTP-READS: lista (paginada + filtros) + detalhe de Fornecedores (S1)

> Fatia **S1** do `EPIC-SUPPLIERS-HTTP-V1`. Espelha P1a+P1b de Colaboradores; infra `/api/v1` já existe.

## Contexto

Estreia o recurso `suppliers` na borda HTTP do módulo partners (sob `/api/v1`, ADR-0033). Reaproveita
buildApp (prefixo por plugin), o composition partners (pool MySQL RW split) e o padrão de read-model
enriquecido. Domínio/use cases/persistência de Supplier já existem.

## Escopo

- **`public-api/permissions.ts`** — `SUPPLIER_PERMISSION = { read: 'supplier:read', write: 'supplier:write' }`.
- **`application/ports/supplier-reader.ts`** — `SupplierReadRecord = { supplier, legacyId, createdAt, updatedAt }`;
  `SupplierReader = { getById(id), list() }` (err `supplier-read-unavailable`).
- **`application/use-cases/list-suppliers.ts`** (M) — `SupplierListFilter { search?, active?: boolean, categories?: ServiceCategory[] }`
  + `supplierMatchesFilter` (search casa name/cnpj; active = status; categories = serviceCategory ∈).
- **`adapters/persistence/repos/supplier-reader.{in-memory,drizzle}.ts`** — getById+list (drizzle projeta via `supplierFromRow` + legacyId/timestamps).
- **`adapters/http/supplier-schemas.ts`** — Zod: `supplierListQuerySchema` (page/limit/order/search/active/categories[]),
  `supplierDetailSchema` (espelha `Supplier` legado: id UUID+legacyId, name, email, cnpj, corporateName, fantasyName,
  serviceCategory, bankAccount, pixKey, active, createdAt, updatedAt), `supplierPaginatedSchema`, `supplierIdParamSchema`.
- **`adapters/http/supplier-dto.ts`** — `supplierToDetailDto(record)`.
- **`adapters/http/supplier-list-query.ts`** — `queryToFilter` + `paginateRecords` (reusa `supplierMatchesFilter`).
- **`adapters/http/supplier-plugin.ts`** — `suppliersHttpPlugin(deps, hooks)`: `GET /suppliers` + `GET /:id` (`supplier:read`).
- **`adapters/http/composition.ts`** (M) — supplier reader (memory|drizzle) + `getSupplierById`/`listSupplierRecords`; `PartnersSeed.suppliers`.
- **`public-api/http.ts`** (M) — exporta `suppliersHttpPlugin`.
- **`server.ts`** (M) — registra `suppliersHttpPlugin` sob `/api/v1`.

## Fora de escopo

- POST cadastro → S2; deactivate/reactivate → S3; PUT update (gap de domínio) → S-EDIT.
- `/suppliers/options`, `/csv`, `/nameOrCNPJ`.

## Critérios de aceite

- [ ] `GET /api/v1/suppliers` sem token → 401; sem `supplier:read` → 403.
- [ ] `GET /suppliers` → 200 `{ items, meta }` (item = detalhe completo c/ legacyId + payment target + timestamps; meta legado).
- [ ] Filtros: `search` (name/cnpj), `active` (0|1), `categories[]`; paginação page/limit/order.
- [ ] `GET /suppliers/:id` → 200 detalhe; 404 inexistente; 400 `:id` não-UUID.
- [ ] `tsc` + `format:check` + `test` + `lint` verdes; zero regressão.

## Referências

- `handbook/legacy_docs/openapi.yaml:545` (paths), `:2549` (schema Supplier).
- `register-supplier.ts`, `list-suppliers.ts`, `supplier.mapper.ts`, `service-category.ts`, `payment-target.ts`.
- Padrão: fatias P1a/P1b de `EPIC-COLLABORATORS-HTTP-V1`. ADR-0026/0027/0033.
