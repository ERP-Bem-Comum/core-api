# TDD — improvements / security-injection

> **Dimensão:** Segurança da informação.
> **Fundamento canônico — OWASP AI Exchange:** "input validation and sanitization to reject
> or correct malicious (e.g. very large) content." (atribuição: OWASP AI Exchange)
> **Reforço (tdd-strategist / Kent Beck):** testes novos que caracterizam a borda sob entrada
> adversarial; asserção dupla aceitável (200 seguro OU 422), nunca 500, nunca eco executável.

Status: MELHORIA (expande os 2 casos de injection existentes — ver `tdd/auth/3-security § 62`).

### INJ-1 — SQLi no search de users tratado como literal

- **Método/rota:** GET `{{baseUrl}}/api/v1/users?search=' OR 1=1--&pageSize=25` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`. Base com ≥1 usuário conhecido.
- **Asserções:**
  - `res.getStatus()` === 200 (nunca 500)
  - `res.getBody().items` é `array`
  - `res.getBody().meta` tem propriedade `totalItems`
  - `res.getBody().items.length` <= `pageSize` (sem dump da base — payload literal não vaza extras)

### INJ-2 — XSS em name de POST /roles escapado ou 422

- **Método/rota:** POST `{{baseUrl}}/api/v1/roles` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`; body com `name: "<script>alert(1)</script>"` + permissão válida do catálogo.
- **Asserções:**
  - `res.getStatus()` ∈ {201, 422}
  - Se 201: `res.getBody().name` NÃO contém a substring executável `"<script>"` crua (armazenado escapado/normalizado) — ou o serializador devolve o valor como texto, sem reflexão executável
  - O corpo da resposta não reflete o payload como HTML/script executável

### INJ-3 — XSS em name de POST /users escapado ou 422

- **Método/rota:** POST `{{baseUrl}}/api/v1/users` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`; `script:pre-request` gera e-mail/CPF únicos; body com `name: "<script>alert(1)</script>"`.
- **Asserções:**
  - `res.getStatus()` ∈ {201, 422}
  - Se 201: `res.getBody()` não reflete o payload como script executável
  - Nenhuma `res.getStatus()` === 500

### INJ-4 — SQLi no filtro de listagem de contracts seguro

- **Método/rota:** GET `{{baseUrl}}/api/v2/contracts?<filtro>=' OR 1=1--` — header `Authorization: Bearer {{contractsReadToken}}`
- **Pré-condições/seed:** token com leitura de contracts; ≥1 contrato na base.
- **Asserções:**
  - `res.getStatus()` ∈ {200, 422} (nunca 500)
  - Se 200: corpo paginado coerente (`items`/equivalente é `array`), sem registros fora do escopo do token
  - O filtro é tratado como literal (sem efeito de `OR 1=1`)

### INJ-5 — SQLi no filtro/busca de listagem de partners seguro

- **Método/rota:** GET `{{baseUrl}}/api/v1/suppliers?<busca>=' OR 1=1--` — header `Authorization: Bearer {{operatorToken}}`
- **Pré-condições/seed:** `operatorToken` (partners); ≥1 fornecedor na base.
- **Asserções:**
  - `res.getStatus()` ∈ {200, 422} (nunca 500)
  - Se 200: corpo é `array`/paginado coerente, sem dump da base
  - O filtro é tratado como literal
