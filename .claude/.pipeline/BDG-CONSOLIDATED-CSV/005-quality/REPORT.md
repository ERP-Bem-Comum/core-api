# W3 — Gate de qualidade · BDG-CONSOLIDATED-CSV (#319, US5)

Skill: `ts-quality-checker`.

## Gates locais — TODOS VERDES ✅
| Gate | Resultado |
| --- | --- |
| `pnpm run typecheck` | ✅ zero erros |
| `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| `pnpm run lint` | ✅ zero erros |
| `pnpm test` | ✅ **3685 pass, 0 fail, 18 skipped** (integração gateada) — zero regressão |

## Integração MySQL 8.4 real — VALIDADA no x99 ✅
x99 (Docker 29.6, mysql **8.4** efêmero na porta 3307 — a 3306 estava ocupada por `fin-ca4-mysql`
leftover, preservado; túnel SSH `Mac:3306 → x99:3307`; `--mysql-native-password=ON` + ALTER root@'%').

`MYSQL_INTEGRATION=1 --test-concurrency=1` sobre a suíte `budget-plans` → **19/19 GREEN** em banco limpo:
- `cost-structure.drizzle-mysql` (#316), `budget-result.drizzle-mysql` (#317), `plan-lifecycle.drizzle-mysql` (#318).
- `consolidated.drizzle-mysql` (#319, NOVO) — `listApprovedByYear` (WHERE status/year/program_ref + ORDER BY id
  + hidratação de budgets em lote) + `selectCurrentApprovedByFamily` sobre linhas reais: **raiz v1.0 histórica +
  filho v2.0 vigente → o consolidado agrega a v2.0** (150k + 250k PARC). Filtro por programa estreita a 1 família.

US5 **não adiciona migration** (query sobre colunas existentes); as migrations 0000–0004 já aplicavam (US4).

## Achado do banco real (corrigido no W3)
A 1ª execução falhou: minha fixture de "ruído" tinha um RASCUNHO ETI v1.0 colidindo com a raiz ETI v1.0 na
**UNIQUE (year, program_ref, version_major, version_minor)** — que o in-memory não enforça, mas o MySQL sim.
Fixture corrigida (rascunho em família própria `PROGRAM_OTHER`). É o valor do teste de integração: o banco real
pegou o que o double não pegava.

## Notas
- ⚠️ Container `core-api-mysql-us5` ficou UP (gotcha teardown permission-denied do docker-snap do x99 — `stop`/`rm`
  exigem sudo; o Bash tool não aloca TTY). Remover: `ssh -t x99 'sudo docker rm -f core-api-mysql-us5'`. Túnel local encerrado.
- Follow-ups (W2, não bloqueiam): índice composto `(year, status[, program_ref])` p/ `listApprovedByYear`
  (validar com EXPLAIN — `mysql-database-expert`); viés de vigência correlato em `get-budget-plan-insights.ts` (US4, issue).

## DoD ✅
Gate W3 verde + integração real. Consolidado agrega a **vigente** por família; CSV bate com o layout do legado. Fecha #319.
