# TDD — partners / suppliers (rede de segurança 1:1)

> Fonte read-only: `api-collections/partners/suppliers/*.bru`. Um caso por request.
> Asserções literais do bloco `tests {}`. Sem asserção → `**smoke-only**`.

## suppliers/01-list-no-auth.bru (seq 10)

- **Método + rota:** GET `{{baseUrl}}/api/v1/suppliers`
- **Auth:** none
- **Pré-condições:** nenhum token enviado.
- **Asserções:**
  - `res.getStatus()` é `401`.

## suppliers/02-list-bare-user-403.bru (seq 11)

- **Método + rota:** GET `{{baseUrl}}/api/v1/suppliers`
- **Auth:** bearer `{{bareUserToken}}`
- **Pré-condições:** usuário pelado sem permissão.
- **Asserções:**
  - `res.getStatus()` é `403`.

## suppliers/03-create-supplier.bru (seq 12)

- **Método + rota:** POST `{{baseUrl}}/api/v1/suppliers`
- **Auth:** bearer `{{operatorToken}}`
- **Body:** fornecedor válido (name, email, cnpj `11222333000181`, corporateName, fantasyName, serviceCategory `INFORMATICA`, bankAccount, pixKey null).
- **Side-effect:** `script:post-response` grava `supplierCreatedId` a partir do header `location`.
- **Pré-condições:** operador autenticado.
- **Asserções:**
  - `res.getStatus()` é `201`.
  - `res.getHeader("location")` é `string` e contém `"/api/v1/suppliers/"`.

## suppliers/04-get-supplier-by-id.bru (seq 13)

- **Método + rota:** GET `{{baseUrl}}/api/v1/suppliers/{{supplierCreatedId}}`
- **Auth:** bearer `{{operatorToken}}`
- **Pré-condições:** fornecedor criado (`supplierCreatedId`).
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `res.getBody().id` é igual a `bru.getVar("supplierCreatedId")`.
  - `res.getBody().cnpj` é `"11222333000181"`.
  - `res.getBody().active` é `true`.
  - `body` tem `id`, `name`, `email`, `corporateName`, `fantasyName`, `serviceCategory`.

## suppliers/05-list-contains-created.bru (seq 14)

- **Método + rota:** GET `{{baseUrl}}/api/v1/suppliers`
- **Auth:** bearer `{{operatorToken}}`
- **Pré-condições:** fornecedor já criado.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `body` tem `items` e `meta`; `body.items` é array.
  - a lista contém o item cujo `id === supplierCreatedId` (`found` existe).

## suppliers/06-deactivate-supplier.bru (seq 15)

- **Método + rota:** POST `{{baseUrl}}/api/v1/suppliers/{{supplierCreatedId}}/deactivate`
- **Auth:** bearer `{{operatorToken}}` · body none
- **Pré-condições:** fornecedor ativo.
- **Asserções:**
  - `res.getStatus()` é `200`. (responde sem corpo; transição validada via status.)

## suppliers/07-reactivate-supplier.bru (seq 16)

- **Método + rota:** POST `{{baseUrl}}/api/v1/suppliers/{{supplierCreatedId}}/reactivate`
- **Auth:** bearer `{{operatorToken}}` · body none
- **Pré-condições:** fornecedor desativado.
- **Asserções:**
  - `res.getStatus()` é `200`. (responde sem corpo; transição validada via status.)

## suppliers/08-update-supplier.bru (seq 17)

- **Método + rota:** PUT `{{baseUrl}}/api/v1/suppliers/{{supplierCreatedId}}`
- **Auth:** bearer `{{operatorToken}}`
- **Body:** atualização total do fornecedor (serviceCategory `CONSULTORIA`).
- **Pré-condições:** fornecedor existente.
- **Asserções:**
  - `res.getStatus()` é `200`. (PUT total responde sem corpo.)

## suppliers/09-export-csv.bru (seq 18)

- **Método + rota:** GET `{{baseUrl}}/api/v1/suppliers/export`
- **Auth:** bearer `{{operatorToken}}`
- **Pré-condições:** operador com leitura de fornecedor.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `content-type` inclui `"text/csv"`.
  - `content-disposition` inclui `"attachment"` e `".csv"`.
  - `x-content-type-options` é `"nosniff"`.

## suppliers/10-service-categories.bru (seq 19)

- **Método + rota:** GET `{{baseUrl}}/api/v1/suppliers/service-categories`
- **Auth:** bearer `{{operatorToken}}`
- **Pré-condições:** operador autenticado.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `body` é um array; cada `cat` é do tipo `string`.
  - `res.getBody().length` é igual a `39`.
