# W3 (GREEN) — BGP-DELETE-BUDGET-ATOMIC (#377)

> Skill: `ts-quality-checker`. Gate final + validação MySQL real (CA4 rollback).
> Worktree: `.claude/worktrees/budget-plans-330-377`.

## Resultado

**GREEN em todos os gates + CA4 (atomicidade/rollback) validado em MySQL 8.4.10 real.**

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ verde |
| `pnpm run format:check` | ✅ `All matched files use Prettier code style!` |
| `pnpm run lint` | ✅ verde |
| `pnpm test` (unit) | ✅ **4035 tests · 4016 pass · 0 fail · 19 skipped** |
| Integração `budget-plans` (completa) | ✅ **33 tests · 33 pass · 0 fail** |
| **CA4 — rollback atômico em MySQL real** | ✅ |

## CA4 — validação em MySQL real (o coração do ticket)

A suíte `budget-plans` completa (incluindo `remove-budget-atomic.drizzle-mysql.test.ts`, registrado no W0)
rodou contra MySQL 8.4.10 recriado do zero. O caso decisivo verde:

```
▶ #377 removeBudget atomico (Drizzle + MySQL)
  ✔ CA1/CA4 rollback: passo falha na tx -> NADA persiste (budget e results permanecem)
```

Prova a atomicidade **real**: um passo forçado a falhar dentro da `db.transaction` (evento malformado →
`bgp_outbox_event_type_nonempty_chk` rejeita o INSERT do outbox dentro da tx) faz **rollback total** — o
budget continua no plano E os `bgp_budget_results` continuam. Zero órfão, zero remoção parcial. É a dívida do
#377 (D2 "aceitável para MVP") resolvida de fato, não só mitigada.

## Ambiente — exceção OrbStack (x99 offline)

Caminho não-destrutivo (ver [[test-integration-destroys-dev-infra]]): `docker stop core-api-mysql` →
MySQL 8.4.10 avulso na 3306 → suíte → `docker rm -f` + `docker start core-api-mysql`. Pós-condições:
infra dev Up (healthy), volume `core-api-mysql-data` presente, nenhum container `bgp377-*` remanescente.

## Saída REAL dos gates

```
$ pnpm run typecheck   → tsc --noEmit (sem erros)
$ pnpm run lint        → eslint . (sem erros)
$ pnpm run format:check → All matched files use Prettier code style!
$ pnpm test            → tests 4035 · pass 4016 · fail 0 · skipped 19
```

## CA1–CA4 — fechamento

| CA | Prova |
| :-- | :-- |
| **CA1** — falha parcial reverte tudo | unit (fake) + integração MySQL (rollback real) |
| **CA2** — caminho feliz: budget + results somem juntos | unit + integração |
| **CA3** — save genérico não deleta results (não-regressão) | unit guard-rail + audit W2 (SQL do save inalterado) |
| **CA4** — atomicidade validada em MySQL real | **este relatório** — rollback provado, 33/33 |

## DoD

✅ Gate W3 verde · ✅ CA1–CA4 provados · ✅ delete atômico (rollback real em MySQL) · ✅ save genérico intacto ·
✅ sem migration · ✅ infra dev restaurada. **Pronto para commit.** Fecha #377.
