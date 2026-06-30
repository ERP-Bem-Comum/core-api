# W3 — Gate de Qualidade · NOTIF-EMAIL-OUTBOX

> Skill: `ts-quality-checker` · Outcome: **GREEN**
> Reverificado de forma independente pela sessão principal (Política de regressão zero).

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | `tsc --noEmit` — **0 erros** |
| `pnpm run format:check` | `All matched files use Prettier code style!` |
| `pnpm run lint` | `eslint .` — **0 problemas** |
| `pnpm test` | **exit 0** — `tests 2766 · pass 2748 · fail 0 · skipped 18` (integração atrás de opt-in de env) |

Sem `npm` em scripts/docs (ADR-0012). Migration `0000` versionada. Nenhum vermelho não-endereçado.

## Pendências registradas para o humano

1. **Atomicidade total** do piloto (enqueue na tx do save) — follow-up por isolamento de módulo.
2. **Operacional (não-código):** `NOTIFICATIONS_DATABASE_URL`; caixa SMTP/Umbler + `SMTP_PASS`;
   SPF/DKIM/DMARC; aplicar migration `0000` no release antes de subir `worker:email`.
3. **Follow-ups de escopo:** migrar `invite-mailer`/`collaborator-invite-mailer`; env
   `EMAIL_PROVIDER`/`EMAIL_SANDBOX_TO`; observabilidade (status/bounce/rate-limit).
