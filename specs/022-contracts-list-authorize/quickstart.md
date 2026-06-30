# Quickstart — Validar a 022 (contract:read na listagem)

## O que mudou

Uma linha em `src/modules/contracts/adapters/http/plugin.ts`: o `preHandler` de `GET /contracts` passa de `requireAuth` para `[requireAuth, authorize(CONTRACT_PERMISSION.read)]`.

## Verificação por testes (W0→W3)

```bash
# Teste RBAC da listagem com authorize real (401 / 403 sem perm / 200 com perm)
pnpm test -- --test-name-pattern="contracts-list-authorize"

# Gate W3 completo
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test
```

**Antes do fix (RED)**: usuário autenticado sem `contract:read` recebe **200** na listagem (vazamento) → o caso 403 falha.
**Depois (GREEN)**: 403 sem a permissão; 200 com; 401 sem token.

## Verificação manual (opcional)

```bash
# com contract:read → 200
curl -sS -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer <jwt-com-contract-read>" \
  http://localhost:3000/api/v2/contracts
# autenticado sem contract:read → 403 (antes: 200)
curl -sS -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer <jwt-sem-permissao>" \
  http://localhost:3000/api/v2/contracts
# sem token → 401
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/v2/contracts
```

## Critérios de pronto (mapeiam SC)

- [ ] SC-001: sem `contract:read` → 403 na listagem.
- [ ] SC-002: com `contract:read` → 200, resposta inalterada.
- [ ] SC-003: sem token → 401.
- [ ] SC-004: teste com authorize real cobre o caso negado.
- [ ] SC-005: mesma permissão de detalhe/histórico/exportação.
- [ ] Gate W3 verde.
