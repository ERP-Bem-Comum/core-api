# TDD — partners / territory (rede de segurança 1:1)

> Fonte read-only: `api-collections/partners/territory/*.bru`. Um caso por request.
> Asserções literais do bloco `tests {}`. Sem asserção → `**smoke-only**`.

## territory/01-states-no-auth.bru (seq 50)

- **Método + rota:** GET `{{baseUrl}}/api/v1/partner-states`
- **Auth:** none
- **Pré-condições:** nenhum token enviado.
- **Asserções:**
  - `res.getStatus()` é `401`.

## territory/02-states-bare-user-403.bru (seq 51)

- **Método + rota:** GET `{{baseUrl}}/api/v1/partner-states`
- **Auth:** bearer `{{bareUserToken}}`
- **Pré-condições:** usuário pelado sem `geography:read`.
- **Asserções:**
  - `res.getStatus()` é `403`.

## territory/03-list-partner-states.bru (seq 52)

- **Método + rota:** GET `{{baseUrl}}/api/v1/partner-states`
- **Auth:** bearer `{{operatorToken}}`
- **Pré-condições:** operador autenticado.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `body` é array com `length === 27`.
  - cada `item` tem `uf` (string) e `isPartner` (boolean).

## territory/04-toggle-state-activate.bru (seq 53)

- **Método + rota:** POST `{{baseUrl}}/api/v1/partner-states/SP`
- **Auth:** bearer `{{operatorToken}}` · body none
- **Pré-condições:** operador autenticado (toggle idempotente).
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `res.getBody().uf` é `"SP"`.
  - `res.getBody().isPartner` é `true`.

## territory/05-toggle-state-invalid-uf-400.bru (seq 54)

- **Método + rota:** POST `{{baseUrl}}/api/v1/partner-states/XX`
- **Auth:** bearer `{{operatorToken}}` · body none
- **Pré-condições:** operador autenticado; UF inválida.
- **Asserções:**
  - `res.getStatus()` é `400`.
  - `body` tem `error`; `body.error` tem `code` e `requestId`.

## territory/06-toggle-state-deactivate.bru (seq 55)

- **Método + rota:** DELETE `{{baseUrl}}/api/v1/partner-states/SP`
- **Auth:** bearer `{{operatorToken}}`
- **Pré-condições:** operador autenticado (toggle idempotente).
- **Asserções:**
  - `res.getStatus()` é `200`.

## territory/07-list-municipalities.bru (seq 56)

- **Método + rota:** GET `{{baseUrl}}/api/v1/partner-municipalities?uf=SP`
- **Auth:** bearer `{{operatorToken}}`
- **Side-effect:** `script:post-response` grava `sampleIbgeCode = body[0].ibgeCode`.
- **Pré-condições:** operador autenticado.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `body` é array com `length >= 1`.
  - cada um dos 3 primeiros (`body.slice(0,3)`) tem `ibgeCode` (string), `uf === "SP"`, `name`, `isPartner` (boolean).
  - `body[0].ibgeCode` casa com `/^\d{7}$/`.

## territory/08-toggle-municipality-activate.bru (seq 57)

- **Método + rota:** POST `{{baseUrl}}/api/v1/partner-municipalities/{{sampleIbgeCode}}`
- **Auth:** bearer `{{operatorToken}}` · body none
- **Pré-condições:** operador autenticado; `sampleIbgeCode` válido (toggle idempotente).
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `res.getBody().isPartner` é `true`.
  - `res.getBody().name` é do tipo `string`.

## territory/09-toggle-municipality-invalid-code-400.bru (seq 58)

- **Método + rota:** POST `{{baseUrl}}/api/v1/partner-municipalities/0000000`
- **Auth:** bearer `{{operatorToken}}` · body none
- **Pré-condições:** operador autenticado; ibgeCode inválido.
- **Asserções:**
  - `res.getStatus()` é `400`.
  - `body` tem `error`; `body.error` tem `code` e `requestId`.

## territory/10-toggle-municipality-deactivate.bru (seq 59)

- **Método + rota:** DELETE `{{baseUrl}}/api/v1/partner-municipalities/{{sampleIbgeCode}}`
- **Auth:** bearer `{{operatorToken}}`
- **Pré-condições:** operador autenticado; `sampleIbgeCode` válido (toggle idempotente).
- **Asserções:**
  - `res.getStatus()` é `200`.
