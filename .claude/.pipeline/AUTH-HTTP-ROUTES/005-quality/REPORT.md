# W3 — Gate de Qualidade — AUTH-HTTP-ROUTES (H1a)

**Wave:** W3 · **Skill:** ts-quality-checker · **Outcome:** ALL-GREEN · **Data:** 2026-05-28

| Comando | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ zero erros (composition ES256/Drizzle, `satisfies` Zod, inferência `req.body`) |
| `pnpm run lint` | ✅ limpo (`auth/adapters/http/**` herda folgas de borda; return type explícito em `loadOrGenerateKeys`) |
| `pnpm run format:check` | ✅ Prettier ok |
| `pnpm test` | ✅ **1432 tests · 1416 pass · 0 fail · 16 skip** (+9 routes, −5 sentinela removida; 16 skip = integração auth) |

## CAs (H1a)

| CA | Status |
| :-- | :-- |
| CA1 register 201 | ✅ |
| CA2 register repetido 409 | ✅ |
| CA3 body inválido 400 | ✅ |
| CA4 senha fraca 422 | ✅ |
| CA5 login 200 + tokens | ✅ |
| CA6 senha errada / email inexistente → 401 (enumeração-safe) | ✅ |
| CA11 OpenAPI register+login; `__ping` ausente | ✅ |
| CA12 `no-store` em `/api/v2/auth/*` | ✅ |
| CA13 regressão (shell+baseline) | ✅ |

> Diferidos p/ H1b/integração: CA7 (login-disabled), CA8–CA10 (refresh/logout).

## Veredito
**ALL-GREEN.** Pronto para `close`. Follow-up: `AUTH-HTTP-ROUTES-SESSION` (H1b — refresh+logout, reusa composition).
