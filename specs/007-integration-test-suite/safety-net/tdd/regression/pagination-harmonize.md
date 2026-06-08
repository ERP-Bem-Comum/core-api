# TDD — Regressão de fix: harmonização do shape de meta de paginação

> **Dimensão:** Consistência da interface HTTP (contrato de paginação único entre módulos).
> **Tipo:** REGRESSÃO DE FIX — asserções do estado CORRETO. **DEVEM REPROVAR** enquanto o bug
> existir; pela política de regressão zero, força a harmonização dos schemas Zod de meta de
> paginação em contracts e auth (ticket `HTTP-PAGINATION-HARMONIZE`).
>
> **Achado:** 3 formatos de `meta` diferentes na borda HTTP — um cliente (front-end) precisa
> lidar com três contratos distintos para a mesma operação de "listar paginado":
>
> | Módulo       | meta retornado hoje                                                               |
> | ------------ | --------------------------------------------------------------------------------- |
> | contracts    | `{ page, limit, total, totalPages }`                                              |
> | auth (users) | `{ currentPage, pageSize, totalItems, totalPages }`                               |
> | partners     | `{ currentPage, itemsPerPage, itemCount, totalItems, totalPages }` ← **CANÔNICO** |
>
> **Shape canônico proposto:** o de partners — mais completo e semântico.
> `itemCount` = número de itens retornados na página atual; `totalItems` = total em todos os filtros.

## Pré-condições (seed)

- `contractsOperatorToken` com `contract:read` (login via `0-auth/05-login-contracts-operator.bru`).
- `adminToken` com `user:list` (login via `0-auth/02-login-admin.bru`).
- `partnersOperatorToken` com `supplier:read` (login via `0-auth/06-login-partners-operator.bru`).
- Coleção `.bru`: `api-collections/core-api/z-pending-fixes/pagination/`.

## PAGE-HARM-1 — GET /api/v2/contracts retorna meta com shape canônico

- **Arquivo `.bru`:** `z-pending-fixes/pagination/01-page-harm-contracts.bru`
- **GET** `/api/v2/contracts?page=1&limit=5` (Bearer contractsOperatorToken)
- **Asserções:**
  - `status === 200`
  - `body.meta` tem propriedade `currentPage`
  - `body.meta` tem propriedade `itemsPerPage`
  - `body.meta` tem propriedade `totalItems`
  - `body.meta` tem propriedade `totalPages`
- **Estado atual: REPROVA** — contracts retorna `{ page, limit, total, totalPages }` (nomes curtos).
  As asserções `currentPage` e `itemsPerPage` falham; `total` não é `totalItems`.

## PAGE-HARM-2 — GET /api/v1/users retorna meta com shape canônico completo

- **Arquivo `.bru`:** `z-pending-fixes/pagination/02-page-harm-users.bru`
- **GET** `/api/v1/users?page=1&pageSize=5` (Bearer adminToken)
- **Asserções:**
  - `status === 200`
  - `body.meta` tem propriedade `currentPage`
  - `body.meta` tem propriedade `itemsPerPage`
  - `body.meta` tem propriedade `itemCount`
  - `body.meta` tem propriedade `totalItems`
  - `body.meta` tem propriedade `totalPages`
- **Estado atual: REPROVA** — auth/users retorna `{ currentPage, pageSize, totalItems, totalPages }`.
  As asserções `itemsPerPage` e `itemCount` falham (usa `pageSize`; não tem `itemCount`).

## PAGE-HARM-3 — GET /api/v1/suppliers já retorna meta canônico completo (guarda de não-regressão)

- **Arquivo `.bru`:** `z-pending-fixes/pagination/03-page-harm-suppliers-guard.bru`
- **GET** `/api/v1/suppliers?page=1&limit=5` (Bearer partnersOperatorToken)
- **Asserções:**
  - `status === 200`
  - `body.meta` tem propriedade `currentPage`
  - `body.meta` tem propriedade `itemsPerPage`
  - `body.meta` tem propriedade `itemCount`
  - `body.meta` tem propriedade `totalItems`
  - `body.meta` tem propriedade `totalPages`
- **Estado atual: PASSA** — partners já conforme (não deve regredir).

## Critério de correção (o que o fix `HTTP-PAGINATION-HARMONIZE` deve fazer)

1. **contracts:** renomear `page → currentPage`, `limit → itemsPerPage`, `total → totalItems`; adicionar
   `itemCount` (número de itens retornados na página atual). Atualizar `contractListMetaSchema` em
   `src/modules/contracts/adapters/http/schemas.ts` e o mapper que monta o envelope `{ items, meta }`.

2. **auth (users):** renomear `pageSize → itemsPerPage`; adicionar `itemCount`. Atualizar
   `userPaginationMetaSchema` em `src/modules/auth/adapters/http/users-schemas.ts` e o mapper.

3. **partners:** sem alteração (já conforme — PAGE-HARM-3 permanece verde).

Após o fix, PAGE-HARM-1 e PAGE-HARM-2 passam; PAGE-HARM-3 permanece verde.
