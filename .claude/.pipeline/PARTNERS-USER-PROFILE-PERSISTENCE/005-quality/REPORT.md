# W3 — QUALITY · PARTNERS-USER-PROFILE-PERSISTENCE

**Skill:** ts-quality-checker · **Resultado:** GREEN (escopo do ticket)

## Gates

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` (`tsc --noEmit`) | ✅ zero erros |
| `pnpm run lint` (`eslint .`) | ✅ zero erros |
| `pnpm run format:check` | ✅ All matched files use Prettier code style |
| `node --test tests/modules/partners/**/*.test.ts` | ✅ **226/226** |
| `pnpm test` (global) | 1852 testes · **1820 pass** · 16 fail (todas pré-existentes de infra) |

## Ajustes feitos durante o W3

1. **format** — `prettier --write` nos artefatos gerados pelo `drizzle-kit` (`meta/0003_snapshot.json`,
   `meta/_journal.json`) e nos arquivos novos. typecheck e lint passaram de primeira.

## Falhas pré-existentes (fora de escopo)

`pnpm test` global: **16 falhas, todas** em `tests/infra/mysql-compose.test.ts` (`CTR-DB-COMPOSE-MYSQL`,
CA-3..CA-19). Independem deste ticket.

## Integração (gated — não rodada)

`user-profile-repository.drizzle.test.ts` (4 testes) roda com `MYSQL_INTEGRATION=1` via
`test:integration:partners` (estendido). Não executada no W3 para não alterar o container do usuário.
Mapper round-trip unit (8 testes) cobre a tradução row↔domínio.

## Veredito

Gate do ticket **GREEN**. Pré-requisito **P1** da ETL satisfeito.
