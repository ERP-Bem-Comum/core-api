# W3 — Gate de Qualidade · NOTIF-EMAIL-EVENT-CONSUMER

> Skill: `ts-quality-checker` · Outcome: **GREEN** · reverificado na sessão principal.

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | 0 erros |
| `pnpm run lint` | 0 problemas (após os 6 consertos `require-await`/`init-declarations`/`no-base-to-string` na retomada) |
| `pnpm run format:check` | limpo |
| `pnpm test` | exit 0 — 2837 pass / 0 fail / 18 skip |

Sem `npm` (ADR-0012). Regressão zero. Worker `email-dispatch` com entrypoint + config por env.

## Follow-up
- **02b** `NOTIF-EMAIL-OUTBOX-RETIRE`: remover mailers/`EmailOutbox`/`notifications_email_outbox` (código)
  + migration de DROP. (Issue a abrir.)
- **03** `PARTNERS-INVITE-DOMAIN-EVENT`.
