# TDD — auth / 4-me

Casos 1:1 com `api-collections/auth/4-me/*.bru`. Asserções extraídas literalmente do bloco `tests {}`.

### 80-me-get.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/me` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken` (admin seed).
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().email` === "admin.e2e@bemcomum.dev"
  - `JSON.stringify(res.getBody())` não contém "passwordHash"

### 81-me-update.bru

- **Método/rota:** PUT `{{baseUrl}}/api/v1/me` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** body `{ name: "Admin E2E", telephone: "15991110000" }`.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().name` === "Admin E2E"
  - `res.getBody().telephone` === "15991110000"
  - `res.getBody().email` === "admin.e2e@bemcomum.dev" (email preservado, patch semântico)
  - `JSON.stringify(res.getBody())` não contém "passwordHash"

### 82-me-password-reset.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/me/password-reset` — body: none — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`.
- **Asserções:**
  - `res.getStatus()` === 202
