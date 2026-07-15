# BGP-LIST-NEST-SCENARIOS — W3 (GREEN) · #423

> Skill: `ts-quality-checker`. Gate final + validação MySQL real (CA5).
> Worktree: `.claude/worktrees/423-budget-plans-nest`.

## Resultado

**GREEN em todos os gates + CA5 validado em MySQL 8.4.10 real (suíte budget-plans 30/30).**

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ verde |
| `pnpm run format:check` | ✅ `All matched files use Prettier code style!` |
| `pnpm run lint` | ✅ verde |
| `pnpm test` (unit) | ✅ **4025 tests · 4006 pass · 0 fail · 19 skipped** |
| Integração `budget-plans` (completa) | ✅ **30 tests · 30 pass · 0 fail** |
| **CA5 — `rootsOnly` + item em MySQL real** | ✅ |

## 🔴 Regressão encontrada e corrigida nesta wave (só o MySQL real pega)

Ao rodar a suíte `budget-plans` completa contra MySQL real, **3 testes falharam** com
`ER_ROW_IS_REFERENCED_2` (`listPaged ordena por updatedAt DESC`, `listYears`, `save upsert`) — todos
**depois** do meu caso novo `rootsOnly`.

**Causa:** o caso `rootsOnly` (escrito no W0) é o **primeiro** da suíte `budget-plan-repository` a criar
um par **pai→filho** (raiz + cenário, FK auto-referente `parent_id ON DELETE restrict`). O `truncate` do
`drizzle-mysql.test.ts:40-43` fazia `delete(budgetPlans)` de uma vez — sem tratar a FK — e quebrava ao
tentar deletar o pai antes do filho. Como nenhum teste anterior da suíte criava filhos, o defeito estava
latente. **O in-memory não tem FK, então o `pnpm test` puro nunca pegaria** — só o MySQL real.

**Cura (padrão já existente):** apliquei o mesmo teardown do `plan-lifecycle.drizzle-mysql.test.ts:65-66`
— deletar **filhos (`parentId IS NOT NULL`) antes dos pais**:

```ts
await h.db.delete(h.schema.budgets);
await h.db.delete(h.schema.budgetPlans).where(isNotNull(h.schema.budgetPlans.parentId));
await h.db.delete(h.schema.budgetPlans);
```

Prova: banco recriado do zero, suíte completa **30/30**.

## 🔵 Teste órfão registrado no manifesto (mesmo defeito de gate do #316/REP-3)

O `drizzle-mysql.test.ts` (que consome a suite parametrizada — onde vive o caso `rootsOnly`/CA5) **não
estava no manifesto** `scripts/ci/test-integration.ts` (o bloco budget-plans só listava cost-structure,
budget-result, plan-lifecycle, consolidated). Ou seja, o CA5 rodaria só à mão, nunca no
`pnpm run test:integration:budget-plans`. **Registrei-o** (o próprio manifesto já tinha precedente:
comentário #316 "estava órfã: nunca registrada no runner"). Agora o contrato do repo — incluindo
`rootsOnly` — tem gate permanente.

## CA5 — validação em MySQL real

```
✔ listPaged: rootsOnly=true retorna só planos raiz (parent_id IS NULL)
✔ findRootByYearAndProgram encontra o plano raiz por (year, programRef)
✔ start-calibration persiste filho na árvore (FK auto-ref) + listChildren + findRoot só a raiz
… (suíte budget-plans completa: 30/30)
```

Cobre: filtro `isNull(parentId)` sob `rootsOnly=true` (usa o índice `bgp_budget_plans_parent_id_idx`);
round-trip do item com `parentId`/`scenarioName`; não-regressão do default (sem param = tudo).

## Ambiente — exceção OrbStack (x99 offline)

Caminho não-destrutivo (ver [[test-integration-destroys-dev-infra]]): `docker stop core-api-mysql` →
MySQL 8.4.10 avulso na 3306 → suíte → `docker rm -f` + `docker start core-api-mysql`. Pós-condições:
infra dev Up (healthy), volume `core-api-mysql-data` presente, nenhum container `bgp423-*` remanescente.

## Saída REAL dos gates

```
$ pnpm run typecheck   → tsc --noEmit (sem erros)
$ pnpm run lint        → eslint . (sem erros)
$ pnpm run format:check → All matched files use Prettier code style!
$ pnpm test            → tests 4025 · pass 4006 · fail 0 · skipped 19
```

## CA1–CA5 — fechamento

| CA | Prova |
| :-- | :-- |
| **CA1** — sem param = tudo flat (não-regressão) | HTTP + unit (verde) |
| **CA2** — item sempre expõe parentId/scenarioName; legados intactos | HTTP + unit |
| **CA3** — `?rootsOnly=true` só raízes | HTTP + unit + contract MySQL |
| **CA4** — `rootsOnly` não-booleano → 400 (`z.stringbool`) | HTTP |
| **CA5** — filtro + item em MySQL real | **este relatório** — 30/30, `rootsOnly` verde |

## Follow-ups

- Nenhum bloqueante. O teste órfão foi corrigido (não fica como dívida).

## DoD

✅ Gate W3 verde · ✅ CA1–CA5 provados · ✅ sem migration · ✅ default da lista inalterado ·
✅ regressão de teardown FK corrigida na causa · ✅ teste órfão registrado · ✅ infra dev restaurada.
**Pronto para commit + PR.** Fecha #423.
