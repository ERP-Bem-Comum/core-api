# SEED-CONTRACT — Contrato de seed para a suíte e2e unificada

> Este documento é o contrato entre a pasta `0-auth/` (que captura tokens) e o runner
> da US4 (que sobe o servidor e executa o seed antes de `bru run`).
> O seed DEVE garantir que todos os usuários abaixo existam com as permissões listadas
> antes que qualquer request da suíte seja disparado.

---

## Usuários e permissões requeridos

| email                       | var do token             | permissões                                                                                                                  | módulo(s)          |
| --------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `admin.e2e@bemcomum.dev`    | `adminToken`             | `user:read`, `user:create`, `user:update`, `user:deactivate`, `role:read`, `user:assign-role`, `role:create`, `role:update` | auth               |
| `bare.e2e@bemcomum.dev`     | `bareToken`              | nenhuma                                                                                                                     | auth               |
| `e2e-reader@example.com`    | `readerToken`            | `contract:read`                                                                                                             | contracts          |
| `e2e-contracts@example.com` | `contractsOperatorToken` | `contract:read`, `contract:write`                                                                                           | contracts          |
| `e2e-partners@example.com`  | `partnersOperatorToken`  | `partner:read`, `partner:write`                                                                                             | partners           |
| `e2e-bare@example.com`      | `bareUserToken`          | nenhuma (criado via `POST /api/v2/auth/register` no request `01-register-bare-user.bru`)                                    | contracts/partners |

> **Nota sobre `bareUserEmail` (`e2e-bare@example.com`):** este usuário é registrado
> pelo próprio request `01-register-bare-user.bru` via `POST /api/v2/auth/register`.
> O endpoint aceita `201` na primeira execução e `409` nas seguintes (idempotente).
> O seed NÃO precisa criá-lo — mas deve garantir que o endpoint de registro esteja
> funcional e que o banco não bloqueie o e-mail.

---

## Senha compartilhada

Todos os usuários usam a mesma senha, lida de:

```
process.env.E2E_SEED_PASSWORD
```

O runner deve exportar esta variável de ambiente antes de invocar `bru run`.
O valor NUNCA deve ser commitado. Fonte: `.env` local (não versionado) ou segredo de CI.

---

## Tokens capturados (vars de colecao)

Os tokens são capturados pelos scripts `script:post-response` de cada request de login
e armazenados como **runtime variables** via `bru.setVar(...)`. Ficam disponíveis para
todos os requests subsequentes na mesma execução de `bru run`.

| var                      | capturado em                      | usado em                                         |
| ------------------------ | --------------------------------- | ------------------------------------------------ |
| `adminToken`             | `02-login-admin.bru`              | suíte `1-auth/` (users, roles, perms)            |
| `bareToken`              | `03-login-bare.bru`               | suíte `1-auth/` (casos 403)                      |
| `readerToken`            | `04-login-reader.bru`             | suíte `2-contracts/` (casos read/403)            |
| `contractsOperatorToken` | `05-login-contracts-operator.bru` | suíte `2-contracts/` (casos write)               |
| `partnersOperatorToken`  | `06-login-partners-operator.bru`  | suíte `3-partners/` (casos write)                |
| `bareUserToken`          | `07-login-bare-user.bru`          | suíte `2-contracts/` e `3-partners/` (casos 403) |

---

## Mapa de colisoes resolvidas (de → para)

Esta tabela documenta o renomeio feito ao consolidar as tres colecoes anteriores
(`auth`, `contracts`, `partners`) na colecao unificada `core-api`.

| colecao de origem | var antiga      | email original              | var unificada              | email unificado             |
| ----------------- | --------------- | --------------------------- | -------------------------- | --------------------------- |
| contracts         | `operatorToken` | `e2e-contracts@example.com` | `contractsOperatorToken`   | `e2e-contracts@example.com` |
| partners          | `operatorToken` | `e2e-partners@example.com`  | `partnersOperatorToken`    | `e2e-partners@example.com`  |
| contracts         | `bareUserToken` | `e2e-bare@example.com`      | `bareUserToken`            | `e2e-bare@example.com`      |
| partners          | `bareUserToken` | `e2e-bare@example.com`      | `bareUserToken` (idem)     | `e2e-bare@example.com`      |
| auth              | `adminToken`    | `admin.e2e@bemcomum.dev`    | `adminToken` (inalterado)  | `admin.e2e@bemcomum.dev`    |
| auth              | `bareToken`     | `bare.e2e@bemcomum.dev`     | `bareToken` (inalterado)   | `bare.e2e@bemcomum.dev`     |
| contracts         | `readerToken`   | `e2e-reader@example.com`    | `readerToken` (inalterado) | `e2e-reader@example.com`    |

**Colisao critica eliminada:** `operatorToken` existia nas duas colecoes com emails
diferentes. Na colecao unificada passou a ser `contractsOperatorToken` e
`partnersOperatorToken` — sem ambiguidade.

---

## Exemplo de invocacao do runner (US4)

```bash
# Exportar senha (nunca commitar o valor)
export E2E_SEED_PASSWORD="<valor-do-secret>"

# Subir o servidor e aguardar health (responsabilidade do runner US4)
# ...

# Rodar a suíte completa com environment local, reporter JUnit para CI
# -r: recursive — percorre todas as subpastas em ordem lexicografica
# 0-auth/ e processado primeiro (prefixo 0), garantindo que os tokens
# estejam capturados antes de qualquer pasta de modulo (1-auth/, 2-contracts/, etc.)
pnpm dlx @usebruno/cli run api-collections/core-api \
  --env local \
  -r \
  --reporter-junit results/e2e-core-api.xml
```
