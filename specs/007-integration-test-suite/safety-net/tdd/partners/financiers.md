# TDD — partners / financiers (rede de segurança 1:1)

> Fonte read-only: `api-collections/partners/financiers/*.bru`. Um caso por request.
> Asserções literais do bloco `tests {}`. Sem asserção → `**smoke-only**`.

## financiers/01-list-no-auth.bru (seq 20)

- **Método + rota:** GET `{{baseUrl}}/api/v1/financiers`
- **Auth:** none
- **Pré-condições:** nenhum token enviado.
- **Asserções:**
  - `res.getStatus()` é `401`.

## financiers/02-list-bare-user-403.bru (seq 21)

- **Método + rota:** GET `{{baseUrl}}/api/v1/financiers`
- **Auth:** bearer `{{bareUserToken}}`
- **Pré-condições:** usuário pelado sem permissão.
- **Asserções:**
  - `res.getStatus()` é `403`.

## financiers/03-create-financier.bru (seq 22)

- **Método + rota:** POST `{{baseUrl}}/api/v1/financiers`
- **Auth:** bearer `{{operatorToken}}`
- **Body:** financiador válido (name, corporateName, legalRepresentative, cnpj `11444777000161`, telephone, address).
- **Side-effect:** `script:post-response` grava `financierCreatedId` a partir do header `location`.
- **Pré-condições:** operador autenticado.
- **Asserções:**
  - `res.getStatus()` é `201`.
  - `res.getHeader("location")` é `string` e contém `"/api/v1/financiers/"`.

## financiers/04-get-financier-by-id.bru (seq 23)

- **Método + rota:** GET `{{baseUrl}}/api/v1/financiers/{{financierCreatedId}}`
- **Auth:** bearer `{{operatorToken}}`
- **Pré-condições:** financiador criado (`financierCreatedId`).
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `res.getBody().id` é igual a `bru.getVar("financierCreatedId")`.
  - `res.getBody().cnpj` é `"11444777000161"`.
  - `res.getBody().active` é `true`.
  - `body` tem `id`, `name`, `corporateName`, `legalRepresentative`, `cnpj`, `telephone`, `address`.

## financiers/05-list-contains-created.bru (seq 24)

- **Método + rota:** GET `{{baseUrl}}/api/v1/financiers`
- **Auth:** bearer `{{operatorToken}}`
- **Pré-condições:** financiador já criado.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `body` tem `items` e `meta`; `body.items` é array.
  - a lista contém o item cujo `id === financierCreatedId` (`found` existe).

## financiers/06-deactivate-financier.bru (seq 25)

- **Método + rota:** POST `{{baseUrl}}/api/v1/financiers/{{financierCreatedId}}/deactivate`
- **Auth:** bearer `{{operatorToken}}` · body none
- **Pré-condições:** financiador ativo.
- **Asserções:**
  - `res.getStatus()` é `200`. (responde sem corpo; transição validada via status.)

## financiers/07-reactivate-financier.bru (seq 26)

- **Método + rota:** POST `{{baseUrl}}/api/v1/financiers/{{financierCreatedId}}/reactivate`
- **Auth:** bearer `{{operatorToken}}` · body none
- **Pré-condições:** financiador desativado.
- **Asserções:**
  - `res.getStatus()` é `200`. (responde sem corpo; transição validada via status.)

## financiers/08-update-financier.bru (seq 27)

- **Método + rota:** PUT `{{baseUrl}}/api/v1/financiers/{{financierCreatedId}}`
- **Auth:** bearer `{{operatorToken}}`
- **Body:** atualização total do financiador.
- **Pré-condições:** financiador existente.
- **Asserções:**
  - `res.getStatus()` é `200`. (PUT total responde sem corpo.)

## financiers/09-export-csv.bru (seq 28)

- **Método + rota:** GET `{{baseUrl}}/api/v1/financiers/export`
- **Auth:** bearer `{{operatorToken}}`
- **Pré-condições:** operador com `financier:read`.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `content-type` inclui `"text/csv"`.
  - `content-disposition` inclui `"attachment"` e `".csv"`.
  - `x-content-type-options` é `"nosniff"`.

## financiers/10-export-csv-403.bru (seq 29)

- **Método + rota:** GET `{{baseUrl}}/api/v1/financiers/export`
- **Auth:** bearer `{{bareUserToken}}`
- **Pré-condições:** usuário pelado sem `financier:read`.
- **Asserções:**
  - `res.getStatus()` é `403`.
