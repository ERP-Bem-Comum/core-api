# TDD — improvements / security-rate-limit

> **Dimensão:** Segurança da informação.
> **Fundamento canônico — OWASP AI Exchange (p.89):** "Apply least privilege […];
> Reduce the risk of multi-account abuse: Attackers may create or use multiple accounts
> to avoid per-user rate limits." (atribuição: OWASP AI Exchange, p.89)
> **Reforço (tdd-strategist / Kent Beck):** estes são testes novos de _boundary_ na borda
> não-exercitada (rate-limit). Cada caso fixa um limite observável (30/min) e o comportamento
> ao cruzá-lo, com asserção literal de status + header.

Status: MELHORIA (não há `.bru` correspondente ainda; baseline = 0 testes de 429).
Política sob teste: `WRITE_RATE_LIMIT` = 30 requisições de escrita por minuto.

### RL-1 — Burst POST /api/v1/users → 429 + Retry-After

- **Método/rota:** POST `{{baseUrl}}/api/v1/users` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`. Cada request usa body válido com e-mail/CPF únicos (gerados por iteração) para isolar o 429 do 409 de duplicidade.
- **Execução:** loop de 35 POST dentro da mesma janela de 1 minuto.
- **Asserções:**
  - Para as requisições 1..30: `res.getStatus()` ∈ {200, 201}
  - Para as requisições 31..35: `res.getStatus()` === 429
  - Na primeira resposta 429: `res.getHeaders()['retry-after']` está presente (não-vazio)
  - Nenhuma resposta com `res.getStatus()` === 500

### RL-2 — Burst POST /api/v1/roles → 429 + Retry-After

- **Método/rota:** POST `{{baseUrl}}/api/v1/roles` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`. Cada request usa `name` único por iteração (evita 409 nome duplicado) e permissão válida do catálogo.
- **Execução:** loop de 35 POST dentro da mesma janela de 1 minuto.
- **Asserções:**
  - Requisições 1..30: `res.getStatus()` ∈ {200, 201}
  - Requisições 31..35: `res.getStatus()` === 429
  - Primeira resposta 429: header `Retry-After` presente
  - Nenhuma `res.getStatus()` === 500

### RL-3 — Burst POST /api/v1/users/:id/roles → 429 + Retry-After

- **Método/rota:** POST `{{baseUrl}}/api/v1/users/{{targetUserId}}/roles` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`; `targetUserId` capturado de um POST /users prévio; conjunto de `roleId`s atribuíveis (capturados de GET /roles). Atribuição é idempotente (assign repetido = 200), então o status base é estável.
- **Execução:** loop de 35 POST de atribuição dentro da mesma janela de 1 minuto.
- **Asserções:**
  - Requisições 1..30: `res.getStatus()` ∈ {200, 201}
  - Requisições 31..35: `res.getStatus()` === 429
  - Primeira resposta 429: header `Retry-After` presente
  - Nenhuma `res.getStatus()` === 500

### RL-4 — Controle: reads não limitados pela política de escrita

- **Método/rota:** GET `{{baseUrl}}/api/v1/users?pageSize=25` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`.
- **Execução:** loop de 35 GET dentro da mesma janela de 1 minuto.
- **Asserções:**
  - Para todas as 35 requisições: `res.getStatus()` === 200 (nenhum 429 atribuível à política de escrita)
  - Nenhuma resposta com header `Retry-After` proveniente do `WRITE_RATE_LIMIT`
  - `res.getBody().items` é `array` em cada resposta (prova de leitura efetiva, não bloqueada)
