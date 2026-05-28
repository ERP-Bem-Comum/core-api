# 02 — API HTTP (borda)

> Servidor Fastify (ADR-0025), Zod contract-first + OpenAPI 3.1.1 (ADR-0027), montado em
> [`src/server.ts`](../src/server.ts) via `buildApp` ([`src/shared/http/app.ts`](../src/shared/http/app.ts)).
> Rotas de negócio sob o prefixo **`/api/v2`**. Plugins por módulo: `auth/public-api/http.ts`,
> `contracts/public-api/http.ts`.

## 1. Infra & convenções

- **OpenAPI:** spec viva em `GET /docs/json`; UI em `GET /docs` (swagger-ui).
- **Health:** `GET /health` → `200 { status: 'ok' }`.
- **Auth:** `Authorization: Bearer <jwt-ES256>`. `requireAuth` (preHandler) → **401** se ausente/inválido.
- **RBAC fino:** `authorize('<permission>')` (preHandler) → **403** se faltar a permissão. Permissões de
  contratos: `contract:read`, `contract:write`.
- **Hardening:** helmet, CORS allowlist, rate-limit, `bodyLimit` 1 MiB (upload tem limite próprio),
  `cache-control: no-store` em `/api/v2`, request-id por requisição.
- **Envelope de erro** (não-2xx): `{ error: { code, message, requestId } }` — stack/detalhe interno nunca
  vaza. Fonte: [`src/shared/http/errors.ts`](../src/shared/http/errors.ts).

## 2. Dual-pool RW (ADR-0026)

O composition de contracts abre **dois pools**: _writer_ (`CONTRACTS_DATABASE_URL`) e _reader_
(`CONTRACTS_READER_URL`; ausente → reusa o writer, single-node). **Reads** (`list`/`get`/`history`/
`export.csv`) roteiam ao reader; **writes** ao writer, com **read-after-write** (a resposta serializa o
agregado pós-save). Validado no E2E com reader usando credencial SELECT-only (`readonly_bi`).

## 3. Rotas — Auth (`/api/v2/auth`)

| Método + path    | Proteção                        | Sucesso                                     |
| :--------------- | :------------------------------ | :------------------------------------------ |
| `POST /register` | pública                         | 201                                         |
| `POST /login`    | pública                         | 200 `{ accessToken, refreshToken, userId }` |
| `POST /refresh`  | pública (refresh token no body) | 200 (refresh rotacionado)                   |
| `POST /logout`   | pública (refresh token no body) | 204                                         |
| `GET /me`        | `requireAuth`                   | 200 `{ userId }`                            |

Fonte: ADR-0024; `src/modules/auth/adapters/http/`.

## 4. Rotas — Contracts (`/api/v2/contracts`)

Todas exigem `requireAuth`. As de leitura detalhada e escrita somam RBAC fino.

### Leitura (reader pool)

| Método + path                | RBAC            | Sucesso / erros                                             |
| :--------------------------- | :-------------- | :---------------------------------------------------------- |
| `GET /contracts`             | requireAuth     | 200 lista                                                   |
| `GET /contracts/:id`         | `contract:read` | 200 contrato · 404 `contract-not-found` · 400 (id não-uuid) |
| `GET /contracts/:id/history` | `contract:read` | 200 timeline · 404 (contrato inexistente)                   |
| `GET /contracts/export.csv`  | `contract:read` | 200 `text/csv` (attachment, RFC 4180, BOM)                  |

### Escrita (writer pool) — `authorize('contract:write')`

| Método + path                                            | Use case                         | Sucesso                  |
| :------------------------------------------------------- | :------------------------------- | :----------------------- |
| `POST /contracts`                                        | create (`mode: Pending\|Active`) | 201 contrato             |
| `POST /contracts/:id/activate`                           | activate                         | 200                      |
| `POST /contracts/:id/amendments`                         | create amendment (`kind`)        | 201 aditivo              |
| `POST /contracts/:id/amendments/:amendmentId/homologate` | homologate                       | 200 contrato recalculado |
| `POST /contracts/:id/documents`                          | upload (parentType Contract)     | 201 documento            |
| `POST /contracts/:id/amendments/:amendmentId/documents`  | upload + attach (atômico)        | 201 documento            |
| `POST /contracts/:id/documents/:documentId/supersede`    | supersede                        | 200                      |

**Upload** usa `Content-Type: application/octet-stream` (corpo binário cru); metadados (`categoria`,
`fileName`, `mimeType`, `signedElectronically`) na **query string**. `uploadedBy` vem do token;
`bucket`/`storageKeyPrefix` de config. Magic-bytes validado contra o mimeType; `fileName` anti-traversal.

## 5. Mapeamento erro de domínio → HTTP

A borda traduz o `Result<T,E>` do domínio em status (sem `500` para erro de negócio):

| Classe de erro                                                                                                               |   HTTP    |
| :--------------------------------------------------------------------------------------------------------------------------- | :-------: |
| Validação Zod (body/query/param)                                                                                             |    400    |
| Recurso inexistente (`*-not-found`, `parent-not-found`, etc.)                                                                |    404    |
| Conflito de estado/transição/unicidade (`contract-not-pending`, `ContractNotActive`, duplicado, mismatch, doc já superseded) |    409    |
| Invariante semântica (período/valor inválido, magic-bytes, etc.)                                                             |    422    |
| Storage indisponível / falha de upload                                                                                       | 502 / 503 |
| Repositório indisponível                                                                                                     |    503    |

Fonte: `src/modules/contracts/adapters/http/plugin.ts` (`writeErrorStatus`).

## 6. Como ver a doc de API gerada

```bash
pnpm run serve          # sobe o servidor (memory por default)
# abrir http://localhost:3000/docs  (UI)  ou  /docs/json  (spec OpenAPI 3.1.1)
```

Contrato legado de referência (ACL): [`handbook/api_documentations/contracts/openapi.yaml`](../handbook/api_documentations/contracts/openapi.yaml).

## 7. Histórico de entrega

A borda HTTP de contratos foi entregue no épico `EPIC-CONTRACTS-HTTP` (C0-C5), com audit trail W0→W3 em
[`.claude/.pipeline/CONTRACTS-HTTP-*/`](../.claude/.pipeline/) e fechamento em
[`.claude/.planning/EPIC-CONTRACTS-HTTP.md`](../.claude/.planning/EPIC-CONTRACTS-HTTP.md).
