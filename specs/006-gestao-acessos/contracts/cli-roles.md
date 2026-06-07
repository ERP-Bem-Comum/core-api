# Contrato CLI — Gestão de Acessos (paridade Fase 1)

Adapters in-memory por default; `--driver mysql` para integração. Strings ao humano em PT.

```bash
# Catálogo de permissões (fixo)
pnpm run cli:auth -- listar-permissoes

# Papéis
pnpm run cli:auth -- listar-papeis
pnpm run cli:auth -- criar-papel --name "Gestor de Contratos" \
  --perm contract:read --perm contract:mass-approve
pnpm run cli:auth -- editar-papel --id <roleId> --perm contract:read --perm user:list
pnpm run cli:auth -- desativar-papel --id <roleId>     # bloqueia se em uso

# Atribuição
pnpm run cli:auth -- permissoes-do-usuario --id <userId>
pnpm run cli:auth -- atribuir-papel --user <userId> --role <roleId>   # idempotente
pnpm run cli:auth -- revogar-papel  --user <userId> --role <roleId>   # idempotente
```

- `criar-papel`/`editar-papel` recusam permissão fora do catálogo fixo e nome duplicado.
- `desativar-papel` bloqueia se o papel ainda está atribuído (FR-012).
- `revogar-papel` bloqueia auto-rebaixamento da gestão de acessos (FR-010).
