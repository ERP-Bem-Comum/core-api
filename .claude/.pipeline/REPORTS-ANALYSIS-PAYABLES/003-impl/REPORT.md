# W1 — GREEN · REPORTS-ANALYSIS-PAYABLES (REP-3 · #114)

> Skill: `ports-and-adapters`. Wave W1 (implementação mínima até GREEN).
> Worktree: `.claude/worktrees/reports-analysis-payables` · branch `feat/reports-analysis-payables`.

## Nota de reconstituição

O W1 foi **executado em 2026-07-14 ~18:50** e ficou **sem REPORT** porque a sessão caiu (queda de
energia) antes de fechar a wave — o `STATE.json` permaneceu `in-progress` embora a implementação
estivesse completa. Este relatório foi **reconstituído a partir do código** na sessão seguinte, que
também: (a) consertou 4 erros de `lint` remanescentes, (b) rebaseou a branch sobre a `dev` já com o
**#437** mergeado, resolvendo o conflito em `composition.ts`.

## Resultado

**GREEN.** `pnpm test` → **4012 tests · 3993 pass · 0 fail · 19 skipped**. `typecheck`,
`format:check` e `lint` verdes.

---

## Arquivos criados

| Arquivo | Camada |
| :-- | :-- |
| `src/modules/financial/public-api/payables-analysis-projection.ts` | reader boot-scoped (public-api) |
| `src/modules/reports/application/ports/analysis-read.ts` | port (reports) |
| `src/modules/reports/adapters/persistence/analysis-read.financial.ts` | adapter ACL |
| `src/modules/reports/adapters/persistence/analysis-read.in-memory.ts` | adapter fake |

## Arquivos alterados

| Arquivo | Mudança |
| :-- | :-- |
| `src/modules/financial/public-api/index.ts` | exporta `openPayablesAnalysisReader` + tipos |
| `src/modules/reports/adapters/http/composition.ts` | 5º reader (analysis) aberto no boot / fechado no shutdown |
| `src/modules/reports/adapters/http/plugin.ts` | 2 rotas novas (`/analysis/payables`, `/analysis/chart`) |
| `src/modules/reports/adapters/http/dto.ts` | `analysisToReport` (aninha rows planas) + `analysisToChart` |
| `src/modules/reports/adapters/http/schemas.ts` | query Zod (`dueStart`/`dueEnd`/`status?`) + response `.strict()` |
| `scripts/ci/test-integration.ts` | registra o teste de integração na suíte `financial` |

---

## Decisões de implementação

1. **Agregação temporal** — `date_format(due_date,'%Y-%m')` no `GROUP BY` (ADR-0020 §"Features
   permitidas" autoriza funções de data). Grão = Categoria × Centro de Custo × mês. `SUM` volta como
   string do mysql2 (DECIMAL) → `Number()` no mapper.
2. **Período half-open `[dueStart, dueEnd)`** — `gte` + `lt`, mesmo contrato do `dashboard.monthWindow`.
   `Cancelled` excluído da soma (`ne`), consistente com o REP-4.
3. **Aninhamento no DTO, não no SQL** — o reader devolve **rows planas**; `analysisToReport`
   (`dto.ts:32`) monta `AnalysisReport` (categoria → `itens[]` mensais + `costCenters[]`). Agrupamento
   por `Map<string | null, …>` — chaveia pelo **`null` real**, então refs nulos agrupam num bucket
   "sem categoria/CC" e o `id: null` atravessa intacto até a resposta (não vira a string `"null"`).
4. **Pool boot-scoped** — `openPayablesAnalysisReader` abre 1 pool (`applyMigrations: false`),
   fechado no `close()`. Nunca por requisição (F1 do W2 #238 / incidente RDS 0001).
5. **Nomes via LEFT JOIN** `fin_categories`/`fin_cost_centers` — ambos `fin_*`, JOIN **intra-BC**
   (permitido; o proibido é cross-BC `ctr_*` × `fin_*`).

## Convivência com o #437 (resolvida no rebase)

O #437 e o REP-3 tocam o mesmo `composition.ts`. Conflito **aditivo**, resolvido unindo os lados:

- Docstring cobre os 4 relatórios; REP-2 já descrito na semântica nova (candidatos − contratantes ativos).
- **Cascata de cleanup corrigida na união:** o reader do REP-3 virou o **5º** e agora fecha os **4**
  anteriores (incluindo o `contractorsReader` do #437) se falhar ao abrir. Aceitar qualquer um dos
  lados cru vazaria pool no boot.
- `shutdown()` fecha os 5 readers.

Prova de convivência: os testes dos dois tickets rodam juntos — **21/21 pass**.

## Correções de lint (feitas nesta sessão, sobre testes do W0)

| Arquivo | Erro | Correção |
| :-- | :-- | :-- |
| `payables-analysis.drizzle-mysql.test.ts:152` | `restrict-template-expressions` (`string \| null` em template) | `?? 'null'` — **comportamento idêntico** (`` `${null}` `` já produzia `"null"`; a asserção da linha 163 já dependia disso). Chave de `Map` local do teste, não vai ao banco nem à resposta. |
| `analysis.http.test.ts:125-126` | `require-array-sort-compare` (2×) | comparador explícito `byMonth` por `monthYear`. |

---

## Saída REAL dos gates

```
$ pnpm run typecheck
$ tsc --noEmit
(sem saída = verde)

$ pnpm run lint
$ eslint .
(sem saída = verde)

$ pnpm run format:check
Checking formatting...
All matched files use Prettier code style!

$ pnpm test
ℹ tests 4012 · suites 1143 · pass 3993 · fail 0 · cancelled 0 · skipped 19 · todo 0
```

Testes do ticket (borda HTTP, `fastify.inject` + in-memory): **3/3 pass** (CA1 aninhamento, CA2
RBAC 403 + 400 sem período, CA3 chart).

---

## O que o W2 deve auditar com atenção

1. **ADR-0006/0014** — `reports` só importa `public-api`; nenhum JOIN cross-BC. O LEFT JOIN do reader
   é `fin_*` × `fin_*` (intra-BC, permitido).
2. **Pool boot-scoped + cascata de 5 readers** — a união pós-rebase é o ponto mais sensível.
3. **Aninhamento no DTO** — `Map<string | null>` preserva `null` real (não string `"null"`).
4. **Período half-open e `Cancelled`** — coerência com `dashboard.monthWindow` e com o REP-4.
5. **Divergência documentada do legado**: `analysis/chart` aceita filtros de período (o legado não
   tinha params) — decisão do 000-request §Decisões.
6. **Escopo omitido e por quê**: `budgetPlanId` (payable não tem `budgetPlanRef`),
   `accountId`/`entityId`/`subCategoryId`/`programId`, eixo "planejado", paginação — todos no
   000-request §"Fora de escopo".

## Pendência para o W3

**CA4 — validação em MySQL real.** O arquivo `payables-analysis.drizzle-mysql.test.ts` (gate
`MYSQL_INTEGRATION=1`) ainda não rodou contra MySQL. O x99 está offline; validar via OrbStack pelo
caminho **não-destrutivo** (`docker stop` + MySQL avulso na 3306 + restaurar) — ver
[[test-integration-destroys-dev-infra]]. **Nunca** `pnpm run test:integration:*` com a infra dev de pé.
