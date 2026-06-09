# W0 — REPORT (RED)

Ticket: CTR-EMAIL-ADAPTER-RESEND · Agente: tdd-strategist

## Testes escritos

| Arquivo | CAs | Gate | Estado |
| --- | --- | --- | --- |
| `tests/modules/notifications/adapters/email/resend-config.test.ts` | CA-T1, T2, T2b | `pnpm test` (rápido) | RED |
| `tests/modules/notifications/adapters/email/resend.test.ts` | CA-T3, T4, T4b | `pnpm test` (rápido) | RED |
| `tests/modules/notifications/adapters/email/resend.integration.test.ts` | CA-T5 | opt-in `NOTIFICATIONS_INTEGRATION=1` + `RESEND_API_KEY` | RED |

## Resultado

```
ℹ tests 3
ℹ pass 0
ℹ fail 3
```

RED legítimo: falha por `ERR_MODULE_NOT_FOUND` — `resend-config.ts` e `resend.ts` ainda não existem. A API exercitada (`parseResendConfig`, `mapResendError`, `createResendEmailSender`) é o alvo de W1.

## Notas de design fixadas

- `mapResendError` exportada e testada **pura** (não há `mock.module` no projeto). Cobre os 2 buckets: `invalid-recipient` (heurística sobre `to`/`recipient`/`address`) e `smtp-rejected` (rejeição estruturada genérica do provider).
- Happy path do `send()` validado só no integration opt-in (sem Ethereal-equivalente; usa sandbox `onboarding@resend.dev` → `delivered@resend.dev`).
- Integração entra automática no glob de `test:integration:notifications` — sem tocar `package.json`.
