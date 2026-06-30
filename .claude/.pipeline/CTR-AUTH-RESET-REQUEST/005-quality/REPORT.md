# W3 — Quality Gate

Sob pnpm 11.5.0.

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ limpo |
| `pnpm run lint` | ✅ limpo (corrigidos import não-usado + require-await no fake) |
| `pnpm run format:check` | ✅ Prettier OK |
| testes auth (`tests/modules/auth/**`) | ✅ 219 pass / 0 fail (+4) |

**Pendências:** (1) mailer Nodemailer não fiado — no-op seguro sem SMTP; (2) integração MySQL
não exercida (porta 3306 ocupada). Comportamento coberto por testes in-memory/use case.

Falta da cadeia: `CTR-AUTH-RESET-CONFIRM` (consumir token + trocar senha + revogar sessões).
