# W3 — Gate de qualidade (REPORTS-TEAM-ABC · #238 · REP-1)

**Outcome:** GREEN. Skill: `ts-quality-checker`.

## Gate (worktree `.claude/worktrees/238-reports-team`)

| Check | Comando | Resultado |
| :-- | :-- | :-- |
| Typecheck | `pnpm run typecheck` | ✅ `tsc --noEmit` sem erros |
| Format | `pnpm run format:check` | ✅ All matched files use Prettier code style |
| Lint | `pnpm run lint` | ✅ `eslint .` sem erros |
| Unit | `pnpm test` | ✅ **3982 tests / 3963 pass / 0 fail / 0 cancelled** |

## Integração MySQL (OrbStack — x99 offline, exceção autorizada 2026-07-13)

- **CA4** `pnpm run test:integration:partners` → `collaborator-projection.drizzle-mysql.test.ts`
  **✔ CA4: projeta as 9 colunas LGPD-safe de par_collaborators (program: null)** — reader boot-scoped lê `par_collaborators` real, prova LGPD (`Object.keys` = exatamente 9).

## Nota de regressão zero — falha pré-existente NÃO relacionada ao #238

`pnpm run test:integration:partners` fecha com **1 cancelled**: `suppliers-batch-reader — e2e par_suppliers`
(`ER_DUP_ENTRY` CNPJ `11222333000181`). **Provado pré-existente na `dev`** (baseline sem o #238:
`pass 48 / cancelled 1`, mesma falha). Causa-raiz: `supplier-repository.drizzle.test.ts` limpa
`par_suppliers` só no `beforeEach`, deixando resíduo que colide com o `before` (delete só por id) do
`suppliers-batch-reader`. **Fora do escopo do #238** (código de teste do #356) — registrado como
follow-up em `FOLLOWUP-partners-integration-red.md` (não consertado inline — ADR-0040 / anti-padrão #15;
criação da GitHub Issue bloqueada pelo classificador → comando pronto no follow-up para o humano rodar).

## DoD
Gate verde + `GET /api/v2/reports/team` com RBAC + projeção validada no OrbStack + pool boot-scoped (F1 do W2 corrigido). Fecha #238; **não** fecha #114 (1 de 9 slices).
