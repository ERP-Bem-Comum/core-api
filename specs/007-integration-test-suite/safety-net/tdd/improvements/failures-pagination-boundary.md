# TDD — improvements / failures-pagination-boundary

> **Dimensão:** Falhas técnicas possíveis.
> **Fundamento canônico — OWASP AI Exchange:** "input validation and sanitization to reject
> or correct malicious (e.g. very large) content." (atribuição: OWASP AI Exchange) — valores
> de paginação muito grandes/inválidos são entrada a rejeitar ou corrigir.
> **Reforço (tdd-strategist / Kent Beck):** characterization da borda; cada caso fixa um valor
> de borda e prova que o contrato é 422-ou-clamp, **nunca 500**.

Status: MELHORIA (há `pageSize` inválido isolado em `tdd/auth/2-users § 13`; faltam page=0,
negativo, acima do máximo, page além do total — e o mesmo boundary em contracts e partners).

### PAG-1 — GET /users?page=0

- **Método/rota:** GET `{{baseUrl}}/api/v1/users?page=0` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** `adminToken`.
- **Asserções:**
  - `res.getStatus()` ∈ {422, 200}
  - `res.getStatus()` !== 500
  - Se 200: `res.getBody().meta` tem `currentPage` e `totalItems` (clamp documentado para a página mínima)

### PAG-2 — GET /users?page=-1

- **Método/rota:** GET `{{baseUrl}}/api/v1/users?page=-1` — header `Authorization: Bearer {{adminToken}}`
- **Asserções:**
  - `res.getStatus()` ∈ {422, 200}
  - `res.getStatus()` !== 500
  - Se 200: `meta` coerente (currentPage/totalItems presentes)

### PAG-3 — GET /users?pageSize=99999

- **Método/rota:** GET `{{baseUrl}}/api/v1/users?pageSize=99999` — header `Authorization: Bearer {{adminToken}}`
- **Asserções:**
  - `res.getStatus()` ∈ {422, 200}
  - `res.getStatus()` !== 500
  - Se 200: `res.getBody().items.length` <= máximo documentado de pageSize (clamp efetivo)

### PAG-4 — GET /users?page além do total → vazio coerente

- **Método/rota:** GET `{{baseUrl}}/api/v1/users?page=999999&pageSize=25` — header `Authorization: Bearer {{adminToken}}`
- **Pré-condições/seed:** base com poucos usuários (total << 999999\*25).
- **Asserções:**
  - `res.getStatus()` === 200
  - `res.getBody().items` é `array` e `length` === 0
  - `res.getBody().meta.totalItems` reflete o total real (>= 0, coerente)
  - `res.getStatus()` !== 500

### PAG-5 — Boundary em listagem de contracts

- **Método/rota:** GET `{{baseUrl}}/api/v2/contracts?page=<X>&pageSize=<Y>` — header `Authorization: Bearer {{contractsReadToken}}`
- **Pré-condições/seed:** token de leitura de contracts.
- **Variações:** `page=0`, `page=-1`, `pageSize=99999`, `page` além do total.
- **Asserções (por variação):**
  - `res.getStatus()` ∈ {422, 200} e nunca 500
  - `page` além do total → 200 com lista vazia coerente
  - `meta`/equivalente coerente quando 200

### PAG-6 — Boundary em listagem de partners (suppliers)

- **Método/rota:** GET `{{baseUrl}}/api/v1/suppliers?page=<X>&pageSize=<Y>` — header `Authorization: Bearer {{operatorToken}}`
- **Pré-condições/seed:** `operatorToken` (partners).
- **Variações:** `page=0`, `page=-1`, `pageSize=99999`, `page` além do total.
- **Asserções (por variação):**
  - `res.getStatus()` ∈ {422, 200} e nunca 500
  - `page` além do total → 200 com lista vazia coerente
  - `meta`/equivalente coerente quando 200
