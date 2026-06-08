# TDD — auth / 1-auth

Casos 1:1 com `api-collections/auth/1-auth/*.bru`. Asserções extraídas literalmente do bloco `tests {}`.

### 00-health.bru

- **Método/rota:** GET `{{baseUrl}}/health` — auth: none
- **Pré-condições/seed:** servidor no ar.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().status` === "ok"

### 01-login-admin.bru

- **Método/rota:** POST `{{baseUrl}}/api/v2/auth/login` — auth: none
- **Pré-condições/seed:** body `{ email: {{adminEmail}}, password: {{process.env.E2E_SEED_PASSWORD}} }`. `script:post-response` captura `adminToken` quando 200.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().accessToken` é `string`
  - `res.getBody().accessToken.length` > 20
  - `JSON.stringify(res.getBody())` não contém "passwordHash"

### 02-me-admin.bru

- **Método/rota:** GET `{{baseUrl}}/api/v2/auth/me` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken` capturado em 01. `script:post-response` captura `adminId` quando 200.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().userId` é `string`
  - `res.getBody().permissions` é `array`
  - `res.getBody().permissions` inclui "user:create"
  - `res.getBody().permissions` inclui "user:deactivate"

### 03-login-bare.bru

- **Método/rota:** POST `{{baseUrl}}/api/v2/auth/login` — auth: none
- **Pré-condições/seed:** body `{ email: {{bareEmail}}, password: {{process.env.E2E_SEED_PASSWORD}} }`. `script:post-response` captura `bareToken` quando 200.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().accessToken` é `string`

### 04-login-wrong-password.bru

- **Método/rota:** POST `{{baseUrl}}/api/v2/auth/login` — auth: none
- **Pré-condições/seed:** body `{ email: {{adminEmail}}, password: "senha-errada-123" }`.
- **Asserções:**
  - `res.getStatus()` === 401
  - `JSON.stringify(res.getBody()).toLowerCase()` não contém "password"

### 05-login-unknown-email.bru

- **Método/rota:** POST `{{baseUrl}}/api/v2/auth/login` — auth: none
- **Pré-condições/seed:** body `{ email: "naoexiste-e2e@example.com", password: {{password}} }`.
- **Asserções:**
  - `res.getStatus()` === 401
