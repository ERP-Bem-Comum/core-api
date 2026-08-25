# Contrato de validação E2E — Coleção Bruno (`api-collections/users/`)

ADR-0037 (HTTP-first) + ADR-0034 (Bruno como ferramenta oficial de teste da borda HTTP). A validação
ponta-a-ponta de regras de negócio — que antes era feita pela CLI embutida — passa a ser feita por
**coleções Bruno** (`.bru` Git-friendly, diffáveis em PR) contra a borda HTTP real, mais smoke
`fastify.inject`. **Não há mais paridade CLI** no core-api (a CLI do domínio é o app à parte `cli/`).

> O `@usebruno/cli` é `devDependency` pinada (ADR-0034). Roda em **Safe Mode** (sem npm externo/FS).
> Execução: `bru run api-collections/users --env local --reporter junit` (reproduzível em CI/PR).

## Estrutura da coleção `api-collections/users/`

```
api-collections/users/
├── bruno.json                 # coleção
├── environments/local.bru     # baseUrl, token (secret via env, nunca commitado)
├── list/                      # US1 — GET /api/v1/users (paginação/busca/filtro)
├── detail/                    # US2 — GET /api/v1/users/:id (200 / 404)
├── create/                    # US3 — POST /api/v1/users (201 / 409 / 422)
├── update/                    # US4 — PUT /api/v1/users/:id (200 / 409 / 422)
├── status/                    # US5 — PATCH .../activate | .../deactivate (idempotente / 422)
├── photo/                     # US6 — PUT|DELETE .../photo (multipart / 422)   [integração]
└── me/                        # US7 — GET|PUT /me ; POST /me/password-reset
```

## Asserções por request (exemplos)

Cada `.bru` exercita um endpoint do `contracts/http-users.md` e fixa o comportamento com asserções:

- **list** — `res.status == 200`; `res.body.meta.itemsPerPage` ∈ {5,10,25}; `res.body.items` é array; busca
  sem correspondência → `items.length == 0`, sem erro.
- **detail** — id válido → `200` com `id,name,email,cpf,telephone,imageUrl,active,massApprovalPermission,collaboratorId`;
  id inexistente → `404` sem vazar dados.
- **create** — válido → `201 { id }`; email repetido → `409`; campo inválido → `422` com erro por campo.
- **status** — `deactivate` em ativo → status muda; repetido → idempotente (sem erro); auto-desativação → `422`.

## Autorização

Cada request administrativo envia `Authorization: Bearer {{token}}` com a permission necessária
(`user:*`, alinhadas com `006-gestao-acessos`). `me/*` exige só sessão (self). Tokens vêm de
`environments/*.bru` via secret de ambiente — **nunca** commitados.

## Relação com os testes do projeto

- **Bruno** = E2E de borda (smoke reproduzível em PR), substitui a validação que a CLI dava à P.O.
- **`fastify.inject`** = testes de rota in-process (rápidos, no `pnpm test`/integração).
- **Contract/unit** = as suítes de domínio/application/persistência (pirâmide — ver `quickstart.md`).
