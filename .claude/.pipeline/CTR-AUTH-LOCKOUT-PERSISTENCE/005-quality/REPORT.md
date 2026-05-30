# W3 — Quality Gate

Sob pnpm 11.5.0.

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ limpo |
| `pnpm run lint` | ✅ limpo |
| `pnpm run format:check` | ✅ Prettier OK |
| `pnpm run db:generate:auth` | ✅ migration `0002_sweet_the_watchers.sql` (+ hardening) |
| testes auth (`tests/modules/auth/**`) | ✅ 230 pass / 0 fail (+3) |

O account lockout agora **persiste no MySQL** (driver mysql) — antes era in-memory. Integração MySQL
não exercida (porta 3306 ocupada). Follow-ups restantes do épico: Redis p/ **rate-limit** (ainda
in-memory) + validação MySQL.
