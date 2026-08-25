# TDD — Regressão de fix: header Location em respostas 201 Created

> **Dimensão:** Conformidade com o protocolo HTTP/REST (RFC 7231 §6.3.2 / §7.1.2).
> **Tipo:** REGRESSÃO DE FIX — asserções do estado CORRETO. **DEVEM REPROVAR** enquanto o bug
> existir; pela política de regressão zero, força a adição de `.header('location', ...)` nas
> rotas de criação dos módulos contracts e auth (ticket `HTTP-LOCATION-HEADER-201`).
>
> **Achado:** `POST /api/v2/contracts`, `POST /api/v1/users` e `POST /api/v1/roles` retornam
> 201 Created com `{ id }` só no body, sem o header `Location`. RFC 7231 §6.3.2 diz que uma
> resposta 201 SHOULD incluir o header Location com a URI do recurso criado. O módulo partners
> já segue o padrão (`supplier-plugin.ts:192`: `.header('location', '/api/v1/suppliers/${id}')`).
>
> **Fundamento canônico — RFC 7231 §6.3.2:** "If the resource was created, the origin server
> SHOULD send a 201 (Created) response. [...] The Location header field value MAY refer to
> the URI of the new resource."

## Pré-condições (seed)

- `contractsOperatorToken` com `contract:write` (login via `0-auth/05-login-contracts-operator.bru`).
- `adminToken` com `user:create` e `role:create` (login via `0-auth/02-login-admin.bru`).
- `partnersOperatorToken` com `supplier:write` (login via `0-auth/06-login-partners-operator.bru`).
- Coleção `.bru`: `api-collections/core-api/z-pending-fixes/location/`.

## LOC-1 — POST /api/v2/contracts retorna Location

- **Arquivo `.bru`:** `z-pending-fixes/location/01-loc-contract.bru`
- **POST** `/api/v2/contracts` (Bearer contractsOperatorToken)
- **Body:**
  ```json
  {
    "mode": "Pending",
    "sequentialNumber": "002/2026",
    "title": "Contrato LOC Regressão",
    "objective": "Objetivo LOC",
    "originalValueCents": 50000,
    "periodStart": "2026-01-01",
    "periodEnd": "2026-12-31",
    "contractor": { "type": "supplier", "id": "{{contractorSupplierId}}" }
  }
  ```
- **Asserções:**
  - `status === 201`
  - `res.getHeader('location')` é string
  - `res.getHeader('location')` contém `/contracts/`
- **Estado atual: REPROVA** — contracts não retorna `Location`.

## LOC-2 — POST /api/v1/users retorna Location

- **Arquivo `.bru`:** `z-pending-fixes/location/02-loc-user.bru`
- **POST** `/api/v1/users` (Bearer adminToken)
- **Body:**
  ```json
  {
    "name": "LOC Regressao User",
    "cpf": "52998224725",
    "email": "loc-regression-<timestamp>@example.com",
    "telephone": "15997133502"
  }
  ```
  (email único via `script:pre-request` com `Date.now()`)
- **Asserções:**
  - `status === 201`
  - `res.getHeader('location')` é string
  - `res.getHeader('location')` contém `/users/`
- **Estado atual: REPROVA** — auth/users não retorna `Location`.

## LOC-3 — POST /api/v1/roles retorna Location

- **Arquivo `.bru`:** `z-pending-fixes/location/03-loc-role.bru`
- **POST** `/api/v1/roles` (Bearer adminToken)
- **Body:**
  ```json
  {
    "name": "LOC Papel <timestamp>",
    "permissions": ["role:read"]
  }
  ```
  (nome único via `script:pre-request` com `Date.now()`)
- **Asserções:**
  - `status === 201`
  - `res.getHeader('location')` é string
  - `res.getHeader('location')` contém `/roles/`
- **Estado atual: REPROVA** — auth/roles não retorna `Location`.

## LOC-4 — POST /api/v1/suppliers já retorna Location (guarda de não-regressão)

- **Arquivo `.bru`:** `z-pending-fixes/location/04-loc-supplier-guard.bru`
- **POST** `/api/v1/suppliers` (Bearer partnersOperatorToken)
- **Body:** fornecedor com CNPJ único por execução, nome, email, corporateName, fantasyName, serviceCategory, bankAccount.
- **Asserções:**
  - `status === 201`
  - `res.getHeader('location')` é string
  - `res.getHeader('location')` contém `/api/v1/suppliers/`
- **Estado atual: PASSA** — partners já conforme (não deve regredir).

## Critério de correção (o que o fix `HTTP-LOCATION-HEADER-201` deve fazer)

Adicionar `.header('location', '/api/v2/contracts/' + id)` ao handler de `POST /api/v2/contracts`
e `.header('location', '/api/v1/users/' + id)` / `.header('location', '/api/v1/roles/' + id)` aos
handlers de POST do módulo auth — espelhando o padrão de partners. Manter `{ id }` no body para
compatibilidade com o front atual. Após o fix, LOC-1, LOC-2 e LOC-3 passam; LOC-4 permanece verde.
