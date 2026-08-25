# TDD — auth / 7-role-mgmt

Casos 1:1 com `api-collections/auth/7-role-mgmt/*.bru`. Asserções extraídas literalmente do bloco `tests {}`.

### 200-create-role-ok.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/roles` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body `{ name: "Gerente E2E", permissions: ["user:read","user:list"] }`. `script:post-response` captura `newRoleId` quando 201.
- **Asserções:**
  - `res.getStatus()` === 201
  - `res.getBody().id` é `string`
  - `res.getBody().id.length` > 0

### 201-create-role-duplicate.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/roles` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body com name "Gerente E2E" (já criado em 200).
- **Asserções:**
  - `res.getStatus()` === 409

### 202-create-role-bad-permission.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/roles` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body `{ name: "Bad Perms E2E", permissions: ["nao:existe"] }`.
- **Asserções:**
  - `res.getStatus()` === 422 (permissão fora do catálogo)

### 203-create-role-invalid-name.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/roles` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body `{ name: "   ", permissions: [] }` (espaços que passam Zod min(1) e caem no domínio).
- **Asserções:**
  - `res.getStatus()` === 422 (nome inválido no domínio)

### 204-create-role-no-token.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/roles` — auth: none
- **Pré-condições/seed:** body `{ name: "No Token E2E", permissions: [] }`; sem Authorization.
- **Asserções:**
  - `res.getStatus()` === 401

### 205-create-role-forbidden-bare.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/roles` — header `Authorization: Bearer {{bareToken}}`
- **Pré-condições/seed:** body `{ name: "Forbidden E2E", permissions: [] }`; `bareToken` sem `role:create`.
- **Asserções:**
  - `res.getStatus()` === 403

### 206-update-role-rename-ok.bru

- **Método/rota:** PUT `{{baseUrl}}/api/v1/roles/{{newRoleId}}` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body `{ name: "Gerente E2E Renomeado" }`; `newRoleId` de 200.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().name` === "Gerente E2E Renomeado"
  - `res.getBody().active` === true

### 207-update-role-permissions-ok.bru

- **Método/rota:** PUT `{{baseUrl}}/api/v1/roles/{{newRoleId}}` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body `{ permissions: ["user:read"] }`.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().permissions` é `array`
  - `res.getBody().permissions` inclui "user:read"

### 208-update-role-bad-permission.bru

- **Método/rota:** PUT `{{baseUrl}}/api/v1/roles/{{newRoleId}}` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body `{ name: "Gerente E2E Renomeado", permissions: ["nao:existe"] }`.
- **Asserções:**
  - `res.getStatus()` === 422 (permissão fora do catálogo)

### 209-update-role-not-found.bru

- **Método/rota:** PUT `{{baseUrl}}/api/v1/roles/00000000-0000-4000-a000-000000000000` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body `{ name: "X" }`; id inexistente.
- **Asserções:**
  - `res.getStatus()` === 404

### 210-update-role-no-token.bru

- **Método/rota:** PUT `{{baseUrl}}/api/v1/roles/{{newRoleId}}` — auth: none
- **Pré-condições/seed:** body `{ name: "Sem Token" }`; sem Authorization.
- **Asserções:**
  - `res.getStatus()` === 401

### 211-update-role-forbidden-bare.bru

- **Método/rota:** PUT `{{baseUrl}}/api/v1/roles/{{newRoleId}}` — header `Authorization: Bearer {{bareToken}}`
- **Pré-condições/seed:** body `{ name: "Forbidden Update" }`; `bareToken` sem `role:update`.
- **Asserções:**
  - `res.getStatus()` === 403

### 212-deactivate-role-ok.bru

- **Método/rota:** PATCH `{{baseUrl}}/api/v1/roles/{{newRoleId}}/deactivate` — body: none — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `newRoleId` não atribuído a nenhum usuário.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().active` === false

### 213-me-recapture-bare-id.bru

- **Método/rota:** GET `{{baseUrl}}/api/v2/auth/me` — header `Authorization: Bearer {{bareToken}}`
- **Pré-condições/seed:** `bareToken`. `script:post-response` re-captura `bareUserId` quando 200.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().userId` é `string`

### 214-create-inuse-role.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/roles` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body `{ name: "Em Uso E2E", permissions: ["user:read"] }`. `script:post-response` captura `inUseRoleId` quando 201.
- **Asserções:**
  - `res.getStatus()` === 201
  - `res.getBody().id` é `string`

### 215-assign-inuse-role.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/users/{{bareUserId}}/roles` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body `{ roleId: {{inUseRoleId}} }`.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().assigned` === true

### 216-deactivate-role-in-use.bru

- **Método/rota:** PATCH `{{baseUrl}}/api/v1/roles/{{inUseRoleId}}/deactivate` — body: none — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `inUseRoleId` atribuído a um usuário (junção `auth_user_role`); caso validado pelo MySQL real (`isInUse`).
- **Asserções:**
  - `res.getStatus()` === 409 (FR-012: papel em uso)

### 217-revoke-inuse-role.bru

- **Método/rota:** DELETE `{{baseUrl}}/api/v1/users/{{bareUserId}}/roles/{{inUseRoleId}}` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** higiene — bare possui `inUseRoleId`.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().revoked` === true

### 218-deactivate-role-no-token.bru

- **Método/rota:** PATCH `{{baseUrl}}/api/v1/roles/{{inUseRoleId}}/deactivate` — body: none — auth: none
- **Pré-condições/seed:** sem Authorization.
- **Asserções:**
  - `res.getStatus()` === 401

### 219-deactivate-role-forbidden-bare.bru

- **Método/rota:** PATCH `{{baseUrl}}/api/v1/roles/{{inUseRoleId}}/deactivate` — body: none — header `Authorization: Bearer {{bareToken}}`
- **Pré-condições/seed:** `bareToken` sem `role:update`.
- **Asserções:**
  - `res.getStatus()` === 403
