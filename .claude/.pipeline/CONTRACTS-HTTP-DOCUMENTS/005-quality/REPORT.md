# W3 (Quality Gate) — CONTRACTS-HTTP-DOCUMENTS (C3)

> Skill: `ts-quality-checker` · Outcome: **GREEN** (4/4 comandos)

## Resultado dos comandos

| Comando | Exit | Resultado |
| :-- | :-- | :-- |
| `pnpm run typecheck` (`tsc --noEmit`) | 0 | sem erros |
| `pnpm run format:check` (`prettier --check .`) | 0 | All matched files use Prettier code style |
| `pnpm run lint` (`eslint .`) | 0 | sem erros |
| `pnpm test` (node:test + strip-types) | 0 | tests 1535 · pass 1519 · fail 0 · skipped 16 |

## Suíte do ticket

`contracts-documents.routes.test.ts` → 21/21 (CA1-CA8 das 3 rotas), incluindo **CA5** (fluxo real sem seed:
upload→activate 200; upload+attach→homologate 200) e **CA8** (bodyLimit cirúrgico — global 1 MiB intacto).

## Nota sobre os 16 skipped

Gate de integração `auth` (Drizzle, `MYSQL_INTEGRATION=1`) — conhecido e fora do escopo do C3 (driver
`memory` via `app.inject`). Sem falso-verde: o C3 não tem testes de integração com MySQL.

## Veredito

**GREEN** — todos os gates passam. Ticket pronto para `close`.
