# Ticket FINANCIERS-HTTP-V1: borda HTTP de Financiadores (CRUD — fatia única)

> `EPIC-FINANCIERS-HTTP-V1`. Espelha o épico de Fornecedores (mais simples). Infra `/api/v1` reaproveitada.

## Contexto

Domínio/use cases/persistência de Financier prontos; falta a borda HTTP. Financier é PJ (CNPJ), 6 campos
(name, corporateName, legalRepresentative, cnpj, telephone, address), estados Active/Inactive (soft-delete,
sem disableBy), sem payment-target/categoria. Fatia única (decisão do dono): reads + cadastro + lifecycle.

## Escopo

- **`public-api/permissions.ts`** — `FINANCIER_PERMISSION { read:'financier:read', write:'financier:write' }`.
- **`application/ports/financier-reader.ts`** — `FinancierReadRecord { financier, legacyId, createdAt, updatedAt }`; `FinancierReader { getById, list }` (err `financier-read-unavailable`).
- **`application/use-cases/list-financiers.ts`** (M) — `FinancierListFilter { search?, active? }` + `financierMatchesFilter` (search casa name/cnpj).
- **`adapters/persistence/repos/financier-reader.{in-memory,drizzle}.ts`** (drizzle projeta via `financierFromRow`).
- **`adapters/http/financier-schemas.ts`** — list query (page/limit/order/search/active), detail (id UUID+legacyId, name, corporateName, legalRepresentative, cnpj, telephone, address, active, timestamps), paginated, id param, create body.
- **`adapters/http/financier-{dto,list-query,plugin}.ts`** — DTO, queryToFilter+paginate, plugin (GET list, GET /:id, POST 201+Location, POST deactivate/reactivate) + writeErrorStatus.
- **`adapters/http/composition.ts`** (M) — financier reader + writer repo + use cases (register/deactivate/reactivate) + `getFinancierById`/`listFinancierRecords` + `PartnersSeed.financiers`.
- **`public-api/http.ts`** (M) — exporta `financiersHttpPlugin` + `FINANCIER_PERMISSION`.
- **`server.ts`** (M) — registra `financiersHttpPlugin` sob `/api/v1`.

## Fora de escopo

- `PUT /:id` (update — gap de domínio); `/options`, `/nameOrCNPJ`; smoke E2E.

## Critérios de aceite

- [ ] `GET /financiers` 401 sem token / 403 sem `financier:read` / 200 `{items,meta}` (item=detalhe; filtros search+active; paginação).
- [ ] `GET /:id` 200 / 404 / 400 não-UUID.
- [ ] `POST /financiers` 401/403; 201+Location; 409 cnpj duplicado; 400 shape (cnpj≠14); 422 cnpj DV inválido / campo faltando.
- [ ] `POST /:id/deactivate` (sem body) 200 / 409 already-inactive / 404; `POST /:id/reactivate` 200 / 409 already-active / 404.
- [ ] `tsc` + `format:check` + `test` + `lint` verdes; zero regressão.

## Referências

- Domínio: `financier/{types,repository,errors}.ts`; use cases `*-financier*`; `financier.mapper.ts`.
- Template: épico `EPIC-SUPPLIERS-HTTP-V1` (supplier-*.ts). ADR-0026/0027/0033.
