# W3 (Quality Gate) — CONTRACTS-HTTP-READS (C1)

> Skill: `ts-quality-checker` · Outcome: **GREEN** (4/4 comandos)

## Resultado dos comandos

| Comando | Exit | Resultado |
| :-- | :-- | :-- |
| `pnpm run typecheck` (`tsc --noEmit`) | 0 | sem erros |
| `pnpm run format:check` (`prettier --check .`) | 0 | All matched files use Prettier code style |
| `pnpm run lint` (`eslint .`) | 0 | sem erros |
| `pnpm test` (node:test + strip-types) | 0 | tests 1485 · pass 1469 · fail 0 · skipped 16 |

## Suíte do ticket

`contracts-reads.routes.test.ts` → 12/12 pass (CA1 401/403/200/404, CA4 400+OpenAPI, CA2 401/403/200/404,
CA5 regressão, CA-seed authorize).

## Nota sobre os 16 skipped

São o gate de integração `auth` (Drizzle, exige `MYSQL_INTEGRATION=1`) — conhecido e fora do escopo deste
ticket, que roda inteiramente em driver `memory` via `app.inject`. Sem risco de falso-verde aqui: o C1 não
possui testes de integração com MySQL.

## Veredito

**GREEN** — todos os gates passam. Ticket pronto para `close`.
