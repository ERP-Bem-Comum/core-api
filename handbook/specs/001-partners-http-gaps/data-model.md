# Data Model: Gaps de borda HTTP do módulo `partners`

**Feature**: `specs/001-partners-http-gaps/` · Fase 1 do plan · Complementa `domain.md`.

> Só a US-002 (territorial) introduz **estado persistido novo**. As demais frentes reusam agregados/funções
> existentes. Branded types + smart constructors retornam `Result<T,E>` (Princ. V). Zod valida na borda.

## Entidades novas (domain — US-002)

### `PartnerState` (Entity, soft-delete)

```
PartnerState {
  uf: StateAbbreviation        // identidade (única) — reusa VO existente
  active: boolean              // true = parceira
  deactivatedAt: Date | null   // preenchido sse !active (CHECK)
}
```

- **Smart constructor / transições** (puras, `Result`): `activate(uf)`, `deactivate(state, now)`, `reactivate(state)`.
- **Invariante**: `active === false ⟺ deactivatedAt !== null`. Toggle idempotente.

### `PartnerMunicipality` (Entity, soft-delete)

```
PartnerMunicipality {
  ibgeCode: IbgeCode           // identidade (única) — reusa VO existente
  uf: StateAbbreviation        // atributo (organização/listagem; cross-state)
  active: boolean
  deactivatedAt: Date | null
}
```

- Mesma invariante/transições. `uf` derivada do catálogo (`findMunicipalityByCod`).

## Value Objects reusados (não recriar — recon §1.5)

| VO                            | Origem                                                    | Uso                                                 |
| ----------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| `StateAbbreviation`           | `domain/geography/state.ts` (`State.parse`)               | identidade de `PartnerState`, atributo de município |
| `IbgeCode`                    | `domain/geography/municipality.ts` (`Municipality.parse`) | identidade de `PartnerMunicipality`                 |
| `ServiceCategory`             | `domain/supplier/service-category.ts` (union 39)          | catálogo US-004 (`listServiceCategories()`)         |
| `RegisterCollaboratorCommand` | `application/use-cases/register-collaborator.ts`          | alvo do mapeamento CSV (US-001)                     |

## Schema MySQL novo (Drizzle — `schemas/mysql.ts`)

Espelha o padrão de `parSuppliers` (recon §1.3). Gerar migration com `pnpm run db:generate`.

```text
par_states
  uf              varchar(2)  PK
  active          boolean     NOT NULL DEFAULT true
  deactivated_at  datetime(3) NULL
  created_at      datetime(3) NOT NULL
  updated_at      datetime(3) NOT NULL
  INDEX (active)
  CHECK (active = FALSE) = (deactivated_at IS NOT NULL)

par_municipalities
  ibge_code       varchar(7)  PK
  uf              varchar(2)  NOT NULL
  active          boolean     NOT NULL DEFAULT true
  deactivated_at  datetime(3) NULL
  created_at      datetime(3) NOT NULL
  updated_at      datetime(3) NOT NULL
  INDEX (active), INDEX (uf)
  CHECK (active = FALSE) = (deactivated_at IS NOT NULL)
```

- Sem FK para catálogo (seed estático, não tabela — ADR-0031 §3). Integridade da UF/IBGE validada no domínio na escrita.
- Sem ENUM/JSON nativo (ADR-0020).

## Util compartilhado (CORE-CSV-PARSE-UTIL — ticket #1)

```
src/shared/utils/csv.ts  (já tem toCsv/escapeCsvCell/toCsvLine)
  + tokenizeCsv(content: string): readonly (readonly string[])[]
  + parseCsv(content: string): Result<Table, CsvParseError>     // Table = { headers, rows }
  // CsvParseError = 'csv-empty' | 'csv-malformed'
```

## Models expostos à borda (DTO / Zod — `adapters/http`)

| DTO                           | Campos                                   | Rota                                |
| ----------------------------- | ---------------------------------------- | ----------------------------------- |
| `PartnerStateDto`             | `{ uf, isPartner }`                      | `GET /partner-states`               |
| `PartnerMunicipalityDto`      | `{ ibgeCode, uf, name, isPartner }`      | `GET /partner-municipalities`       |
| `ServiceCategoryDto`          | `string[]` (39)                          | `GET /suppliers/service-categories` |
| `CollaboratorImportReportDto` | `{ created, failed: [{ line, error }] }` | `POST /collaborators/import`        |
| (CSV bytes)                   | —                                        | `GET /suppliers/export`             |

> `isPartner` no DTO = projeção de `active` (a borda traduz o vocabulário do domínio para o do front).
