# Code Review — REPORTS-ANALYSIS-PAYABLES (REP-3 · #114) — Round 1

**Veredito:** APPROVED

**Reviewer:** `code-reviewer` (W2, read-only)
**Data:** 2026-07-14
**Escopo revisado:** `financial/public-api/payables-analysis-projection.ts` + `index.ts`;
`reports/application/ports/analysis-read.ts`; `reports/adapters/persistence/analysis-read.{financial,in-memory}.ts`;
`reports/adapters/http/{composition,plugin,dto,schemas}.ts`; `scripts/ci/test-integration.ts`;
testes `analysis.http.test.ts` + `payables-analysis.drizzle-mysql.test.ts`.
Referências abertas literalmente: ADR-0006 (`:80`, `:150-154`), ADR-0014 (`:126-133`),
`handbook/legacy_docs/openapi.yaml:3050-3070`, `schemas/mysql.ts:560-584`.

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza / follow-up)

#### S1 — `schemas.ts:99` / `dto.ts:61` — `costCenters` vs `CostCenter` do legado

O 000-request §Decisões diz "fiel ao `AnalysisReport.CostCenter`", mas o contrato legado
(`openapi.yaml:3069`) nomeia o campo **`CostCenter`** (maiúsculo) e a implementação emite
`costCenters`. Não é blocker: o **CA1 do próprio 000-request escreve `costCenters[]`**, então o
código cumpre o critério de aceite — e o legado já é inatingível nesse ponto (`id: {type: integer}`
vs UUID string; `additionalProperties: true`). Fica a **inconsistência de julgamento**: manteve-se
`itens` em PT por fidelidade ao legado, mas renomeou-se `CostCenter`. Sugestão: registrar a
divergência no 003-impl §"Divergências do legado" (onde já está a do `chart` com params), para o
front não descobrir no integrado.

#### S2 — `schemas.ts:78-84` — sem invariante `dueStart <= dueEnd`

Período invertido passa na validação e devolve `200 []` em vez de `400`. Um `.refine()` tornaria o
erro do cliente explícito. Não afeta correção da agregação.

#### S3 — `schemas.ts:82` — `status: z.string().min(1)` livre

A coluna tem CHECK `IN ('Open','Approved','Paid','Cancelled')` (`mysql.ts:583-584`). Um valor fora
do conjunto retorna `200 []` silencioso; `status=Cancelled` colide com o `ne(...,'Cancelled')` e
sempre devolve vazio. `z.enum(['Open','Approved','Paid'])` daria 400 e documentaria o contrato.
Sem risco de injeção (Drizzle parametriza).

#### S4 — `schemas.ts:84` — `.strict()` no querystring

