# TDD — partners / collaborators (rede de segurança 1:1)

> Fonte read-only: `api-collections/partners/collaborators/*.bru`. Um caso por request.
> Asserções literais do bloco `tests {}`. Sem asserção → `**smoke-only**`.

## collaborators/01-list-no-auth.bru (seq 30)

- **Método + rota:** GET `{{baseUrl}}/api/v1/collaborators`
- **Auth:** none
- **Pré-condições:** nenhum token enviado.
- **Asserções:**
  - `res.getStatus()` é `401`.

## collaborators/02-list-bare-user-403.bru (seq 31)

- **Método + rota:** GET `{{baseUrl}}/api/v1/collaborators`
- **Auth:** bearer `{{bareUserToken}}`
- **Pré-condições:** usuário pelado sem `collaborator:read`.
- **Asserções:**
  - `res.getStatus()` é `403`.

## collaborators/03-create-collaborator.bru (seq 32)

- **Método + rota:** POST `{{baseUrl}}/api/v1/collaborators`
- **Auth:** bearer `{{operatorToken}}`
- **Body:** colaborador válido (name, email, cpf `12345678901`, occupationArea `PARC`, role, startOfContract, employmentRelationship `CLT`).
- **Side-effect:** `script:post-response` grava `collaboratorCreatedId` a partir do header `location`.
- **Pré-condições:** operador autenticado.
- **Asserções:**
  - `res.getStatus()` é `201`.
  - `res.getHeader("location")` é `string` e contém `"/api/v1/collaborators/"`.

## collaborators/04-get-collaborator-by-id.bru (seq 33)

- **Método + rota:** GET `{{baseUrl}}/api/v1/collaborators/{{collaboratorCreatedId}}`
- **Auth:** bearer `{{operatorToken}}`
- **Pré-condições:** colaborador criado (`collaboratorCreatedId`).
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `res.getBody().id` é igual a `bru.getVar("collaboratorCreatedId")`.
  - `res.getBody().cpf` é `"12345678901"`.
  - `res.getBody().active` é `true`.
  - `res.getBody().status` é `"PreRegistration"`.
  - `body` tem `id`, `name`, `email`, `cpf`, `occupationArea`, `role`, `employmentRelationship`, `status`, `active`, `createdAt`, `updatedAt`.

## collaborators/05-list-contains-created.bru (seq 34)

- **Método + rota:** GET `{{baseUrl}}/api/v1/collaborators`
- **Auth:** bearer `{{operatorToken}}`
- **Pré-condições:** colaborador já criado.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `body` tem `items` e `meta`; `body.items` é array.
  - `meta` tem `itemCount`, `totalItems`, `itemsPerPage`, `totalPages`, `currentPage`.
  - a lista contém o item cujo `id === collaboratorCreatedId` (`found` não é `undefined`).

## collaborators/06-complete-registration.bru (seq 35)

- **Método + rota:** PATCH `{{baseUrl}}/api/v1/collaborators/{{collaboratorCreatedId}}/complete-registration`
- **Auth:** bearer `{{operatorToken}}`
- **Body:** dados complementares (rg, dateOfBirth, genderIdentity, race, education, endereço, telefones, etc.).
- **Pré-condições:** colaborador em `PreRegistration`.
- **Asserções:**
  - `res.getStatus()` é `200`. (responde sem corpo; transição validada via status no GET seguinte.)

## collaborators/07-get-after-complete.bru (seq 36)

- **Método + rota:** GET `{{baseUrl}}/api/v1/collaborators/{{collaboratorCreatedId}}`
- **Auth:** bearer `{{operatorToken}}`
- **Pré-condições:** colaborador com cadastro completado.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `res.getBody().status` é `"Complete"`.

## collaborators/08-update-collaborator.bru (seq 37)

- **Método + rota:** PUT `{{baseUrl}}/api/v1/collaborators/{{collaboratorCreatedId}}`
- **Auth:** bearer `{{operatorToken}}`
- **Body:** atualização total do colaborador.
- **Pré-condições:** colaborador existente.
- **Asserções:**
  - `res.getStatus()` é `200`. (PUT total responde sem corpo.)

## collaborators/09-deactivate-collaborator.bru (seq 38)

- **Método + rota:** POST `{{baseUrl}}/api/v1/collaborators/{{collaboratorCreatedId}}/deactivate`
- **Auth:** bearer `{{operatorToken}}`
- **Body:** `{ disableBy: "DESLIGAMENTO_ABC" }`
- **Pré-condições:** colaborador ativo.
- **Asserções:**
  - `res.getStatus()` é `200`. (responde sem corpo; transição validada via status.)

## collaborators/10-reactivate-collaborator.bru (seq 39)

- **Método + rota:** POST `{{baseUrl}}/api/v1/collaborators/{{collaboratorCreatedId}}/reactivate`
- **Auth:** bearer `{{operatorToken}}`
- **Body:** none
- **Pré-condições:** colaborador desativado.
- **Asserções:**
  - `res.getStatus()` é `200`. (responde sem corpo; transição validada via status.)

## collaborators/11-import-csv-empty.bru (seq 40)

- **Método + rota:** POST `{{baseUrl}}/api/v1/collaborators/import`
- **Auth:** bearer `{{operatorToken}}` · header `content-type: text/csv`
- **Body:** CSV vazio.
- **Pré-condições:** operador autenticado.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `res.getBody().created` é `0`.
  - `res.getBody().failed` é array com `length === 0`.

## collaborators/12-import-csv-valid.bru (seq 41)

- **Método + rota:** POST `{{baseUrl}}/api/v1/collaborators/import`
- **Auth:** bearer `{{operatorToken}}` · header `content-type: text/csv`
- **Body:** CSV com 2 linhas válidas.
- **Pré-condições:** operador autenticado.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `res.getBody().created` é no mínimo `1`.
  - `res.getBody().failed` é array.
  - cada falha tem `line` e `error`.

## collaborators/13-import-csv-malformed.bru (seq 42)

- **Método + rota:** POST `{{baseUrl}}/api/v1/collaborators/import`
- **Auth:** bearer `{{operatorToken}}` · header `content-type: text/csv`
- **Body:** CSV malformado.
- **Pré-condições:** operador autenticado.
- **Asserções:**
  - `res.getStatus()` é `400`.
  - `body` tem `error`; `body.error` tem `code` e `requestId`.

## collaborators/14-export-csv.bru (seq 43)

- **Método + rota:** GET `{{baseUrl}}/api/v1/collaborators/export`
- **Auth:** bearer `{{operatorToken}}`
- **Pré-condições:** operador com `collaborator:read`.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `content-type` inclui `"text/csv"`.
  - `content-disposition` inclui `"attachment"` e `".csv"`.
  - `x-content-type-options` é `"nosniff"`.

## collaborators/15-export-csv-403.bru (seq 44)

- **Método + rota:** GET `{{baseUrl}}/api/v1/collaborators/export`
- **Auth:** bearer `{{bareUserToken}}`
- **Pré-condições:** usuário pelado sem `collaborator:read`.
- **Asserções:**
  - `res.getStatus()` é `403`.
