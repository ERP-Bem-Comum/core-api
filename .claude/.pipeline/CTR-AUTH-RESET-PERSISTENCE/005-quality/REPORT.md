# W3 — Quality Gate

Sob pnpm 11.5.0.

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ limpo |
| `pnpm run lint` | ✅ limpo |
| `pnpm run format:check` | ✅ (após ignorar o `meta/` do drizzle auth) |
| `pnpm run db:generate:auth` | ✅ migration `0001_luxuriant_triton.sql` gerada (+ hardening manual) |
| testes auth (`tests/modules/auth/**`) | ✅ 215 pass / 0 fail (+2) |

**Pendência:** integração MySQL (`test:integration:auth`) não rodou — porta 3306 ocupada por
container alheio (`bemcomum-mysql`). O repo Drizzle e a migration não foram exercidos contra MySQL
real; validar quando a 3306 estiver livre. InMemory + paridade com o refresh cobrem o comportamento.
