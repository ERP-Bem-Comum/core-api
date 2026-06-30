# EPIC-FINANCIERS-HTTP-V1 — Borda HTTP de Financiadores (`/api/v1`)

> **Status:** ✅ closed-green (2026-06-04). **Fatia única** (decisão do dono — Financier é o mais simples).
> Espelha `EPIC-SUPPLIERS-HTTP-V1` removendo payment-target/serviceCategory/email/fantasyName.
> Mesmas convenções (ADR-0033; UUID+legacyId; read-model com timestamps; 201+Location; dois endpoints
> deactivate/reactivate; RBAC). Infra `/api/v1` (buildApp, composition partners) reaproveitada.

## Diferenças vs Supplier

- Campos: `name, corporateName, legalRepresentative, cnpj, telephone, address` (sem email/fantasyName/serviceCategory).
- **Sem payment-target**; **sem categorias**. Filtros: só **search** (name/cnpj) + **active**.
- Estados Active/Inactive (soft-delete, sem disableBy).

## Endpoints (`/api/v1/financiers`)

| Método/URL | Use case | Permissão |
| :--- | :--- | :--- |
| `GET /financiers` | reader.list + filtro (search/active) | `financier:read` |
| `GET /financiers/:id` | reader.getById | `financier:read` |
| `POST /financiers` | `registerFinancier` (201+Location) | `financier:write` |
| `POST /financiers/:id/deactivate` (sem body) | `deactivateFinancier` | `financier:write` |
| `POST /financiers/:id/reactivate` | `reactivateFinancier` | `financier:write` |

## Componentes (espelham supplier, prefixo `financier-`)

`FINANCIER_PERMISSION`; `FinancierReader` (+2 adapters); `FinancierListFilter`+`financierMatchesFilter`
(list-financiers.ts); `financier-{schemas,dto,list-query,plugin}.ts`; composition (reader+writer+use cases+seed.financiers);
`public-api/http.ts` (+financiersHttpPlugin); `server.ts` (registra sob /api/v1).

## Fora do épico

- `PUT /:id` (update — gap de domínio `Financier.edit`, igual S-EDIT/P4-EDIT); `/options`, `/nameOrCNPJ`; smoke E2E.
