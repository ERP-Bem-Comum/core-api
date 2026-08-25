# TDD — auth / 2-users

Casos 1:1 com `api-collections/auth/2-users/*.bru`. Asserções extraídas literalmente do bloco `tests {}`.

### 10-list-no-token.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/users` — auth: none
- **Pré-condições/seed:** sem header Authorization.
- **Asserções:**
  - `res.getStatus()` === 401

### 11-list-forbidden-bare.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/users` — header `Authorization: Bearer {{bareToken}}`
- **Pré-condições/seed:** `bareToken` (usuário sem `user:list`).
- **Asserções:**
  - `res.getStatus()` === 403

### 12-list-ok.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/users?pageSize=5` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().items` é `array`
  - `res.getBody().meta` tem propriedade `currentPage`
  - `res.getBody().meta` tem propriedade `totalItems`
  - `items[0]` (ou `{}`) não tem propriedade `cpf`
  - `items[0]` não tem propriedade `telephone`
  - `items[0]` não tem propriedade `passwordHash`

### 13-list-pagesize-invalid.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/users?pageSize=7` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`.
- **Asserções:**
  - `res.getStatus()` === 400

### 14-list-search.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/users?search=amanda&pageSize=10` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().items` é `array`

### 15-list-filter-status.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/users?status=active&pageSize=10` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`.
- **Asserções:**
  - `res.getStatus()` === 200
  - para cada item de `res.getBody().items` (ou `[]`): `item.status` === "active"

### 16-list-status-invalid.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/users?status=xpto` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`.
- **Asserções:**
  - `res.getStatus()` === 400

### 17-list-search-too-long.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/users?search=<131 'a'>` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`. search > 128 chars.
- **Asserções:**
  - `res.getStatus()` === 400

### 20-create-no-token.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/users` — auth: none
- **Pré-condições/seed:** body `{ name, cpf: "52998224725", email: "sem-token-e2e@example.com", telephone }`.
- **Asserções:**
  - `res.getStatus()` === 401

### 21-create-forbidden-bare.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/users` — header `Authorization: Bearer {{bareToken}}`
- **Pré-condições/seed:** body válido; `bareToken` sem `user:create`.
- **Asserções:**
  - `res.getStatus()` === 403

### 22-create-ok.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/users` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `script:pre-request` gera `newEmail` único; body `{ name: "Amanda Manoel", cpf: "52998224725", email: {{newEmail}}, telephone }`. `script:post-response` captura `userId` quando 201.
- **Asserções:**
  - `res.getStatus()` === 201
  - `res.getBody().id` é `string`
  - `JSON.stringify(res.getBody())` não contém "passwordHash"
  - `res.getBody()` não tem propriedade `cpf`

### 23-create-dup-email.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/users` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body com `email: {{newEmail}}` (já registrado em 22).
- **Asserções:**
  - `res.getStatus()` === 409

### 24-create-invalid-cpf.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/users` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body com `cpf: "11111111111"` (checksum inválido).
- **Asserções:**
  - `res.getStatus()` === 422

### 25-create-invalid-email.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/users` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body com `email: "nao-eh-email"`.
- **Asserções:**
  - `res.getStatus()` === 422

### 26-create-empty-body.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/users` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body `{}`.
- **Asserções:**
  - `res.getStatus()` === 400

### 30-detail-ok.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/users/{{userId}}` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `userId` capturado em 22.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().id` === `bru.getVar("userId")`
  - `res.getBody()` tem propriedade `massApprovalPermission`
  - `res.getBody().cpf` === "52998224725"
  - `res.getBody().telephone` === "15997133502"
  - `JSON.stringify(res.getBody())` não contém "passwordHash"

### 31-detail-not-found.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/users/00000000-0000-4000-8000-000000000000` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** id válido inexistente.
- **Asserções:**
  - `res.getStatus()` === 404

