# W3 — GREEN · REPORTS-ANALYSIS-PAYABLES (REP-3 · #114)

> Skill: `ts-quality-checker`. Gate final + validação MySQL real (CA4).
> Worktree: `.claude/worktrees/reports-analysis-payables` · branch `feat/reports-analysis-payables`.

## Resultado

**GREEN em todos os gates + CA4 validado em MySQL 8.4.10 real.**

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ verde |
| `pnpm run format:check` | ✅ `All matched files use Prettier code style!` |
| `pnpm run lint` | ✅ verde |
| `pnpm test` | ✅ **4012 tests · 3993 pass · 0 fail · 19 skipped** |
| Integração `financial` (completa) | ✅ **81 tests · 81 pass · 0 fail** |
| Integração `contracts` (completa) | ✅ **95 tests · 90 pass · 0 fail · 5 skipped** |
| **CA4 — agregação temporal** | ✅ **1/1** em MySQL 8.4.10 |

---

## 🔴 Regressão encontrada e corrigida nesta wave

**O teste de integração do REP-3 (escrito no W0) contaminava a suíte `financial`** — destruía o seed
de migration do qual outros testes dependem. **Não é ruído pré-existente: é regressão deste ticket.**

### Sintoma

Ao rodar a suíte `financial` completa contra MySQL real, **12+ testes falhavam** em arquivos que o
REP-3 nem toca:

```
✖ CA7: save + listTransactions round-trip; knownFitids retorna o FITID salvo
✖ list() lê o seed da migration 0012 — ativas, group válido, ordenado por group
✖ #341/CA1+CA4: list() retorna cost_center_id (migration 0035) — e null nas pré-existentes
AssertionError: o seed da 0012 deve popular ≥11 categorias
AssertionError: id fixo (Aluguel) presente
```

### Causa-raiz

`tests/modules/financial/public-api/payables-analysis.drizzle-mysql.test.ts:46-50` fazia, no
`beforeEach`:

```ts
await handle.db.delete(handle.schema.finPayableView);
await handle.db.delete(handle.schema.finCategories);    // ← apaga o seed da migration 0012
await handle.db.delete(handle.schema.finCostCenters);   // ← apaga o seed da migration 0035
```

`fin_categories` e `fin_cost_centers` são populadas por **seed de migration**;
`category-read.drizzle-mysql.test.ts:47` afirma `>= 11` categorias vindas da 0012. Apagar a tabela
inteira zera o seed para todo o resto da suíte (que roda `--test-concurrency=1`, mesmo banco).

**Por que passou despercebido até aqui:** o arquivo é gated por `MYSQL_INTEGRATION=1`, então **não
roda no `pnpm test` puro** — W0, W1 e W2 fecharam verdes sem tocá-lo. Só apareceu ao executar a
suíte de integração completa, que é exatamente o trabalho do W3.

### Correção (regressão zero — causa consertada, não silenciada)

O teste passa a ser dono **apenas do que é seu**:

```ts
// `fin_payable_view` é read-model sem seed de migration e a asserção de contagem exige
// exclusividade → o teste é dono da tabela inteira.
await handle.db.delete(handle.schema.finPayableView);
// `fin_categories`/`fin_cost_centers` TÊM seed (migrations 0012/0035) do qual outros testes da
// suíte dependem — limpar só os ids deste teste, nunca a tabela.
await handle.db.delete(handle.schema.finCategories)
  .where(inArray(handle.schema.finCategories.id, [CAT_A, CAT_B]));
await handle.db.delete(handle.schema.finCostCenters)
  .where(inArray(handle.schema.finCostCenters.id, [CC_1]));
```

`delete(finPayableView)` **permanece inteiro** e é legítimo: essa tabela não tem seed de migration, e
a asserção `r.value.length === 3` exige exclusividade no período. Como o `FROM` do reader é
`fin_payable_view`, categorias do seed sem payables não geram linhas — o CA4 segue válido.

É o mesmo padrão de isolamento que o W0 do #437 aplicou no teste do `contracts` (limpar por
`inArray` dos próprios refs) e que o W2 daquele ticket elogiou.

### Prova da correção

Banco **recriado do zero** (seed intacto) e suíte `financial` completa:

