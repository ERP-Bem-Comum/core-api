# Phase 1 — Data Model: `003-partners-aggregator-export`

> Modelo de **borda** (DTOs de leitura/serialização) — sem domínio novo, sem schema novo. Deriva de
> `spec.md` (FR-001..009) e `research.md` (R1–R4). A projeção e os serializers são adapters de apresentação.

## DTO — `PartnerListItem` (agregador) — `partners/adapters/http/partner-aggregate-query.ts`

Projeção plana de qualquer um dos 4 tipos, extraída do agregado dentro do `*ReadRecord`.

```ts
export type PartnerType = 'supplier' | 'financier' | 'collaborator' | 'act';

export type PartnerListItem = Readonly<{
  type: PartnerType;
  id: string;
  name: string;
  document: string; // cnpj (supplier/financier) | cpf (collaborator/act)
  active: boolean; // derivado do status do agregado
}>;
```

| Campo      | Origem por tipo                                                                |
| ---------- | ------------------------------------------------------------------------------ |
| `type`     | discriminante fixo por reader                                                  |
| `id`       | `<aggregate>.id` (branded → string)                                            |
| `name`     | `<aggregate>.name`                                                             |
| `document` | supplier/financier → `cnpj`; collaborator/act → `cpf`                          |
| `active`   | `<aggregate>.status === 'Active'` (ou equivalente do soft-delete de cada tipo) |

## DTO — `PartnersPage` (resposta do agregador)

```ts
export type PartnersPageMeta = Readonly<{
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}>;
export type PartnersPage = Readonly<{ items: readonly PartnerListItem[]; meta: PartnersPageMeta }>;
```

- `total` = nº de itens **após** filtro (`search`/`type`), antes da fatia de página.
- `totalPages = ceil(total / limit)`; `page` além do total → `items: []`.

## Algoritmo de composição (borda) — `partner-aggregate-query.ts`

1. `Promise.all` dos 4 readers (`list()`), respeitando `type` (se informado, só esse reader).
2. **Cap**: se `Σ records > MAX_TOTAL (10_000)` → `err('partners-aggregate-too-large')` → 503.
3. Projeta cada record → `PartnerListItem`.
4. Filtra por `search` (casa `name`/`document`, case-insensitive).
5. Merge + ordena `(name ASC, type ASC, id ASC)` (determinístico).
6. Pagina (offset = `(page-1)*limit`) → `{ items, meta }`.

> Funções puras (sem IO além dos readers injetados); espelha `paginateRecords` de `supplier-list-query.ts`.

## Query do agregador (Zod, borda) — `partners-schemas.ts`

```ts
const partnersQuery = z.object({
  search: z.string().optional(),
  type: z.enum(['supplier', 'financier', 'collaborator', 'act']).optional(), // fora → 400
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(/* MAX_PAGE_LIMIT */ 100).default(20),
});
```

## Serializers CSV (export) — `partners/adapters/export/`

| Serializer            | Status   | Nota                                                            |
| --------------------- | -------- | --------------------------------------------------------------- |
| `supplier-csv.ts`     | existe   | referência (HEADER fixo + `toCsv`)                              |
| `collaborator-csv.ts` | existe   | reusado pela nova rota `/collaborators/export`                  |
| `financier-csv.ts`    | **NOVO** | espelha `supplier-csv.ts` (achata `Financier` → células planas) |
| `act-csv.ts`          | **NOVO** | espelha `supplier-csv.ts` (achata `Act` → células planas)       |

- Todos usam `toCsv` de `#src/shared/utils/csv.ts` (escape anti-injection + RFC 4180). HEADER em ordem fixa por tipo.

## Permissões (sem mudança de catálogo)

- Agregador: **AND** de `supplier:read` + `financier:read` + `collaborator:read` + `act:read` (já existem).
- Exports: `collaborator:read` / `financier:read` / `act:read` respectivamente.

## Mapa de rastreabilidade FR → modelo

| FR     | Elemento                                                         |
| ------ | ---------------------------------------------------------------- |
| FR-001 | `PartnerListItem` + `PartnersPage`                               |
| FR-002 | `partnersQuery` (search/type/page/limit) + sort `(name,type,id)` |
| FR-003 | algoritmo de composição (Promise.all + merge + cap)              |
| FR-004 | rota `/collaborators/export` + `collaborator-csv.ts`             |
| FR-005 | `financier-csv.ts` + rota `/financiers/export`                   |
| FR-006 | `act-csv.ts` + rota `/acts/export`                               |
| FR-007 | `toCsv` (escape) + headers de export                             |
| FR-008 | guard AND-4-reads (agregador) / `<tipo>:read` (exports)          |
