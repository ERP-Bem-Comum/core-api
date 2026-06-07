# Contratos HTTP — `003-partners-aggregator-export`

> Borda `/api/v1` do módulo `partners` (Fastify + `fastify-zod-openapi`, ADR-0025/0027/0033). Todas:
> `requireAuth` + `authorize(...)`, envelope `{ error: { code, message, requestId } }`. Schemas Zod normativos.

## Envelope de erro (todas)

```ts
const ErrorEnvelope = z.object({
  error: z.object({ code: z.string(), message: z.string(), requestId: z.string() }),
});
```

Status transversais: `401` (sem sessão), `403` (sem permissão), `400` (shape inválido — Zod).

---

## 1. `GET /api/v1/partners` — agregador de busca (NOVO)

**Permissão**: `supplier:read` **AND** `financier:read` **AND** `collaborator:read` **AND** `act:read`.

**Query**:

```ts
const PartnersQuery = z.object({
  search: z.string().optional(), // casa name/document (case-insensitive)
  type: z.enum(['supplier', 'financier', 'collaborator', 'act']).optional(), // ausente = todos; fora do enum → 400
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
```

**Response `200`**:

```ts
const PartnerListItem = z.object({
  type: z.enum(['supplier', 'financier', 'collaborator', 'act']),
  id: z.string(),
  name: z.string(),
  document: z.string(),
  active: z.boolean(),
});
const PartnersPage = z.object({
  items: z.array(PartnerListItem),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});
```

**Comportamento**:

- Ordenação `(name ASC, type ASC, id ASC)`; paginação **após** merge in-memory dos 4 readers.
- `type` filtra um tipo; ausente → 4 tipos. `search` casa `name`/`document`.
- Σ dos 4 readers > `MAX_TOTAL` (10.000) → **503** (`code: 'partners-aggregate-too-large'`).
- `page` além do total → `items: []` com `meta` coerente (`totalPages = ceil(total/limit)`).

---

## 2. `GET /api/v1/collaborators/export` — CSV (NOVO; reusa serializer existente)

**Permissão**: `collaborator:read`.

**Query**: filtros da listagem de colaboradores (sem paginação — exporta tudo que casa).

**Response `200`**: corpo CSV (`collaborator-csv.ts`).

- Headers: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="collaborators.csv"`, `X-Content-Type-Options: nosniff`.
- 0 registros → CSV só com cabeçalho. Campos `=`/`+`/`-`/`@` escapados (util).

---

## 3. `GET /api/v1/financiers/export` — CSV (NOVO; serializer novo)

**Permissão**: `financier:read`. Idem §2, via **`financier-csv.ts`** (novo, espelha `supplier-csv.ts`).

---

## 4. `GET /api/v1/acts/export` — CSV (NOVO; serializer novo)

**Permissão**: `act:read`. Idem §2, via **`act-csv.ts`** (novo, espelha `supplier-csv.ts`).

---

## Casamento com o front

Fecha os ITENs 3 (agregador — alimenta o seletor de contratado da feature 002) e 4 (paridade de export) do
ticket do front. Mantém os shapes/códigos legados de `/api/v1` (ADR-0033); rotas novas, nada migra.
