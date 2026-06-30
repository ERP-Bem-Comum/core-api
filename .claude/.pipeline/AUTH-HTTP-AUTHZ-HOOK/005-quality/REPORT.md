# W3 — Gate de Qualidade — AUTH-HTTP-AUTHZ-HOOK (H2)

**Wave:** W3 · **Skill:** ts-quality-checker · **Outcome:** ALL-GREEN · **Data:** 2026-05-28

| Comando | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ zero erros (`preHandlerAsyncHookHandler`, module augmentation `FastifyRequest.userId`, decorateRequest) |
| `pnpm run lint` | ✅ limpo (`strict-void-return` resolvido com tipo async) |
| `pnpm run format:check` | ✅ Prettier ok |
| `pnpm test` | ✅ **1426 pass · 0 fail · 16 skip** (+5 authz-hook) |

## CAs

| CA | Status |
| :-- | :-- |
| CA1 `/me` Bearer válido → 200 `{userId}` | ✅ |
| CA2 sem header → 401 | ✅ |
| CA3 Bearer inválido → 401 | ✅ |
| CA4 `makeRequireAuth`/`makeAuthorize` exportados | ✅ |
| CA5 OpenAPI contém `/me` | ✅ |
| CA6 regressão (4 rotas auth) | ✅ |

## Veredito
**ALL-GREEN.** H2 fecha a borda auth: register/login/refresh/logout + `/me` protegida + mecanismo `requireAuth`/`authorize` reutilizável. Próximo: I1 (RW split, ADR-0026) e/ou rotas protegidas por permissão (consomem `makeAuthorize`).