```
ℹ tests 81 · suites 33 · pass 81 · fail 0 · duration_ms 17438.649958
```

81 = os 80 do #437 + 1 do REP-3. **Zero contaminação.**

---

## CA4 — validação em MySQL real

```
▶ openPayablesAnalysisReader — Drizzle + MySQL (REP-3 · #114)
  ✔ CA4: agrega por categoria×CC×mês; período [start,end); Cancelled fora; nomes via JOIN
ℹ tests 1 · pass 1 · fail 0
```

Cobre: 3 grupos corretos (A/CC1/jul=100000, A/CC1/ago=50000, B/null/jul=30000); exclusão de
antes-do-período, de `>= dueEnd` (half-open) e de `Cancelled`; nomes via LEFT JOIN; CC nulo
agrupando com `costCenterName: null`.

## Ambiente de validação — exceção OrbStack (x99 offline)

x99 offline; Gabriel autorizou OrbStack. Caminho **não-destrutivo** (ver
[[test-integration-destroys-dev-infra]]): `docker stop core-api-mysql` (**nunca** `down -v`) → MySQL
8.4.10 avulso na 3306 → suítes → `docker rm -f` + `docker start core-api-mysql`.

**Pós-condições verificadas:** `core-api-mysql`/`minio`/`mailpit` Up (healthy); volumes
`core-api-mysql-data` e `core-api-minio-data` presentes; nenhum container `rep3-*` remanescente.

---

## Contexto: rebase sobre o #437

A branch foi rebaseada sobre `origin/dev` já com o **#437** mergeado (`5a09ec5c`). Conflito
**aditivo** em `composition.ts`, resolvido unindo os lados — com a **cascata de cleanup corrigida**:
o reader do REP-3 é o 5º e fecha os **4** anteriores (incluindo o `contractorsReader` do #437) se
falhar ao abrir; `shutdown()` fecha os 5. Testes dos dois tickets convivendo: **21/21 pass**.

Também corrigidos 4 erros de `lint` herdados do W0 (template literal com `string | null`; 2×
`.sort()` sem comparador).

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

## CA1–CA4 — fechamento

| CA | Prova |
| :-- | :-- |
| **CA1** — `analysis/payables` → `AnalysisReport` aninhado | `analysis.http.test.ts` (borda, in-memory) |
| **CA2** — RBAC 403 + 400 sem `dueStart`/`dueEnd` | `analysis.http.test.ts` |
| **CA3** — `analysis/chart` → `[{id,name,total}]` | `analysis.http.test.ts` |
| **CA4** — agregação validada em MySQL real | **este relatório** — 1/1 + suíte `financial` 81/81 |

## Follow-ups registrados (não consertados — anti-padrão #15)

1. **S1 do W2** — `costCenters` vs `CostCenter` (maiúsculo) do legado (`openapi.yaml:3069`). O CA1 do
   000-request escreve `costCenters[]`, então o código cumpre o aceite; registrar a divergência para
   o front.
2. **S2 do W2** — sem invariante `dueStart <= dueEnd` (período invertido → `200 []` em vez de 400).
3. **S3 do W2** — `status: z.string()` livre; `z.enum(['Open','Approved','Paid'])` daria 400 e
   documentaria o contrato (`status=Cancelled` sempre devolve vazio por colidir com o `ne`).
4. **S4 do W2** — `.strict()` no querystring rejeita params legados (`page`, `limit`…). Cruza com #384.
5. **S5 do W2** — 3 pools sobre a mesma `financialUrl` na borda HTTP; `PoolRegistry` (#407) é
   worker-scoped. Pré-existente (#240/#243), agravado em 1. Dado o incidente RDS, vale follow-up.
6. **Novo (desta wave)** — testes de integração gated por `MYSQL_INTEGRATION` **não rodam no
   `pnpm test`** nem no CI padrão, então contaminação de seed como a corrigida aqui passa por W0/W1/W2
   sem sinal. Candidato a issue: rodar as suítes de integração no CI, ou um teste-guarda de seed.

## DoD

✅ Gate W3 verde · ✅ CA1–CA4 provados · ✅ regressão de contaminação corrigida na causa ·
✅ suítes `financial` (81/81) e `contracts` (90/90) verdes · ✅ infra dev restaurada sem perda.
**Pronto para commit + PR.**
