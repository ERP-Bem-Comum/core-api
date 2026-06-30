# W3 — Quality Gate

Sob pnpm 11.5.0.

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ limpo |
| `pnpm run lint` | ✅ limpo |
| `pnpm run format:check` | ✅ Prettier OK |
| testes auth (`tests/modules/auth/**`) | ✅ 227 pass / 0 fail (+3) |

Reset de senha agora **funciona de ponta a ponta** com SMTP configurado (SMTP_* + AUTH_RESET_FROM);
sem SMTP, degrada para no-op seguro. Envio real contra SMTP não exercido nesta sessão (sem servidor
SMTP/Ethereal) — o adapter Nodemailer em si é coberto pelo módulo notifications.
