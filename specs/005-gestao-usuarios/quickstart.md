# Quickstart — Gestão Administrativa de Usuários

Como exercitar a feature após implementada. Pré-requisito: dependências instaladas (`pnpm install`),
e — para fluxos reais — MySQL + MinIO via compose (`pnpm run test:integration` sobe o necessário).

## Caminho rápido (in-memory, sem infra)

```bash
# 1. Criar um usuário (memory) — dispara o evento de convite (sem email real no driver memory)
pnpm run cli:auth -- criar-usuario --name "Amanda Manoel" --cpf 79779546057 \
  --email amanda@x.com --telephone 15997133502

# 2. Listar e localizar
pnpm run cli:auth -- listar-usuarios --search "amanda" --status all

# 3. Ver detalhe
pnpm run cli:auth -- ver-usuario --id <uuid-da-criacao>

# 4. Desativar e confirmar via filtro
pnpm run cli:auth -- desativar-usuario --id <uuid>
pnpm run cli:auth -- listar-usuarios --status inactive
```

## Validação dos critérios de aceite (mapeamento)

| Cenário (spec)                           | Como verificar                                                |
| ---------------------------------------- | ------------------------------------------------------------- |
| US1 — paginação/busca/filtro             | `listar-usuarios` com `--page-size`, `--search`, `--status`   |
| US2 — detalhe / não encontrado           | `ver-usuario --id` válido e inválido (404)                    |
| US3 — criar / email duplicado / inválido | `criar-usuario` feliz, repetido (409), com cpf inválido (422) |
| US4 — editar atômico                     | `editar-usuario` + `ver-usuario` confirmando                  |
| US5 — ativar/desativar idempotente       | repetir `desativar-usuario` (no-op na 2ª vez)                 |
| US6 — foto                               | `definir-foto-usuario --file` (requer storage; integração)    |
| US7 — Minha Conta / senha                | rotas `/me`/`/me/password-reset` (HTTP)                       |

## Borda HTTP (quando o servidor estiver ativo)

```bash
curl -s "$BASE/api/v1/users?page=1&pageSize=5&status=active" -H "Authorization: Bearer $TOKEN" | jq
curl -s "$BASE/api/v1/users/$ID" -H "Authorization: Bearer $TOKEN" | jq
```

## Testes (pirâmide)

- **Unit** (`pnpm test`): VOs `Cpf`/`Telephone`, operações do agregado, use cases com fakes.
- **Contract**: `user-query.suite.ts` consumida por in-memory e Drizzle/MySQL.
- **Integration** (`pnpm run test:integration`): persistência MySQL + foto em MinIO, atrás de `*_INTEGRATION=1`.
- **E2E**: CLI real (`contracts.cli`-style) para os fluxos de listar/criar/ativar.