Rejeita com 400 qualquer param extra do `ReportFilters` legado (`page`, `limit`, `programId`,
`accountId`…), que o 000-request declarou fora de escopo mas o front legado pode enviar.
Fail-loud é defensável e alinha ao padrão do módulo — apenas registre a expectativa.
Cruza com o follow-up já aberto de curadoria de `.strict` (#384).

#### S5 — `composition.ts:108,119,145` — 3 pools sobre a **mesma** `financialUrl`

`openMysqlFinancial` (`mysql-driver.ts:129-162`) cria um pool novo por chamada — não há dedup por
URL fora de `src/workers/runner/`. Suppliers + payment-position + analysis abrem 3 pools ao mesmo
DB no processo HTTP. **Não é regressão deste ticket** (o padrão é do #240/#243 e o requisito
boot-scoped está cumprido: 1 pool por boot, nunca por requisição), mas dado o incidente RDS
(56/60 conexões, 14 pools/processo) vale um follow-up para estender o pool registry do #407 à
composição HTTP. Fora do escopo aqui — não consertar neste ticket (anti-padrão #15).

---

## Verificação dos 5 focos

**1. ADR-0006 / ADR-0014 — OK.**
ADR-0006 `:80` exige "Ports/adapters explícitos: cada BC expõe interface de leitura/comando para
outros" e `:150` "Sem cross-import entre BCs (exceto via contratos)". `reports` importa
exclusivamente `#src/modules/{financial,partners,contracts}/public-api/index.ts`
(`composition.ts:16-22`, `analysis-read.financial.ts`) — zero import de `domain/`/`application/`
alheios. O `payables-analysis-projection.ts` importar `../adapters/persistence/` é **dentro do
próprio módulo** (a public-api é a fachada que implementa a ACL) — não é o que o `:150` proíbe.
ADR-0014 `:130` proíbe "Joins cross-database em queries de aplicação"; o LEFT JOIN é
`fin_payable_view × fin_categories × fin_cost_centers` — três `fin_*`, mesmo database, **intra-BC**.
Permitido. Nenhum `ctr_*` aparece no SQL. Julgado pelo texto dos ADRs, não pelo precedente.

**2. Pool boot-scoped + cascata — OK, e a união pós-rebase está correta.**
Nenhum pool por requisição: o reader é aberto uma vez em `buildReportsHttpDeps` e o adapter recebe
`listAggregation` (a função `list`), nunca uma connection-string. Cascata conferida linha a linha:
team(100)→suppliers(108, fecha 1)→position(119, fecha 2)→contractors(132, fecha 3)→
**analysis(145, fecha os 4**: team, suppliers, position, contractors — `:147-150`). `shutdown()`
(`:173-179`) fecha os **5**. Cada reader tem pool próprio, então os `close()` independentes não se
atropelam (sem double-close de pool compartilhado). O ponto sensível do rebase está resolvido.

**3. Aninhamento no DTO — OK, `null` real preservado.**
`analysisToReport` (`dto.ts:32`) agrupa em `Map<string | null, …>` chaveando pela referência `null`
**real** — `Map` usa SameValueZero, então `null` nunca é coagido para `"null"`; `id: categoryRef`
(`:67`) e `id` do CC (`:61-65`) atravessam intactos, e os schemas `.nullable()` (`schemas.ts:90,94`)
aceitam. O teste crava `assert.equal(b.costCenters[0]!.id, null)` (`analysis.http.test.ts:139`) —
comparação estrita, pegaria a string. O `?? 'null'` mencionado no 003-impl é chave de `Map` local do
teste de integração, não toca resposta nem banco. **Totais:** `totalValueOfPeriod` = soma de todas as
rows (`:33`); total por categoria = soma do bucket (`:43`); mensal acumula por `monthYear` (`:46-48`);
por CC acumula por `costCenterRef` (`:54-60`). Como o grão do SQL é categoria×CC×mês **sem
duplicação**, as três reduções somam o mesmo universo — consistentes por construção.
`name = catRows[0]?.categoryName ?? null` é seguro: `categoryName` está no GROUP BY, logo é
constante dentro do bucket.

**4. SQL do reader — OK.**
`date_format(due_date,'%Y-%m')` no SELECT e no GROUP BY (`:59,86`) — ADR-0020 permite agregação e
funções de data; nada da lista proibida. Half-open correto: `gte(dueStart)` + `lt(dueEnd)`
(`:75-76`), idêntico ao contrato do `dashboard.monthWindow`. `ne(status,'Cancelled')` (`:77`) sempre
aplicado. `status` opcional entra como `undefined` no `and(...)` — Drizzle descarta, sem cláusula
órfã. `SUM` tratado como string do mysql2 e convertido com `Number()` no mapper (`:96`), com o porquê
comentado (`:67`). **Índice:** o predicado de período é sargável e existe
`fin_payable_view_due_date_idx` (`mysql.ts:577`) — range scan, sem full-scan. O GROUP BY sobre função
força temp table/filesort, mas sobre o conjunto **já recortado pelo período** — custo aceitável para
relatório. O EXPLAIN real fica com o CA4 no W3.

**5. Qualidade — OK.**
Código EN, docs/comentários PT-BR; `itens` em PT é fidelidade deliberada ao wire legado, não deslize
de idioma. `import type` em todos os imports de tipo; extensão `.ts` em 100% dos relativos; subpath
`#src/*` no cross-módulo. Erros em EN kebab (`analysis-read-unavailable`,
`payables-analysis-read-failure`). Result na borda do adapter: o `try/catch` fica confinado ao reader
(`:99-102`), converte para `err(...)` e **não vaza `Error`** — o `cause` só vai para `stderr`, sem
expor detalhe de infra na resposta (503 via `sendResult`). RBAC `authorize(FINANCIAL_PERMISSION.read)`
nas 2 rotas (`plugin.ts:121,139`), precedente REP-2/REP-4. Query Zod validada → 400 quando
`dueStart`/`dueEnd` ausentes ou malformados (`z.iso.date()`), coberto por teste. `toAnalysisFilter`
respeita `exactOptionalPropertyTypes` com spread condicional (`plugin.ts:46`). YAGNI respeitado.

---

## O que está bom

- **A união pós-rebase com o #437 foi feita certa** — o caso fácil era aceitar um dos lados cru e
  vazar 4 pools no boot; a cascata de 5 está completa e o `shutdown()` também.
- **Aninhamento no DTO, não no SQL** — mantém o reader com uma responsabilidade (agregar) e deixa a
  forma do wire onde ela pertence, na borda. `Map` chaveado por `null` real é a escolha certa.
- **Fail-closed e half-open coerentes com os slices anteriores** — `Cancelled` fora, `[start,end)`
  igual ao `dashboard`, 503 em erro de leitura. Consistência entre REP-2/3/4 é o que faz o épico
  #114 parecer um produto e não quatro tickets.
- **Comentários explicam só o "porquê" não-óbvio** (SUM→string do mysql2; JOIN intra-BC; pool
  boot-scoped citando o incidente RDS).
- **003-impl honesto** sobre a reconstituição pós-queda de energia e sobre a pendência do CA4.

---

## Próximo passo

**APPROVED** → W3 (`ts-quality-checker`). Gates já verdes (4012 tests · 3993 pass · 0 fail;
typecheck/lint/format:check). **Pendência do W3: CA4** — `payables-analysis.drizzle-mysql.test.ts`
ainda não rodou contra MySQL real. Validar no x99; se indisponível, o caminho não-destrutivo do
003-impl — **nunca** `pnpm run test:integration:*` com a infra dev de pé.

As sugestões S1–S5 não bloqueiam: S1 é 1 linha de doc, S5 é follow-up de infra (`issue-report`).
