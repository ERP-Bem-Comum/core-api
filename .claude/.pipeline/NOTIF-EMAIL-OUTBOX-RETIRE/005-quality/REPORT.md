# W3 — Gate de Qualidade · NOTIF-EMAIL-OUTBOX-RETIRE

> Skill: `ts-quality-checker` · Outcome: **GREEN** · reverificado na sessão principal.

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | 0 erros |
| `pnpm run lint` | 0 problemas |
| `pnpm run format:check` | limpo |
| `pnpm test` | exit 0 — 2824 pass / 0 fail / 18 skip |

Migration `0001_bouncy_maddog.sql` (DROP) versionada. Sem `npm` (ADR-0012). Regressão zero.

## Conclui o ADR-0047
Fila antiga `notifications_email_outbox` aposentada. Caminho único: produtor emite evento na tx →
`email-dispatch` consome (`auth_outbox` + `par_email_outbox`) → `EmailSender`. Fecha #151.

## Follow-up menor (issue a abrir)
Ports de mailer órfãos + `collaborator-invite-mailer.capturing.ts` (dead code, zero importador).
