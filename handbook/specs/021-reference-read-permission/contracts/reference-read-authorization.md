# Contrato — Autorização de leitura de dados de referência (021)

> Os 3 endpoints **já existem** (feature 020). Este contrato documenta apenas o **comportamento de autorização** que a 021 destrava. Nenhuma rota nova; request/response inalterados.

## Permissão exigida

`reference:read` (`FINANCIAL_PERMISSION.referenceRead`). Registrada no catálogo central pela 021 (antes: ausente → não-concedível → 403 universal).

## Endpoints

| Método | Rota                             | preHandler                                   |
| ------ | -------------------------------- | -------------------------------------------- |
| GET    | `/api/v2/financial/categories`   | `requireAuth`, `authorize('reference:read')` |
| GET    | `/api/v2/financial/cost-centers` | `requireAuth`, `authorize('reference:read')` |
| GET    | `/api/v2/financial/programs`     | `requireAuth`, `authorize('reference:read')` |

## Matriz de autorização (contrato testável)

| Ator                                       | Token            | Permissão `reference:read`? | Resultado esperado                              |
| ------------------------------------------ | ---------------- | --------------------------- | ----------------------------------------------- |
| Não autenticado                            | ausente/inválido | —                           | **401** `unauthorized`                          |
| Autenticado, role **com** `reference:read` | válido           | sim                         | **200** + corpo da listagem (inalterado da 020) |
| Autenticado, role **sem** `reference:read` | válido           | não                         | **403** `forbidden`                             |
| Admin (perfil completo, `.all`)            | válido           | sim (via `.all`)            | **200**                                         |

Corpo de erro: envelope padrão `{ error: { code, message, ... } }` (`shared/http/errors.ts`), `code ∈ {unauthorized, forbidden}`. **Nunca** vazar código interno de erro no 4xx (consistente com #52).

## Invariante de catálogo (pré-condição do contrato)

`reference:read ∈ PermissionCatalog.all`. Sem isso:

- `Role.setPermissions(role, [..., 'reference:read'])` → **rejeitado** (fora do catálogo);
- logo nenhuma role obtém a permissão → 403 universal (estado do #200).

## Observação de teste (anti-regressão)

O contrato DEVE ser verificado contra o **`authorize` real** (`makeAuthorize` da public-api do auth), não contra um `authorize` fake que lê a permissão do header de requisição. Um fake satisfaz a matriz acima **mesmo com o catálogo quebrado** — falso verde (FR-006/SC-004).
