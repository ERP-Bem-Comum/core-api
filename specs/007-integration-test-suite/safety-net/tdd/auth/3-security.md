# TDD — auth / 3-security

Casos 1:1 com `api-collections/auth/3-security/*.bru`. Asserções extraídas literalmente do bloco `tests {}`.

### 60-tampered-token.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/users` — header `Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.tampered.payload-invalido`
- **Pré-condições/seed:** JWT forjado/adulterado.
- **Asserções:**
  - `res.getStatus()` === 401

### 61-empty-bearer.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/users` — header `Authorization: Bearer` (sem token)
- **Pré-condições/seed:** nenhuma.
- **Asserções:**
  - `res.getStatus()` === 401

### 62-sql-injection-search.bru

- **Método/rota:** GET `{{baseUrl}}/api/v1/users?search=' OR 1=1 --&pageSize=25` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`. payload SQLi no search.
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().items` é `array`
  - `res.getBody().meta` tem propriedade `totalItems`

### 63-mass-assignment.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/users` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `script:pre-request` gera `massEmail` único; body com campos extras `status: "disabled"`, `roles: ["admin"]`, `adminId: "00000000-..."` além de name/cpf/email/telephone.
- **Asserções:**
  - `res.getStatus()` === 201 (campos extras ignorados, cria normal)

### 64-create-privilege-escalation.bru

- **Método/rota:** POST `{{baseUrl}}/api/v1/users` — header `Authorization: Bearer {{bareToken}}`
- **Pré-condições/seed:** body válido; `bareToken` sem privilégio.
- **Asserções:**
  - `res.getStatus()` === 403
