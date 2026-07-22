# W3 — Gate de qualidade · BDG-PLAN-LIFECYCLE (#318, US4)

Skill: `ts-quality-checker`.

## Gates locais — TODOS VERDES ✅
| Gate | Resultado |
| --- | --- |
| `pnpm run typecheck` | ✅ zero erros |
| `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| `pnpm run lint` | ✅ zero erros |
| `pnpm test` | ✅ **3638 pass, 0 fail, 18 skipped** (integração gateada) — zero regressão no projeto |

## Integração MySQL 8.4 real — VALIDADA no x99 ✅ (destrava #378)
x99 voltou online (2026-07-09). MySQL **8.4.10** efêmero (`docker run` + `--mysql-native-password=ON` +
ALTER root→native, túnel SSH `-L 3306`). Suíte `budget-plans` (serial, como o runner `concurrency1: true`):

`pnpm run test:integration:budget-plans` → **16/16 GREEN** em banco limpo:
- `cost-structure.drizzle-mysql` (#316) — aplica migrations 0000→0004.
- `budget-result.drizzle-mysql` (#317) — migration **0002** + repo.
- `plan-lifecycle.drizzle-mysql` (#318, NOVO) — migrations **0003** (árvore) + **0004** (FK auto-ref `parent_id`)
  + `listChildren` + `findRootByYearAndProgram` (parentId IS NULL) + **o Blocker do W2**: 2 cenários do mesmo pai
  NÃO colidem na UNIQUE (validado no MySQL real).

As migrations `0002`/`0003`/`0004` aplicam sem erro no MySQL 8.4 real. **#378 satisfeita para budget-plans.**

## Notas
- Achado de infra confirmado: os testes drizzle-mysql do módulo precisam de `--test-concurrency=1` (race de
  migração concorrente) — o runner já força isso (`mysqlSuite.concurrency1: true`); só o comando manual precisa da flag.
- ⚠️ Container `core-api-mysql-x99` ficou UP (teardown bateu no gotcha permission-denied — remover exige
  `ssh -t x99 'sudo snap restart docker'`, que reinicia o mailpit junto). Túnel SSH local aberto.
- Follow-up não-bloqueante (W2): lock TOCTOU no header do pai ao derivar (a UNIQUE já protege a integridade).
