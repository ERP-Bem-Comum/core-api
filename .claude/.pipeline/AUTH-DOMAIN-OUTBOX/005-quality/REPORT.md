# W3 — Gate de Qualidade · AUTH-DOMAIN-OUTBOX

> Skill: `ts-quality-checker` · Outcome: **GREEN** · reverificado na sessão principal.

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | 0 erros |
| `pnpm run format:check` | limpo |
| `pnpm run lint` | 0 problemas |
| `pnpm test` | exit 0 — 2813 pass / 0 fail / 18 skip |

Migration `0007_careless_orphan.sql` versionada. Sem `npm` (ADR-0012). Regressão zero (reset/invite verdes).

## Fora de escopo (fatias seguintes do ADR-0047)
- 02 `NOTIF-EMAIL-EVENT-CONSUMER`: consumer evento→template→`EmailSender`; aposenta `notifications_email_outbox`;
  o adapter Drizzle do auth ainda **não** tem helpers de worker (`withPendingBatch`/DLQ) — entram na fatia 02.
- 03 `PARTNERS-INVITE-DOMAIN-EVENT`.
