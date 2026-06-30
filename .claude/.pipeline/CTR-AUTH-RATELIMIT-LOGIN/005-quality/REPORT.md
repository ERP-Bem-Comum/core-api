# W3 — Quality Gate

Sob pnpm 11.5.0.

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ limpo |
| `pnpm run lint` | ✅ limpo |
| `pnpm run format:check` | ✅ Prettier OK |
| testes auth (`tests/modules/auth/**`) | ✅ 200 pass / 0 fail (+3 novos) |

`config.rateLimit` tipou via augmentation do `@fastify/rate-limit` (plugin já é dep). Integração
MySQL não exercida (borda HTTP coberta por testes in-memory).
