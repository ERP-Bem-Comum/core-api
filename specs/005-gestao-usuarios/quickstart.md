# Quickstart — Gestão Administrativa de Usuários

Como exercitar a feature após implementada. Pré-requisito: dependências instaladas (`pnpm install`),
e — para fluxos reais — MySQL + MinIO via compose (`pnpm run test:integration` sobe o necessário).

> **ADR-0037 (HTTP-first):** não há CLI embutida. Exercita-se a feature pela **borda HTTP** — via coleção
> **Bruno** (reproduzível, ADR-0034) ou `curl`/HTTPie ad-hoc — e por testes `fastify.inject` in-process.

## Caminho rápido (coleção Bruno contra a borda HTTP)

```bash
# 1. Subir a borda HTTP local (ou usar os testes fastify.inject)
pnpm run dev            # servidor /api/v1 (ver ADR-0028 — edge shell)

# 2. Rodar a coleção Bruno de usuarios (cria -> lista -> detalha -> desativa, com asserções)
bru run api-collections/users --env local --reporter junit

# 3. Request individual (ex.: listar) — alternativa curl
curl -s "$BASE/api/v1/users?page=1&pageSize=5&search=amanda&status=all" \
  -H "Authorization: Bearer $TOKEN" | jq
```

## Validação dos critérios de aceite (mapeamento)

| Cenário (spec)                           | Como verificar (coleção Bruno / HTTP)                        |
| ---------------------------------------- | ------------------------------------------------------------ |
| US1 — paginação/busca/filtro             | `api-collections/users/list/` (`pageSize`/`search`/`status`) |
| US2 — detalhe / não encontrado           | `api-collections/users/detail/` (id válido / 404)            |
| US3 — criar / email duplicado / inválido | `api-collections/users/create/` (201 / 409 / 422)            |
| US4 — editar atômico                     | `api-collections/users/update/` + `detail` confirmando       |
| US5 — ativar/desativar idempotente       | `api-collections/users/status/` (repetir → no-op)            |
| US6 — foto                               | `api-collections/users/photo/` (requer storage; integração)  |
| US7 — Minha Conta / senha                | `api-collections/users/me/` (`/me`, `/me/password-reset`)    |

## Borda HTTP (quando o servidor estiver ativo)

```bash
curl -s "$BASE/api/v1/users?page=1&pageSize=5&status=active" -H "Authorization: Bearer $TOKEN" | jq
curl -s "$BASE/api/v1/users/$ID" -H "Authorization: Bearer $TOKEN" | jq
```

## Testes (pirâmide)

- **Unit** (`pnpm test`): VOs `Cpf`/`Telephone`, operações do agregado, use cases com fakes.
- **Contract**: `user-query.suite.ts` consumida por in-memory e Drizzle/MySQL.
- **Integration** (`pnpm run test:integration`): persistência MySQL + foto em MinIO, atrás de `*_INTEGRATION=1`.
- **E2E**: coleção Bruno (`bru run api-collections/users`) contra a borda HTTP + smoke `fastify.inject` — ADR-0034/0037.
