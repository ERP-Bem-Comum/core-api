# TDD — partners / auth (rede de segurança 1:1)

> Fonte read-only: `api-collections/partners/auth/*.bru`. Um caso por request.
> Asserções literais do bloco `tests {}`. Sem asserção → `**smoke-only**`.

## auth/01-register-bare-user.bru (seq 2)

- **Método + rota:** POST `{{baseUrl}}/api/v2/auth/register`
- **Auth:** none
- **Body:** `{ email: {{bareUserEmail}}, password: {{process.env.E2E_SEED_PASSWORD}} }`
- **Pré-condições:** e-mail de usuário pelado e senha de seed.
- **Asserções:**
  - `res.getStatus()` é `201` OU `409` (se já existe) — `s === 201 || s === 409`.

## auth/02-login-bare-user.bru (seq 3)

- **Método + rota:** POST `{{baseUrl}}/api/v2/auth/login`
- **Auth:** none
- **Body:** `{ email: {{bareUserEmail}}, password: {{process.env.E2E_SEED_PASSWORD}} }`
- **Side-effect:** `script:post-response` grava `bareUserToken = res.body.accessToken`.
- **Pré-condições:** usuário pelado já registrado.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `res.getBody().accessToken` é do tipo `string`.

## auth/03-login-operator.bru (seq 4)

- **Método + rota:** POST `{{baseUrl}}/api/v2/auth/login`
- **Auth:** none
- **Body:** `{ email: {{operatorEmail}}, password: {{process.env.E2E_SEED_PASSWORD}} }`
- **Side-effect:** `script:post-response` grava `operatorToken = res.body.accessToken`.
- **Pré-condições:** operador com as permissões de parceiro.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `res.getBody().accessToken` é do tipo `string`.
