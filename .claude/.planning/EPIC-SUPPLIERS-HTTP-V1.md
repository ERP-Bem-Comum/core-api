# EPIC-SUPPLIERS-HTTP-V1 — Borda HTTP de Fornecedores (`/api/v1`)

> **Status:** Design aprovado (2026-06-03). Espelha `EPIC-COLLABORATORS-HTTP-V1` — mesmas convenções
> (ADR-0033 v1; UUID+legacyId; read-model com timestamps; 201+Location; dois endpoints deactivate/reactivate;
> RBAC). Infra `/api/v1` (buildApp prefixo, composition partners, padrão de plugin) **já existe**.

## 1. Objetivo

Expor o agregado **Supplier** (`src/modules/partners/`) sob `/api/v1/suppliers`, espelhando o contrato
legado (`handbook/legacy_docs/openapi.yaml:545`, schema `Supplier`/`PaginatedSuppliers`). Domínio,
use cases e persistência **já existem** — entrega só `adapters/http/` (recurso supplier) + wiring.

## 2. Supplier vs Collaborator (diferenças)

- **PJ/CNPJ** (não CPF); **1 dimensão** de estado (Active/Inactive) — **sem** complete-registration.
- **Sem `disableBy`**: deactivate é simples (só `deactivatedAt`).
- **Payment target** (`bankAccount`/`pixKey`, invariante "ao menos um").
- `serviceCategory` (39 categorias legadas).
- `listSuppliers` **não filtra** hoje → a S1 cria `SupplierListFilter` + `supplierMatchesFilter` (application).

## 3. Endpoints-alvo (`/api/v1/suppliers`)

| Método/URL | Use case | Pool | Permissão |
| :--- | :--- | :--- | :--- |
| `GET /api/v1/suppliers` | reader.list + filtro borda | reader | `supplier:read` |
| `GET /api/v1/suppliers/:id` | reader.getById | reader | `supplier:read` |
| `POST /api/v1/suppliers` | `registerSupplier` | writer | `supplier:write` |
| `POST /api/v1/suppliers/:id/deactivate` | `deactivateSupplier` | writer | `supplier:write` |
| `POST /api/v1/suppliers/:id/reactivate` | `reactivateSupplier` | writer | `supplier:write` |

## 4. Componentes novos (espelham collaborator, prefixo `supplier-`)

```
src/modules/partners/
├── application/ports/supplier-reader.ts                 # SupplierReader (getById, list) + SupplierReadRecord
├── application/use-cases/list-suppliers.ts              # M: + SupplierListFilter + supplierMatchesFilter
├── adapters/persistence/repos/supplier-reader.{in-memory,drizzle}.ts
└── adapters/http/
    ├── supplier-schemas.ts        # Zod: list query (search/active/categories), detail, paginated, id param, create body
    ├── supplier-dto.ts            # supplierToDetailDto (UUID+legacyId+payment target+timestamps)
    ├── supplier-list-query.ts     # queryToFilter + paginateRecords (reusa supplierMatchesFilter)
    └── supplier-plugin.ts         # suppliersHttpPlugin(deps, hooks)
src/modules/partners/adapters/http/composition.ts        # M: + supplier reader/writer repos + use cases
src/modules/partners/public-api/permissions.ts           # M: + SUPPLIER_PERMISSION
src/modules/partners/public-api/http.ts                  # M: + suppliersHttpPlugin
src/server.ts                                            # M: registra suppliersHttpPlugin sob /api/v1
```

## 5. Fatiamento (W0→W3 por fatia)

### S1 — `SUPPLIERS-HTTP-READS` (size M) — ✅ closed-green (2026-06-03)

- `SUPPLIER_PERMISSION`; `SupplierReader` (getById+list) + 2 adapters; `SupplierListFilter` +
  `supplierMatchesFilter` (search nome/cnpj, active, categories); `suppliersHttpPlugin`; composition supplier reads.
- `GET /suppliers` (paginado + 3 filtros, item = detalhe completo, meta legado) + `GET /:id` (detalhe; 404/400).
- Registro no `server.ts`; seed RBAC supplier:read/write.

### S2 — `SUPPLIERS-HTTP-REGISTER` (size M) — ✅ closed-green (2026-06-04)

- `POST /suppliers` (`registerSupplier`) → 201 + Location; body com payment target (bankAccount XOR/AND pixKey,
  invariante "ao menos um"); 409 cnpj-duplicate; 422 invariante (payment-target-required, invalid-cnpj, etc.); 400 Zod.

### S3 — `SUPPLIERS-HTTP-LIFECYCLE` (size S) — ✅ closed-green (2026-06-04)

- `POST /:id/deactivate` (sem body — supplier não tem disableBy) + `POST /:id/reactivate` → 200; 409 already-*; 404.

### Fora do épico (follow-up)

- **S-EDIT**: `PUT /:id` (update cadastral) — exige operação de domínio `Supplier.edit` nova (mesmo gap da P4-EDIT de colaborador).
- Extras legado: `/suppliers/options`, `/suppliers/csv`, `/suppliers/nameOrCNPJ`.
- Smoke E2E (opcional, espelha collaborators-smoke).

## 6. Invariantes

Iguais ao EPIC-COLLABORATORS-HTTP-V1 §6 (ADR-0006/0026/0027/0033; Zod na borda; Result→HTTP; só `par_*`).
