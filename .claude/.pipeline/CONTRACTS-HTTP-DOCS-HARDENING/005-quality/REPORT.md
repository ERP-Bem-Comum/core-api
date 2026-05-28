# W3 (Quality Gate) — CONTRACTS-HTTP-DOCS-HARDENING

> Skill: `ts-quality-checker` · Outcome: **GREEN** (4/4 comandos)

| Comando | Exit | Resultado |
| :-- | :-- | :-- |
| `pnpm run typecheck` | 0 | sem erros |
| `pnpm run format:check` | 0 | All matched files use Prettier code style |
| `pnpm run lint` | 0 | sem erros |
| `pnpm test` | 0 | tests 1538 · pass 1522 · fail 0 · skipped 16 |

## Suítes

- `contracts-docs-hardening.routes.test.ts` → 3/3 (ownership E3 200/409 + OpenAPI binary E1/E2).
- `contracts-documents.routes.test.ts` (regressão C3) → 21/21.

16 skipped = gate de integração `auth` (`MYSQL_INTEGRATION=1`), conhecido e fora de escopo.

**GREEN** — pronto para `close`.
