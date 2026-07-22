# W3 — Gate de qualidade (REPORTS-PAYMENT-POSITION · #243 · REP-4)

**Outcome:** GREEN. Skill: `ts-quality-checker`.

## Gate (worktree `238-reports-team`, branch `feat/243-reports-payment-position`)

| Check | Comando | Resultado |
| :-- | :-- | :-- |
| Typecheck | `pnpm run typecheck` | ✅ sem erros |
| Format | `pnpm run format:check` | ✅ Prettier ok |
| Lint | `pnpm run lint` | ✅ `eslint .` sem erros |
| Unit | `pnpm test` | ✅ **3990 tests / 3971 pass / 0 fail / 0 cancelled** |

## Integração MySQL — validada no **x99** (voltou a funcionar 2026-07-14) + OrbStack

Método x99: MySQL 8.4.10 avulso no host + túnel SSH `-L 3306`, suíte rodada com `--test-concurrency=1`
(reset do db `core` entre suítes).

- **CA4** `payment-position.drizzle-mysql.test.ts` ✔ no x99 8.4.10 (`201ms`): 3 baldes corretos
  (`pending=310000` c/ o "vence hoje", `paid=150000`, `overdue=200000` — `< hoje` estrito via ClockFixed),
  Cancelled fora, refs nulos agrupam, nomes via LEFT JOIN. B2 (fronteira `due_date == hoje`) coberto.
- Suíte `financial` completa: **77/77 pass, 0 fail** no x99 (inclui REP-2 e REP-4).

## W2 aplicado
`.strict()` já vinha; B2 (fixture `due_date == hoje`) adicionado. M1 (pool registry p/ readers HTTP do
`reports`) e B1/B3 = follow-ups documentados no REVIEW, fora de escopo.

## DoD
Gate verde + `GET /api/v2/reports/payment-position` com RBAC `fiscal-document:read` + agregação validada
no x99. Fecha #243; não fecha #114 (3 de 9 slices).
