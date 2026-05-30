# W3 — Quality Gate

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ limpo |
| `pnpm run lint` | ✅ limpo |
| `pnpm run format:check` | ✅ Prettier OK |
| Integração auth existente (MySQL 3307) | ✅ 29 pass / 0 fail (migrations 0000-0002 aplicam) |
| Integração repos novos (reset + lockout) | ✅ 2 pass / 0 fail |

**Pendência de validação MySQL do épico: RESOLVIDA.** Os adapters Drizzle de reset token e lockout,
e o schema/migrations 0001/0002 (com hardening manual), estão validados contra MySQL 8.4 real.
