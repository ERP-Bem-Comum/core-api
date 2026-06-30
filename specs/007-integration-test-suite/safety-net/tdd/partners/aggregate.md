# TDD — partners / aggregate (rede de segurança 1:1)

> Fonte read-only: `api-collections/partners/aggregate/*.bru`. Um caso por request.
> Asserções literais do bloco `tests {}`. Sem asserção → `**smoke-only**`.

## aggregate/01-list-no-auth.bru (seq 70)

- **Método + rota:** GET `{{baseUrl}}/api/v1/partners`
- **Auth:** none
- **Pré-condições:** nenhum token enviado.
- **Asserções:**
  - `res.getStatus()` é `401`.

## aggregate/02-list-bare-user-403.bru (seq 71)

- **Método + rota:** GET `{{baseUrl}}/api/v1/partners`
- **Auth:** bearer `{{bareUserToken}}`
- **Pré-condições:** usuário pelado sem as 4 permissões de read.
- **Asserções:**
  - `res.getStatus()` é `403`.

## aggregate/03-list-todos-os-tipos.bru (seq 72)

- **Método + rota:** GET `{{baseUrl}}/api/v1/partners`
- **Auth:** bearer `{{operatorToken}}`
- **Query:** `page=1`, `limit=20`
- **Pré-condições:** operador autenticado.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `body` tem propriedade `items`, e `body.items` é um array.
  - `body.meta` tem `itemCount`, `totalItems`, `itemsPerPage`, `totalPages`, `currentPage`.
  - cada `item` tem `type`, `id`, `name`, `document`, `active`.

## aggregate/04-filter-por-type-supplier.bru (seq 73)

- **Método + rota:** GET `{{baseUrl}}/api/v1/partners`
- **Auth:** bearer `{{operatorToken}}`
- **Query:** `type=supplier`, `page=1`, `limit=20`
- **Pré-condições:** operador autenticado.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - cada `item.type` é igual a `"supplier"`.

## aggregate/05-filter-por-search.bru (seq 74)

- **Método + rota:** GET `{{baseUrl}}/api/v1/partners`
- **Auth:** bearer `{{operatorToken}}`
- **Query:** `search=E2E Bruno`, `page=1`, `limit=20`
- **Pré-condições:** operador autenticado.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `body` tem propriedades `items` e `meta`.

## aggregate/06-type-invalido-400.bru (seq 75)

- **Método + rota:** GET `{{baseUrl}}/api/v1/partners`
- **Auth:** bearer `{{operatorToken}}`
- **Query:** `type=invalido`
- **Pré-condições:** operador autenticado.
- **Asserções:**
  - `res.getStatus()` é `400`.
  - `body` tem `error`; `body.error` tem `code` e `requestId`.

## aggregate/07-meta-paginacao.bru (seq 76)

- **Método + rota:** GET `{{baseUrl}}/api/v1/partners`
- **Auth:** bearer `{{operatorToken}}`
- **Query:** `page=1`, `limit=5`
- **Pré-condições:** operador autenticado.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `meta.itemsPerPage` é igual a `5`.
  - `meta.currentPage` é igual a `1`.
  - `items.length` é no máximo `5`.
