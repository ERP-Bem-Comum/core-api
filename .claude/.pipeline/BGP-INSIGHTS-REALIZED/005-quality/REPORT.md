# BGP-INSIGHTS-REALIZED — W3 (GREEN) · #416

> Skill: `ts-quality-checker`. Gate final + validação MySQL real (CA5).
> Worktree: `.claude/worktrees/416-realizado-conciliado`.

## Resultado

**GREEN em todos os gates + CA5 validado em MySQL 8.4.10 real (suíte financial 85/85).**

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ verde |
| `pnpm run format:check` | ✅ `All matched files use Prettier code style!` |
| `pnpm run lint` | ✅ verde |
| `pnpm test` (unit) | ✅ **4024 tests · 4005 pass · 0 fail · 19 skipped** |
| Integração `financial` (completa) | ✅ **85 tests · 85 pass · 0 fail** |
| **CA5 — reader realized-by-plan em MySQL real** | ✅ |

## CA5 — validação em MySQL real

A suíte `financial` completa (que agora inclui `realized-by-plan.drizzle-mysql.test.ts`, registrado no W0)
rodou contra MySQL 8.4.10 recriado do zero. O caso-chave verde:

```
✔ CA1/CA2: soma por plano inclui parciais e exclui reconciliações Undone
```

Cobre o JOIN 3-hop intra-financial (`fin_reconciliation_items → fin_reconciliations status='Active' →
fin_payables → fin_documents.budget_plan_ref`, `SUM(reconciled_value_cents) GROUP BY budget_plan_ref`):
soma por plano; **parciais entram** (R$60 de R$100 → 60); **Undone excluído**; batch de refs (anti-N+1);
ref sem conciliação → 0/ausente. Zero JOIN `bgp_*` × `fin_*`.

## Minor do W2 resolvido nesta wave — teste do fail-closed 503

O W2 apontou (Minor 1) que o caminho fail-closed (reader do financial indisponível → 503) não tinha teste.
Adicionado em `get-budget-plan-insights.test.ts`: um fake reader que devolve
`err('realized-by-plan-read-unavailable')`, assertando que o use-case **propaga o erro** em vez de servir
Planejado com Realizado silenciosamente zerado. Passa (o use-case já propaga). É o +1 no total (4005).
Os outros 2 Minor (in-memory ignora refs; 4º pool) são inócuos/informativos — não endereçados (fora de escopo).

## Ambiente — exceção OrbStack (x99 offline)

Caminho não-destrutivo (ver [[test-integration-destroys-dev-infra]]): `docker stop core-api-mysql` →
MySQL 8.4.10 avulso na 3306 → suíte → `docker rm -f` + `docker start core-api-mysql`. Pós-condições:
infra dev Up (healthy), volume `core-api-mysql-data` presente, nenhum container `bgp416-*` remanescente.

## Saída REAL dos gates

```
$ pnpm run typecheck   → tsc --noEmit (sem erros)
$ pnpm run lint        → eslint . (sem erros)
$ pnpm run format:check → All matched files use Prettier code style!
$ pnpm test            → tests 4024 · pass 4005 · fail 0 · skipped 19
```

## CA1–CA5 — fechamento

| CA | Prova |
| :-- | :-- |
| **CA1** — Realizado = Σ conciliado por plano; sem conciliados → 0 | integração `realized-by-plan` + unit + http |
| **CA2** — parciais entram; Undone não conta | integração `realized-by-plan` (MySQL real) |
| **CA3** — `networksCount = plan.budgets.length`; sem redes → 0 | unit + http |
| **CA4** — Planejado inalterado (aditivo); RBAC/rota preservados; fail-closed → 503 | unit (inclui o novo teste de fail-closed) + http |
| **CA5** — reader validado em MySQL real | **este relatório** — 85/85, parciais/Undone/batch |

## DoD

✅ Gate W3 verde · ✅ CA1–CA5 provados · ✅ Realizado real (parciais, por ano) + networksCount ·
✅ Planejado inalterado · ✅ reader único reusável pelo relatório Realizado×Planejado ·
✅ Minor do 503 coberto · ✅ infra dev restaurada. **Pronto para commit + PR.** Fecha #416.