### 32-detail-forbidden-bare.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/users/{{userId}}` — header `Authorization: Bearer {{bareToken}}`
- **Pré-condições/seed:** `bareToken` sem `user:read`.
- **Asserções:**
  - `res.getStatus()` === 403

### 40-update-ok.bru

- **Método/rota:** PUT `{{baseUrl}}/api/v1/users/{{userId}}` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body `{ name: "Amanda Souza", telephone: "15991111111" }`.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().name` === "Amanda Souza"
  - `res.getBody().telephone` === "15991111111"
  - `res.getBody().cpf` === "52998224725" (campo não enviado preservado)

### 41-update-conflict-email.bru

- **Método/rota:** PUT `{{baseUrl}}/api/v1/users/{{userId}}` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body `{ email: {{adminEmail}} }` (e-mail de outro usuário).
- **Asserções:**
  - `res.getStatus()` === 409

### 42-update-invalid-cpf.bru

- **Método/rota:** PUT `{{baseUrl}}/api/v1/users/{{userId}}` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body `{ cpf: "11111111111" }`.
- **Asserções:**
  - `res.getStatus()` === 422

### 43-update-not-found.bru

- **Método/rota:** PUT `{{baseUrl}}/api/v1/users/00000000-0000-4000-8000-000000000000` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body `{ name: "Fantasma" }`; id inexistente.
- **Asserções:**
  - `res.getStatus()` === 404

### 50-deactivate-ok.bru

- **Método/rota:** PATCH `{{baseUrl}}/api/v1/users/{{userId}}/deactivate` — body: none — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `userId` ativo.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().active` === false

### 51-deactivate-idempotent.bru

- **Método/rota:** PATCH `{{baseUrl}}/api/v1/users/{{userId}}/deactivate` — body: none — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `userId` já desativado em 50.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().active` === false

### 52-activate-ok.bru

- **Método/rota:** PATCH `{{baseUrl}}/api/v1/users/{{userId}}/activate` — body: none — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `userId` desativado.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().active` === true

### 53-deactivate-self.bru

- **Método/rota:** PATCH `{{baseUrl}}/api/v1/users/{{adminId}}/deactivate` — body: none — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminId` é a própria conta do ator.
- **Asserções:**
  - `res.getStatus()` === 422 (anti-lockout)

### 54-status-not-found.bru

- **Método/rota:** PATCH `{{baseUrl}}/api/v1/users/00000000-0000-4000-8000-000000000000/activate` — body: none — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** id inexistente.
- **Asserções:**
  - `res.getStatus()` === 404

### 55-deactivate-forbidden-bare.bru

- **Método/rota:** PATCH `{{baseUrl}}/api/v1/users/{{userId}}/deactivate` — body: none — header `Authorization: Bearer {{bareToken}}`
- **Pré-condições/seed:** `bareToken` sem `user:deactivate`.
- **Asserções:**
  - `res.getStatus()` === 403

### 70-photo-upload-ok.bru

- **Método/rota:** PUT `{{baseUrl}}/api/v1/users/{{userId}}/photo?mimeType=image/jpeg` — body: file (`assets/sample.jpg`, `Content-Type: application/octet-stream`) — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `userId` existente. `script:post-response` captura `photoUrl` quando 200.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().imageUrl` é `string`
  - `res.getBody().imageUrl` não é vazia (`.to.not.be.empty`)
  - `JSON.stringify(res.getBody())` não contém "passwordHash"

### 71-photo-upload-invalid-mime.bru

- **Método/rota:** PUT `{{baseUrl}}/api/v1/users/{{userId}}/photo?mimeType=application/pdf` — body: file — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** mime não suportado.
- **Asserções:**
  - `res.getStatus()` === 422

### 72-photo-delete-ok.bru

- **Método/rota:** DELETE `{{baseUrl}}/api/v1/users/{{userId}}/photo` — body: none — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `userId` com foto.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().imageUrl` é `null`
