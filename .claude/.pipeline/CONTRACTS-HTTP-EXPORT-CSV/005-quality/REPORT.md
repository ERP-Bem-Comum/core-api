# W3 (Quality Gate) — CONTRACTS-HTTP-EXPORT-CSV (C4)

> Skill: `ts-quality-checker` · Outcome: **GREEN** (4/4 comandos)

| Comando | Exit | Resultado |
| :-- | :-- | :-- |
| `pnpm run typecheck` | 0 | sem erros |
| `pnpm run format:check` | 0 | All matched files use Prettier code style |
| `pnpm run lint` | 0 | sem erros |
| `pnpm test` | 0 | tests 1547 · pass 1531 · fail 0 · skipped 16 |

## Suíte

`contracts-export-csv.routes.test.ts` → 9/9 (authz, happy + headers + BOM + colunas, vazio, formula
injection, quoting RFC 4180, OpenAPI text/csv, roteamento estático, regressão).

16 skipped = gate de integração `auth` (`MYSQL_INTEGRATION=1`), conhecido e fora de escopo.

**GREEN** — pronto para `close`.
