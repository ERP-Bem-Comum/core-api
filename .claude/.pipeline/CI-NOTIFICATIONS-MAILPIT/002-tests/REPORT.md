# W0 — REPORT (CI-NOTIFICATIONS-MAILPIT, #135/US4)

> **Owner:** skill `tdd-strategist` · **Resultado: RED** (4/5 falham por inexistência).

## Teste

`tests/scripts/test-integration-notifications-script.test.ts` — asserção de estrutura no source
(molde de `test-integration-auth-script.test.ts`, já que `SUITES` não é exportado).

| Teste | Estado W0 | Cobre |
| :-- | :-- | :-- |
| CA1a — script delega ao orquestrador `... notifications` | ✅ pass (já existia no package.json) | — |
| CA1b — suíte `notifications` sobe `mailpit` | ✖ RED (hoje `services: []`) | CA1 |
| CA1c — suíte exporta envs SMTP (HOST/PORT 1025/SECURE) + gate | ✖ RED | CA1 |
| CA2 — workflow `integration-notifications.yml` (path filter + `workflow_dispatch` + roda a suíte) | ✖ RED (arquivo não existe) | CA2 |
| CA3 — actions do workflow pinadas por SHA | ✖ RED | CA3 |

```
ℹ tests 5 · pass 1 · fail 4
```

## Alvos do W1
1. `scripts/ci/test-integration.ts` — suíte `notifications`: `services: ['mailpit']` + `env` com
   `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `SMTP_SECURE=false`, `SMTP_REQUIRE_TLS=false`, creds dummy.
2. `.github/workflows/integration-notifications.yml` — path filter (`src/modules/notifications/**`,
   `src/workers/email-dispatch/**`, `tests/modules/notifications/**`) + `workflow_dispatch` + actions SHA-pinned.
3. **CA4 (gate intacto):** `pnpm test` puro segue skipando as `*.integration.test.ts` de notifications.

## Nota — validação real destravada
O `000-request` marcava "rodar integração localmente fora do escopo (Docker proibido)". Com o **x99 up**
nesta sessão, dá para validar de verdade no W3: subir `mailpit` no x99 + túnel SMTP e rodar
`NOTIFICATIONS_INTEGRATION=1` — não só confiar no CI (CA6).
