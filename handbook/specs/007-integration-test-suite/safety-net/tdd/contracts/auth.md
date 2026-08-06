# TDD — contracts / pasta auth (+ health-check de raiz)

> Rede de segurança 1:1 (spec 007 / US1 / T005). Um caso por request `.bru` (com verbo HTTP). Asserções **literais** do bloco `tests {}` de cada arquivo.
> Fonte read-only: `api-collections/contracts/health-check.bru`, `auth/*.bru`. Não modificar os `.bru`.

---

## Caso 1 — health-check (CA1)

- **bru:** `health-check.bru` (seq 1)
- **Método + rota:** `GET {{baseUrl}}/health`
- **Auth:** none
- **Pré-condições:** servidor da API iniciado.
- **Asserções literais:**
  - `test("CA1 — servidor esta no ar (200)")`: `expect(res.getStatus()).to.equal(200)`

---

## Caso 2 — register bare user (CA2)

- **bru:** `auth/01-register-bare-user.bru` (seq 2)
- **Método + rota:** `POST {{baseUrl}}/api/v2/auth/register`
- **Auth:** none
- **Body:** `{ email: {{bareUserEmail}}, password: {{process.env.E2E_SEED_PASSWORD}} }`
- **Pré-condições:** e-mail de usuário pelado e senha de seed (`E2E_SEED_PASSWORD`) disponíveis.
- **Asserções literais:**
  - `test("CA2 — register cria usuario sem permissoes (201 ou 409 se ja existe)")`: `const s = res.getStatus(); expect(s === 201 || s === 409).to.be.true`

---

## Caso 3 — login bare user (CA2)

- **bru:** `auth/02-login-bare-user.bru` (seq 3)
- **Método + rota:** `POST {{baseUrl}}/api/v2/auth/login`
- **Auth:** none
- **Body:** `{ email: {{bareUserEmail}}, password: {{process.env.E2E_SEED_PASSWORD}} }`
- **Pré-condições:** usuário pelado registrado (Caso 4).
- **Efeito colateral:** `script:post-response` grava `bareUserToken = res.body.accessToken`.
- **Asserções literais:**
  - `test("CA2 — login do usuario pelado retorna 200 e accessToken")`:
    - `expect(res.getStatus()).to.equal(200)`
    - `expect(res.getBody().accessToken).to.be.a("string")`

---

## Caso 4 — login reader (CA3)

- **bru:** `auth/03-login-reader.bru` (seq 4)
- **Método + rota:** `POST {{baseUrl}}/api/v2/auth/login`
- **Auth:** none
- **Body:** `{ email: {{readerEmail}}, password: {{process.env.E2E_SEED_PASSWORD}} }`
- **Pré-condições:** usuário reader (permissão `contract:read`) semeado.
- **Efeito colateral:** `script:post-response` grava `readerToken = res.body.accessToken`.
- **Asserções literais:**
  - `test("CA3 — login do reader (contract:read) retorna 200 e accessToken")`:
    - `expect(res.getStatus()).to.equal(200)`
    - `expect(res.getBody().accessToken).to.be.a("string")`

---

## Caso 5 — login operator (CA3)

- **bru:** `auth/04-login-operator.bru` (seq 5)
- **Método + rota:** `POST {{baseUrl}}/api/v2/auth/login`
- **Auth:** none
- **Body:** `{ email: {{operatorEmail}}, password: {{process.env.E2E_SEED_PASSWORD}} }`
- **Pré-condições:** usuário operador (permissão `contract:write`) semeado.
- **Efeito colateral:** `script:post-response` grava `operatorToken = res.body.accessToken`.
- **Asserções literais:**
  - `test("CA3 — login do operador (contract:write) retorna 200 e accessToken")`:
    - `expect(res.getStatus()).to.equal(200)`
    - `expect(res.getBody().accessToken).to.be.a("string")`
