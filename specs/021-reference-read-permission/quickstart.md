# Quickstart — Validar a 021 (reference:read)

## O que mudou

Uma linha em `src/modules/auth/domain/authorization/permission-catalog.ts`: `'reference:read'` no `CATALOG_RAW`. Tudo o mais (rotas, dados, schema) é da feature 020.

## Verificação por testes (caminho canônico — W0→W3)

```bash
# Unidade — integridade do catálogo (deve conter reference:read)
pnpm test -- --test-name-pattern="permission-catalog"

# Integração HTTP com authorize REAL (200 com perm / 403 sem / 401 sem token)
pnpm test -- --test-name-pattern="reference-read-rbac"

# Gate W3 completo (obrigatório p/ fechar o ticket)
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test
```

**Antes do fix (RED esperado)**: `permission-catalog` falha (string ausente); `reference-read-rbac` falha (não dá pra conceder `reference:read` à role → ator com permissão não chega a 200).

**Depois do fix (GREEN)**: ambos passam.

## Verificação manual (opcional, contra a borda real)

Pré-requisito: subir o server com auth real e um usuário cujo perfil tenha `reference:read` (admin de dev recebe via `PermissionCatalog.all`).

```bash
# admin de dev (perfil completo) → 200 nos três
curl -sS -H "Authorization: Bearer <jwt-admin>" \
  http://localhost:3000/api/v2/financial/categories | head
curl -sS -H "Authorization: Bearer <jwt-admin>" \
  http://localhost:3000/api/v2/financial/cost-centers | head
curl -sS -H "Authorization: Bearer <jwt-admin>" \
  http://localhost:3000/api/v2/financial/programs | head

# usuário sem reference:read → 403 forbidden (envelope padrão)
curl -sS -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer <jwt-sem-permissao>" \
  http://localhost:3000/api/v2/financial/categories
```

## Critérios de pronto (mapeiam SC da spec)

- [ ] SC-001: admin recebe 200 nos 3 endpoints (antes 403).
- [ ] SC-003: usuário sem a permissão recebe 403 nos 3.
- [ ] SC-004: existe teste com `authorize` real que falha se `reference:read` sair do catálogo.
- [ ] Gate W3 verde.
