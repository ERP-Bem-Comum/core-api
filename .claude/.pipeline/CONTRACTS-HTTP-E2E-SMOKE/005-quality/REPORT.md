# W3 (Quality Gate) — CONTRACTS-HTTP-E2E-SMOKE (C5)

> Skill: `ts-quality-checker` · Outcome: **GREEN** (4 gates locais + smoke E2E)

## Gates locais (`pnpm test` glob)

| Comando | Exit | Resultado |
| :-- | :-- | :-- |
| `pnpm run typecheck` | 0 | sem erros |
| `pnpm run format:check` | 0 | All matched files use Prettier code style |
| `pnpm run lint` | 0 | sem erros |
| `pnpm test` | 0 | tests 1553 · pass 1537 · fail 0 · skipped 16 |

Inclui o unitário `e2e-auth-seed.test.ts` → 6/6 (`parseE2eAuthSeed`).

## Smoke E2E (Docker — fora do `pnpm test`)

`pnpm run test:e2e:contracts` → **tests 4 · pass 4 · fail 0** (validado manualmente, server real + MySQL
dual-pool):
- CA1 `/health` 200 (boot auth+contracts mysql);
- CA2 401 sem token + 403 sem `contract:read` (rota C1);
- CA3 register→login→/me (coexistência);
- CA4 operador seedado → `POST /contracts` 201 (writer root) → `GET /:id` 200 (reader `readonly_bi`) →
  `export.csv` 200 → list 200 (RW split com credenciais distintas).

## Nota

Os 16 skipped são o gate de integração `auth` (`MYSQL_INTEGRATION=1`), conhecido. O smoke E2E não entra no
`pnpm test` (sufixo `.e2e.ts`, exige Docker) — validação manual via `test:e2e:contracts`.

**GREEN** — todos os gates passam. Ticket pronto para `close`.
