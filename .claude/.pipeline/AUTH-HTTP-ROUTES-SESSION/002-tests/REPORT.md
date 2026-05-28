# W0 — Testes RED — AUTH-HTTP-ROUTES-SESSION (H1b)

**Wave:** W0 · **Skill:** tdd-strategist · **Outcome:** RED · **Data:** 2026-05-28

## Escrito

`tests/modules/auth/adapters/http/session.test.ts` — reusa `buildAuthHttpDeps({driver:'memory'})` +
`authHttpPlugin(deps)` (do H1a). Helper `seedAndLogin` (register→login→pega refresh).

| CA | Asserção |
| :-- | :-- |
| CA8 | `/refresh` com refresh válido → 200; tokens novos; refresh **rotacionado** (≠ anterior) |
| CA9 | `/refresh` com garbage → 401 |
| CA10a | `/logout` com refresh válido → 204 (body vazio) |
| CA10b | `/logout` repetido → 204 (idempotente) |
| CA11 | `/docs/json` contém `/api/v2/auth/{refresh,logout}` |

## RED

```
node --test session.test.ts
✖ fail  (rotas /refresh e /logout inexistentes → 404; asserções de status falham)
```

GREEN quando o W1 adicionar as 2 rotas em `authRoutes` (plugin.ts) + 2 schemas (`refreshBodySchema`,
`logoutBodySchema`) — reusa `deps.refreshAccessToken`/`deps.revokeSession` (já instanciados no composition).
