# TDD — auth / 6-roles

Casos 1:1 com `api-collections/auth/6-roles/*.bru`. Asserções extraídas literalmente do bloco `tests {}`.

### 100-me-capture-bare-id.bru

- **Método/rota:** GET `{{baseUrl}}/api/v2/auth/me` — header `Authorization: Bearer {{bareToken}}`
- **Pré-condições/seed:** `bareToken`. `script:post-response` captura `bareUserId` quando 200.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().userId` é `string`

### 101-list-roles-ok.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/roles` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`. `script:post-response` captura `adminRoleId` (role com `user:assign-role`) e `assignableRoleId` (role com permissions vazias).
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().items` é `array`
  - cada item tem propriedades `id`, `name`, `active`, `permissions` (sendo `permissions` um `array`)
  - existe role de gestão: `items.find(r => r.permissions.includes("user:assign-role"))` é `object`
  - existe role atribuível: `items.find(r => r.permissions.length === 0)` é `object`

### 102-list-roles-no-token.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/roles` — auth: none
- **Pré-condições/seed:** sem token.
- **Asserções:**
  - `res.getStatus()` === 401

### 103-list-roles-forbidden-bare.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/roles` — header `Authorization: Bearer {{bareToken}}`
- **Pré-condições/seed:** `bareToken` sem `role:read`.
- **Asserções:**
  - `res.getStatus()` === 403

### 104-assign-role-ok.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/users/{{bareUserId}}/roles` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body `{ roleId: {{adminRoleId}} }`.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().assigned` === true

### 105-assign-role-idempotent.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/users/{{bareUserId}}/roles` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body `{ roleId: {{adminRoleId}} }` (já atribuído em 104).
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().assigned` === true

### 106-confirm-propagation.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/users/{{bareUserId}}/permissions` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** bare recebeu a role de gestão em 104.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().permissions` é `array`
  - `res.getBody().permissions` inclui "user:assign-role"

### 107-revoke-role-ok.bru

- **Método/rota:** DELETE `{{baseUrl}}/api/v1/users/{{bareUserId}}/roles/{{adminRoleId}}` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** bare possui `adminRoleId`.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().revoked` === true

### 108-revoke-role-idempotent.bru

- **Método/rota:** DELETE `{{baseUrl}}/api/v1/users/{{bareUserId}}/roles/{{adminRoleId}}` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** role já revogado em 107.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().revoked` === true

### 109-assign-role-no-token.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/users/{{bareUserId}}/roles` — auth: none
- **Pré-condições/seed:** body `{ roleId: {{adminRoleId}} }`; sem token.
- **Asserções:**
  - `res.getStatus()` === 401

### 110-assign-role-forbidden-bare.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/users/{{bareUserId}}/roles` — header `Authorization: Bearer {{bareToken}}`
- **Pré-condições/seed:** body `{ roleId: {{assignableRoleId}} }`; `bareToken` sem `user:assign-role`.
- **Asserções:**
  - `res.getStatus()` === 403

### 120-revoke-self-lockout.bru

- **Método/rota:** DELETE `{{baseUrl}}/api/v1/users/{{adminUserId}}/roles/{{adminRoleId}}` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** ator tenta revogar o próprio role.
- **Asserções:**
  - `res.getStatus()` === 422 (FR-010: ator não se auto-bloqueia)
