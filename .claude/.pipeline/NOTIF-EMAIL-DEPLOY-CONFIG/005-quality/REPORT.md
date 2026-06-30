# W3 — Gate de Qualidade · NOTIF-EMAIL-DEPLOY-CONFIG

> Skill: `ts-quality-checker` · Outcome: **GREEN**
> Reverificado de forma independente pela sessão principal (Política de regressão zero).

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | `tsc --noEmit` — **0 erros** |
| `pnpm run format:check` | `All matched files use Prettier code style!` |
| `pnpm run lint` | `eslint .` — **0 problemas** |
| `pnpm test` | **exit 0** — 2801 tests / 0 fail / 18 skip (integração opt-in) |

Sem `npm` (ADR-0012). Sem regressão nos testes de reset/invite. Anti-enumeração (202) preservada.

## Documentação
Envs novas documentadas em `handbook/infrastructure/03-secrets-catalog.md` §3.6 (E-mail / notifications).

## Pendências para o humano
- Migrar `invite`/`collaborator-invite` para o **outbox** (ticket próprio — segue pendente).
- Operacional (#117): provisionar os secrets reais (`SMTP_PASS`/`RESEND_API_KEY`) + SPF/DKIM/DMARC.
