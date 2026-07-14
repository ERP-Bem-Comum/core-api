# W3 — Gate de qualidade (REPORTS-SUPPLIERS-NO-CONTRACT · #240 · REP-2)

**Outcome:** GREEN. Skill: `ts-quality-checker`.

## Gate (worktree `.claude/worktrees/238-reports-team`, branch `feat/240-reports-suppliers-no-contract`)

| Check | Comando | Resultado |
| :-- | :-- | :-- |
| Typecheck | `pnpm run typecheck` | ✅ `tsc --noEmit` sem erros |
| Format | `pnpm run format:check` | ✅ Prettier ok |
| Lint | `pnpm run lint` | ✅ `eslint .` sem erros |
| Unit | `pnpm test` | ✅ **3986 tests / 3967 pass / 0 fail / 0 cancelled** |

## Integração MySQL (OrbStack — x99 offline, exceção autorizada)

- `pnpm run test:integration:financial` → suíte **76/76 pass, 0 fail, 0 cancelled**.
- **CA4** `suppliers-without-contract.drizzle-mysql.test.ts` ✔ — agrega `fin_payable_view` por fornecedor:
  Cancelled contado (`totalCents=150000`, `payableCount=2`), nome via LEFT JOIN `fin_supplier_view`,
  supplier sem projeção → `name null`, exclusões (com contrato / `supplier_ref` null) corretas.

## W2 aplicado
`.strict()` nos response schemas (M2). M1 (índice `contract_ref`) e M3 (regra eslint ADR-0006) = follow-ups
documentados, fora de escopo.

## DoD
Gate verde + `GET /api/v2/reports/suppliers-without-contract` com RBAC `fiscal-document:read` + agregação
validada no OrbStack. Fecha #240; não fecha #114 (2 de 9 slices).
