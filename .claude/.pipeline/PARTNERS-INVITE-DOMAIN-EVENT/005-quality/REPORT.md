# W3 — Gate de Qualidade · PARTNERS-INVITE-DOMAIN-EVENT

> Skill: `ts-quality-checker` · Outcome: **GREEN** · reverificado na sessão principal.

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | 0 erros |
| `pnpm run lint` | 0 problemas |
| `pnpm run format:check` | limpo |
| `pnpm test` | exit 0 |

Migration `0016_natural_pyro.sql` versionada. Sem `npm` (ADR-0012). Regressão zero. `auth_outbox` intacto.

## Fecha o ADR-0047 (produção)
Os 3 produtores migrados: `auth` (reset/invite) + `partners` (collaborator-invite). Só resta a limpeza:
**02b** `NOTIF-EMAIL-OUTBOX-RETIRE` (#151) — agora inclui `collaborator-invite-mailer.*` na lista de órfãos + DROP das tabelas de outbox de e-mail legadas.
