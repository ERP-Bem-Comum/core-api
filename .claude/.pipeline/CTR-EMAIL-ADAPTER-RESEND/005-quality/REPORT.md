# W3 — REPORT (Gate de qualidade)

Ticket: CTR-EMAIL-ADAPTER-RESEND

## Resultado: TODOS VERDES

| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | ✅ sem erros |
| Format | `pnpm run format:check` (`prettier --check .`) | ✅ "All matched files use Prettier code style!" |
| Lint | `pnpm run lint` (`eslint .`) | ✅ sem warnings/errors |
| Testes | `pnpm test` | ✅ `tests 2569 · pass 2550 · fail 0 · skipped 19` |

`duration_ms` da suíte: ~41.8s. Os 19 skipped são integration opt-in (MySQL/S3/notifications), incluindo `resend.integration.test.ts` (skip correto sem `NOTIFICATIONS_INTEGRATION=1` + `RESEND_API_KEY`).

## Política de regressão zero

0 falhas em toda a suíte. Nenhuma regressão introduzida.

## Pendência de validação externa (não bloqueante)

CA-T5 (send real) só executa com `RESEND_API_KEY` provisionada:

```bash
NOTIFICATIONS_INTEGRATION=1 RESEND_API_KEY=re_... pnpm run test:integration:notifications
```

Usa sandbox `onboarding@resend.dev` → `delivered@resend.dev` (não exige domínio verificado).
