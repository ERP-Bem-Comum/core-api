# W3 (GREEN) — BGP-MEMORY-SEED-CATALOG (#330)

> Skill: `ts-quality-checker`. Gate final. **Sem MySQL** — o #330 é driver `memory` (seed via env), a
> validação é o gate estático + `pnpm test`. Worktree: `.claude/worktrees/budget-plans-330-377`.

## Resultado

**GREEN em todos os gates.**

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ verde (TS2307 do W0 resolvido) |
| `pnpm run format:check` | ✅ `All matched files use Prettier code style!` |
| `pnpm run lint` | ✅ verde (22 cascatas `no-unsafe-*` do W0 resolvidas) |
| `pnpm test` | ✅ **4050 tests · 4031 pass · 0 fail · 19 skipped** |

Os 19 skips são integração gated (`MYSQL_INTEGRATION`), pré-existentes e alheios. Os testes do #377
(uncommitted na mesma worktree, já verdes) seguem verdes — regressão zero entre os dois tickets.

## Por que não há passo de MySQL

O #330 destrava o caminho feliz **local no driver memory** — o seed (`BUDGET_PLANS_SEED_JSON`) alimenta os
adapters in-memory (`InMemoryProgramCatalog`/`InMemoryPartnerNetwork`), não o banco. Não há SQL novo, migration
nem query — a validação real é o teste HTTP `fastify.inject` (CA1/CA2) + o unit do parser (CA3/CA4), todos no
`pnpm test` puro. Nada a validar em MySQL.

## Saída REAL dos gates

```
$ pnpm run typecheck   → tsc --noEmit (sem erros)
$ pnpm run lint        → eslint . (sem erros)
$ pnpm run format:check → All matched files use Prettier code style!
$ pnpm test            → tests 4050 · pass 4031 · fail 0 · skipped 19
```

## CA1–CA4 — fechamento

| CA | Prova |
| :-- | :-- |
| **CA1** — POST /budget-plans 201 no memory com seed | HTTP `seed-catalog.routes.test.ts` |
| **CA2** — GET /options mostra programa + redes | HTTP `seed-catalog.routes.test.ts` |
| **CA3** — boot fail em malformado (throw propaga → exit) | unit `e2e-seed.test.ts` + `server.ts` (`main().catch → exit`) |
| **CA4** — guarda dupla / inerte em produção | unit `e2e-seed.test.ts` (5 casos) |

## Follow-up (do 000-request, fora do escopo de código)

- Promover a coleção Bruno `z-pending-fixes/budget-plans/` para a pasta principal + incluir `budget-plans` em
  `scripts/e2e/bruno-all.sh` (`MAIN_FOLDERS` + `SEED_JSON`). É mover `.bru` + editar shell, não código do server.
  Candidato a follow-up (o backend já está destravado — o front/dev local consegue exercitar o create).

## DoD

✅ Gate W3 verde · ✅ CA1–CA4 provados · ✅ caminho feliz local destravado (POST 201 no memory) · ✅ guarda
dupla + boot fail · ✅ import via public-api (ADR-0006) · ✅ regressão zero. **Pronto para commit.** Fecha #330.
