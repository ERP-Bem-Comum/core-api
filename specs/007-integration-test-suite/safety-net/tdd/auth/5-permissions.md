# TDD — auth / 5-permissions

Casos 1:1 com `api-collections/auth/5-permissions/*.bru`. Asserções extraídas literalmente do bloco `tests {}`.

### 90-catalog-ok.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/permissions` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().items` é `array`
  - `res.getBody().items.length` > 0
  - cada item tem propriedades `id`, `resource`, `action`
  - sem ids duplicados: `new Set(ids).size` === `ids.length`
  - `ids` inclui "role:read"
  - `ids` inclui "user:list"

### 91-catalog-no-token.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/permissions` — auth: none
- **Pré-condições/seed:** sem token.
- **Asserções:**
  - `res.getStatus()` === 401

### 92-catalog-forbidden-bare.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/permissions` — header `Authorization: Bearer {{bareToken}}`
- **Pré-condições/seed:** `bareToken` sem `role:read`.
- **Asserções:**
  - `res.getStatus()` === 403

### 93-catalog-post-readonly.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/permissions` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body `{ resource: "hack", action: "create" }`.
- **Asserções:**
  - `res.getStatus()` === 404 (FR-011: catálogo imutável)

### 94-me-capture-admin-id.bru

- **Método/rota:** GET `{{baseUrl}}/api/v2/auth/me` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`. `script:post-response` captura `adminUserId` quando 200.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().userId` é `string`

### 95-user-permissions-ok.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/users/{{adminUserId}}/permissions` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminUserId` capturado em 94.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().permissions` é `array`
  - `res.getBody().permissions` inclui "role:read"

### 96-user-permissions-not-found.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/users/00000000-0000-4000-a000-000000000000/permissions` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** id inexistente.
- **Asserções:**
  - `res.getStatus()` === 404

### 97-user-permissions-forbidden-bare.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/users/{{adminUserId}}/permissions` — header `Authorization: Bearer {{bareToken}}`
- **Pré-condições/seed:** `bareToken` sem `role:read`.
- **Asserções:**
  - `res.getStatus()` === 403
