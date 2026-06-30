# Quickstart — Gestão Administrativa de Usuários

Como exercitar a feature (implementada e entregue). Pré-requisito: `pnpm install` e — para fluxos reais —
Docker (MySQL + MinIO via `compose.yaml`).

> **ADR-0037 (HTTP-first):** não há CLI embutida. Exercita-se a feature pela **borda HTTP** — via coleção
> **Bruno** (`api-collections/auth/`, ADR-0034), `curl` ad-hoc, ou testes `fastify.inject` in-process.

## Caminho rápido (tudo automatizado)

```bash
# E2E Bruno completo: sobe MySQL no Docker, server real (auth=mysql, seed RBAC),
# roda a coleção (auth + users US1-US5 + segurança + minha conta) e derruba tudo.
pnpm run test:e2e:bruno:auth        # 45 requests / 59 testes
```

## Caminho manual (server + bru contra a borda)

```bash
# 1. Subir a borda HTTP local (driver memory; ou auth=mysql apontando para o Docker)
# As permissões do admin de dev seguem o preset canônico `adminDevPermissions`
# (src/modules/auth/adapters/http/dev-seed.ts) — derivado do catálogo, inclui user:* + program:*.
AUTH_DRIVER=memory CORE_API_E2E=1 \
  AUTH_SEED_JSON='{"users":[{"email":"admin@bemcomum.dev","password":"Str0ng-Passphrase-2026!","permissions":["user:list","user:read","user:create","user:register","user:update","user:activate","user:deactivate","user:assign-role","program:read","program:write","program:deactivate"]}]}' \
  PORT=3100 pnpm run serve

# 2. Rodar a coleção Bruno (fora da árvore por causa do guard trustPolicy=no-downgrade, ADR-0011/0029)
cp -r api-collections/auth /tmp/auth-collection
(cd /tmp/auth-collection && E2E_SEED_PASSWORD="Str0ng-Passphrase-2026!" \
  pnpm dlx @usebruno/cli@3.4.2 run . -r --env local)

# 3. Request individual (alternativa curl) — login e listagem
TOKEN=$(curl -s -X POST http://127.0.0.1:3100/api/v2/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@bemcomum.dev","password":"Str0ng-Passphrase-2026!"}' | jq -r .accessToken)
curl -s "http://127.0.0.1:3100/api/v1/users?page=1&pageSize=5&search=amanda&status=all" \
  -H "Authorization: Bearer $TOKEN" | jq
```

## Validação dos critérios de aceite (mapeamento → coleção Bruno)

| Cenário (spec)                           | Onde (`api-collections/auth/`)                               |
| ---------------------------------------- | ------------------------------------------------------------ |
| Login + RBAC + captura de token          | `1-auth/` (login admin/bare, `/me`, negativos)               |
| US1 — paginação/busca/filtro             | `2-users/10–17` (`pageSize`/`search`/`status`/validação)     |
| US3 — criar / email duplicado / inválido | `2-users/20–26` (201 / 409 / 422 / 400)                      |
| US2 — detalhe / não encontrado           | `2-users/30–32` (200 / 404 / 403)                            |
| US4 — editar atômico / conflito          | `2-users/40–43` (200 / 409 / 422 / 404)                      |
| US5 — ativar/desativar idempotente       | `2-users/50–55` (no-op / 422 auto-desativação / 403)         |
| US6 — foto (upload/tipo/remoção)         | `2-users/70–72` (200 / 422 / 200; asset `assets/sample.jpg`) |
| US7 — Minha Conta / senha                | `4-me/80–82` (`GET/PUT /me`, `/me/password-reset` 202)       |
| Segurança (JWT/SQLi/mass-assign)         | `3-security/60–64`                                           |

## Testes (pirâmide)

- **Unit** (`pnpm test`): VOs `Cpf`/`Telephone`/`ProfilePhotoRef`, agregado, use cases com fakes, rotas via `fastify.inject`.
- **Integração MySQL** (`MYSQL_PORT=3307 pnpm run test:integration:auth`): migrations 0004/0005, mappers, `user-query.drizzle` (listagem) — atrás de `MYSQL_INTEGRATION=1`.
- **Integração MinIO** (`pnpm run test:integration:photo`): adapter S3 da foto (upload/remove) — atrás de `STORAGE_INTEGRATION=1`.
- **E2E**: coleção Bruno (`pnpm run test:e2e:bruno:auth`) contra a borda HTTP real.

> Nota: o `MYSQL_PORT=3307` evita conflito quando a stack `ERP-INFRA/local` (porta 3306) já está de pé.
