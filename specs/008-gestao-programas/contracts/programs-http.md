# Phase 1 — HTTP Contract: Programs API

> Borda REST sob `/api/v1/programs` (Fastify + `fastify-zod-openapi`). Auth obrigatória via `Bearer` (`requireAuth`); autorização por permissão (`authorize`). `Result → HTTP` via `sendResult`. Mapeamento de erro espelha `contracts/adapters/http/plugin.ts`.

## Convenções

- **Versão `/api/v1`**: `programs` é **port do legado sem re-estudo de domínio** — convenção do projeto reserva `/api/v2` aos módulos reformulados (Contratos, Financeiro). Registro via prefixo explícito (ADR-0033), igual a Auth users/roles (specs 005/006).
- **Auth**: `Authorization: Bearer <access-token>`. Sem token → 401.
- **Erro padrão**: `{ "error": { "code": "<kebab-case>", "message": "<PT>" } }`.
- **Identificador na rota**: `:id` = UUID v4 (`program-id-invalid` → 404 na prática se não casar).
- **Paginação (meta)**: `{ currentPage, itemsPerPage, itemCount, totalItems, totalPages }` (harmonizado com contracts/auth).
- **Escritas retornam o recurso**: `POST` → 201 + programa; `PUT`/`deactivate`/`reactivate` → **200 com o programa atualizado** (corpo nunca vazio). Evita o erro "200 sem corpo" que estourava o `response.json()` do BFF (handoff de Parceiros — `handbook/tickets/todo/README.md`).
- **Optimistic-lock só em `PUT`**: desativar/reativar não recebem `version`; a guarda de estado (`program-not-active`/`program-not-inactive`) já serializa concorrência (análise F1).

---

## GET /api/v1/programs — listar (paginado + busca)

- **Permissão**: `program:read`
- **Query**: `page` (int ≥1, default 1) · `limit` (∈ {5,10,25}, default 5) · `order` (`ASC|DESC`, default `ASC`) · `search` (string, opcional — substring case-insensitive em `name` OU `sigla`) · `status` (`ATIVO|INATIVO`, opcional)
- **200**:

```json
{
  "items": [
    {
      "id": "f4…",
      "programNumber": 116,
      "name": "EPV",
      "sigla": "EPV",
      "generalCharacteristics": "…",
      "logoKey": null,
      "status": "ATIVO"
    }
  ],
  "meta": { "currentPage": 1, "itemsPerPage": 5, "itemCount": 1, "totalItems": 1, "totalPages": 1 }
}
```

- **Erros**: 401 (sem auth) · 403 (sem `program:read`) · 503 (`program-repo-unavailable`)
- Lista vazia → 200 com `items: []` e `meta` coerente (FR-011).

---

## POST /api/v1/programs — criar

- **Permissão**: `program:write`
- **Body**:

```json
{
  "name": "EPV",
  "sigla": "EPV",
  "director": "Vinícius Basílio",
  "generalCharacteristics": "Descrição…",
  "logoKey": null
}
```

- **201**: programa criado (com `id`, `programNumber`, `status: "ATIVO"`, `version: 1`). Header `Location: /api/v1/programs/<id>`.
- **Erros**: 401 · 403 · 409 `program-sigla-duplicated` · 422 `program-name-required` / `program-sigla-invalid`

---

## GET /api/v1/programs/:id — detalhe

- **Permissão**: `program:read`
- **200**: todos os campos do programa (inclui `version`, `createdAt`, `updatedAt`).
- **Erros**: 401 · 403 · 404 `program-not-found`

---

## PUT /api/v1/programs/:id — editar

- **Permissão**: `program:write`
- **Body**: campos editáveis (`name`, `sigla`, `director`, `generalCharacteristics`, `logoKey`) + **`version`** esperada (optimistic-lock).

```json
{
  "name": "EPV",
  "sigla": "EPV",
  "director": "Novo Diretor",
  "generalCharacteristics": "…",
  "logoKey": "programs/116/logo.png",
  "version": 3
}
```

- **200**: programa atualizado (`version` incrementada).
- **Erros**: 401 · 403 · 404 `program-not-found` · 409 `program-sigla-duplicated` · 409 `program-version-conflict` · 422 `program-name-required`/`program-sigla-invalid`

---

## POST /api/v1/programs/:id/deactivate — desativar

- **Permissão**: `program:deactivate`
- **Body**: vazio (sem `version` — proteção por guarda de estado).
- **200**: **programa atualizado** com `status: "INATIVO"` (corpo completo).
- **Erros**: 401 · 403 · 404 · 409 `program-not-active` (já inativo)

---

## POST /api/v1/programs/:id/reactivate — reativar

- **Permissão**: `program:deactivate`
- **Body**: vazio (sem `version` — proteção por guarda de estado).
- **200**: **programa atualizado** com `status: "ATIVO"` (corpo completo).
- **Erros**: 401 · 403 · 404 · 409 `program-not-inactive` (já ativo)

---

## POST /api/v1/programs/:id/logo — upload de logo (multipart)

- **Permissão**: `program:write`
- **Body**: `multipart/form-data` com campo `file` (imagem).
- **Regras (FR-021)**: tipos `image/png|jpeg|webp`; tamanho ≤ 5 MB.
- **200**: `{ "logoKey": "programs/<id>/logo.<ext>" }` (objeto gravado no S3/MinIO — ADR-0019).
- **Erros**: 401 · 403 · 404 · 413 (payload > 5 MB) · 415 (tipo não suportado) · 422

> Endpoint de maior esforço (multipart + storage). Fatiável como sub-ticket P3; `create`/`update` funcionam sem logo (FR-022).

---

## Mapa de status code (writeErrorStatus)

| code                                                                                                 | HTTP |
| ---------------------------------------------------------------------------------------------------- | ---- |
| `program-not-found`                                                                                  | 404  |
| `program-sigla-duplicated`, `program-not-active`, `program-not-inactive`, `program-version-conflict` | 409  |
| `program-repo-unavailable`                                                                           | 503  |
| `program-name-required`, `program-sigla-invalid` (default invariante)                                | 422  |
