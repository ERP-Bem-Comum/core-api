# Quickstart — Gestão de Acessos (Papéis e Permissões)

Pré-requisito: `pnpm install`. Para persistência real, MySQL via `pnpm run test:integration`.

## Caminho rápido (in-memory)

```bash
# 1. Ver o catálogo fixo de permissões
pnpm run cli:auth -- listar-permissoes

# 2. Criar um papel com permissões do catálogo
pnpm run cli:auth -- criar-papel --name "Gestor de Contratos" \
  --perm contract:read --perm contract:mass-approve

# 3. Atribuir o papel a um usuário e checar permissões efetivas
pnpm run cli:auth -- atribuir-papel --user <userId> --role <roleId>
pnpm run cli:auth -- permissoes-do-usuario --id <userId>   # deve incluir contract:mass-approve

# 4. Revogar e confirmar
pnpm run cli:auth -- revogar-papel --user <userId> --role <roleId>
pnpm run cli:auth -- permissoes-do-usuario --id <userId>   # sem as permissões do papel
```

## Validação dos critérios de aceite (mapeamento)

| Cenário (spec)            | Como verificar                                                         |
| ------------------------- | ---------------------------------------------------------------------- |
| US1 — permissões efetivas | `permissoes-do-usuario` (união dos papéis)                             |
| US2 — catálogo            | `listar-permissoes` (completo, sem duplicatas)                         |
| US3 — listar papéis       | `listar-papeis` (nome + permissões)                                    |
| US4 — atribuir/revogar    | `atribuir-papel`/`revogar-papel` (idempotentes)                        |
| US5 — criar papel         | `criar-papel` feliz, nome duplicado (409), perm fora do catálogo (422) |
| US6 — editar papel        | `editar-papel` + `permissoes-do-usuario` confirmando propagação        |
| US7 — desativar papel     | `desativar-papel` em papel sem uso (ok) e em uso (bloqueado)           |

## Relação com a 005

- "Aprovador em massa" que a `005` exibe read-only = ter a permissão `contract:mass-approve` efetiva aqui.

## Testes (pirâmide)

- **Unit**: `RoleName`, `Role.setPermissions/deactivate`, use cases com fakes.
- **Contract**: `role-repository.suite.ts` (in-memory + Drizzle/MySQL).
- **Integration** (`pnpm run test:integration`): junções `auth_role_permissions`/`auth_user_roles` em MySQL.
- **E2E**: CLI real para criar papel → atribuir → checar permissões efetivas.
