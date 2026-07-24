# REPORTS-REALIZED-ENDPOINT — W2 (REVIEW, read-only) · Round 1

> S6 (fatia final) do épico #502 · `code-reviewer` · 2026-07-21. Auditoria read-only da W1.
> `src/` **não** tocado nesta wave. Branch `feat/reports-realized-endpoint` (working tree).

## Veredito: **APPROVED com ressalvas** (0 Blocker · 0 Major · 2 Minor · 1 observação de risco)

O coração — a costura `stitchRealizedReport` — está correto nos invariantes que mais importavam
(CA6 categoria-do-plano, CA5 não-duplicação/conservação, CA7b órfão-sintético, âncora 5500). A rota,
o gate duplo, o `.strict()`, o ACL via public-api (ADR-0006) e o OR no `ON` (Frente A) conferem.
Nenhum achado é bloqueante. As ressalvas são de robustez/escopo, não de correção do caminho provado.

---

## 1. A costura (`realized-read.stitch.ts`) — o coração

### CA6 — categoria/trilha vêm do PLANO, `categoryRef` do financial IGNORADO ✅
- A árvore nasce **só** do laço sobre `planned` (linhas 202-209): `getCenter`/`getCategory`/`getSub`
  usam exclusivamente `costCenterId/Name`, `categoryId/Name`, `subcategoryId/Name` do plano.
- O laço do `financial` (linhas 222-229) lê **apenas** `budgetPlanRef`, `subcategoryRef`, `month`,
  `realizedCents`, `provisionedCents`. **`row.categoryRef` nunca é lido em lugar nenhum** do arquivo
  (confirmado por leitura integral) — não posiciona nó, não cria centro/categoria.
- Casamento por `leafKey(budgetPlanRef, subcategoryRef)` (linha 224), **sem** categoria. Título manual
  com `categoryRef=null` cai na folha certa pela trilha do plano; a prova negativa do teste
  (`report.costCenters.length === 1`, `cat.subCategories.length === 2`) sustenta que **não há nó
  fantasma**. Este era o invariante mais crítico — **passa**.

### CA5 — não-duplicação e conservação ✅
- Realizado/provisionado entram **só na folha**, via `addTo(sub.months, …)` (linha 225). Nunca são
  adicionados a acumulador de categoria/centro.
- `finalizeCategory`/`finalizeCenter`/`finalizeReport` são **soma pura dos filhos** (linhas 116-162):
  a categoria soma as subcategorias, o centro soma as categorias, a raiz soma os centros — nas 3
  medidas e mês a mês. Não há caminho de dupla contagem: `leafIndex` mapeia cada
  `(budgetPlanRef, subcategoryRef)` para **uma** `SubAcc`, e uma folha vive sob exatamente um
  `(centro, categoria)` (a que o plano criou). O teste "não duplica" (`cat.totalRealized === 380`,
  não 760) e a conservação `total geral == Σ entradas` fecham o argumento.
- `months[12]` só em categoria e subcategoria; centro e raiz sem `months` — espelha o legado e o port.

### CA7b — órfão vira sintético, nos totais, incl. `subcategoryRef=null` ✅
- `ghostLeaf` (linhas 213-218): um centro/categoria "Sem orcamento previsto" **por `budgetPlanRef`**,
  `expected=0`, `budgetPlanId = row.budgetPlanRef`; subcategoria órfã chaveada por
  `row.subcategoryRef ?? '${scope}|sub'` — **`null` incluso** (cai numa folha sintética estável).
- Órfão nunca descartado: `leafIndex.get(...) ?? ghostLeaf(row)` (linha 224). Ambos os testes CA7b
  (com `SUB_ORPHAN` e com `subcategoryRef=null`) passam; a conservação com órfão (`380+999`, `700+42`)
  confirma que entra nos totais.
- Ordem: reais primeiro (laço `planned`), sintéticos por último (laço `financial`) — `Map` preserva
  inserção. Determinístico.

### Âncora nota 10 (5500) e grade de 12 ✅
- Doc 5000 (`categoryRef=CAT1`) + manual 500 (`categoryRef=null`) na mesma `(P1,SUB1,mês 8)` → folha
  5500 (somam na mesma `SubAcc`). Teste verde, roda no `pnpm test` puro.
- `zeroMonths()` materializa 12 buckets; `addTo` ignora índice fora de 1..12 (defensivo). Grade de 12
  sempre presente, zerados inclusos (CA7).

---

## 2. A rota (`plugin.ts` + `schemas.ts` + `dto.ts`)

- **`year` obrigatório** ✅ — `realizedQuerySchema` = `z.object({ year: z.coerce.number().int(), … }).strict()`.
  Sem `year` → 400; parâmetro desconhecido → 400 (`.strict()`). Testes CA8 verdes.
- **Gate CA11 — AND** ✅ — `preHandler: [requireAuth, authorize(BUDGET_PLAN_PERMISSION.read),
  authorize(FINANCIAL_PERMISSION.read)]`. Dois `authorize` encadeados = conjunção; os 4 testes
  (nenhuma / só budget / só financial / ambas) provam 403/403/403/200. Ambas as constantes existem no
  catálogo (`budget-plan:read`, `fiscal-document:read`). `payable:read` corretamente evitado.
- **Resposta `.strict()`** ✅ — `realizedReportResponseSchema` e todos os nós aninhados são `.strict()`:
  se o mapper vazar campo extra, falha alto. `503` mapeado para `realized-read-unavailable`.
- `toRealizedFilter` monta o filtro com spreads condicionais (respeita `exactOptionalPropertyTypes`).

## 3. ADR-0006 — fronteira de módulo ✅
- `realized-read.from-sources.ts` importa **só** `budget-plans/public-api/read.ts` e
  `financial/public-api/index.ts` (+ o port/stitch do próprio `reports`). Zero import de
  `domain/`/`application/` de outro módulo.
- `composition.ts` idem: `buildBudgetPlansReadPort` (public-api/read) + `openRealizedProvisionedReader`
  (financial/public-api). `stitch.ts` importa apenas **tipos** das public-api. Conforme.

## 4. Frente A — OR no `ON`, não no `WHERE` ✅
- `planned-amounts-read.drizzle.ts`: `networkConditions` (state e/ou municipality) → `or(...)` →
  empurrado para `budgetJoinConditions`, aplicado em **`.leftJoin(schema.budgets, and(...))`** (linha
  119). O `.where(...)` (linha 128) usa só `planConditions` — **intacto**. OR fica no ON.
- Um filtro só: `or(cond)` = a própria condição (funcionalmente idêntico ao anterior). Zero filtro:
  só o join base. A grade de 12 sobrevive (o recorte de Rede afeta o `SUM`, nunca quais nós aparecem —
  os inner joins da estrutura do plano garantem os nós; budgets é LEFT JOIN). Sem fan-out: `GROUP BY`
  colapsa e `SUM` agrega os dois budgets (state+municipality) → soma das duas Redes. Correto.

## 5. As 3 notas do W1
1. **Fronteira do ACL (composition abre os pools):** o request dizia "from-sources abre os 2 readers
   no boot"; a W1 fez a **composition** abrir os pools e passou os dois `list` já abertos ao
   `RealizedReadFromSources`. **Não é achado — é o padrão correto** (molde `AnalysisReadFromFinancial`,
   pool singleton no boot, incidente RDS 0001). Cleanup no erro (fecha os readers já abertos antes de
   `throw`) e no `shutdown` (fecha `budgetPlansRead` + `realizedReader`) está completo. Aprovado.
2. **`eslint-disable prefer-readonly-parameter-types` (5 pontos):** acumuladores mutáveis com `Map`
   interno, só-leitura nas `finalize*`. Idioma do repo (precedente `outbox-worker.ts`), disables
   pontuais e comentados. `pnpm lint` verde. Aceitável — **não é achado**.
3. **Filtro do financial só por `budgetPlanId`+`year`:** ver observação de risco abaixo.

## 6. CA10 — regressão zero ✅
`/reports/team` (200 sob `collaborator:read`) e `/reports/analysis/chart` (200 sob `fiscal-document:read`)
verdes. Suíte cheia **4308 tests / 4289 pass / 0 fail / 19 skip** — sem regressão.

---

## Achados

### Minor 1 — `year`/`month` sem faixa nos schemas
`realizedQuerySchema.year` é `z.coerce.number().int()` sem `.min()/.max()`; `realizedMonthSchema.month`
é `z.number()` sem `.int().min(1).max(12)`. Serialização/entrada tolera valores absurdos (year negativo,
mês fracionário). Sem impacto no caminho provado — a costura já materializa 1..12. **Sugestão** (não
bloqueia): apertar a faixa do `year` na query. Não corrigir nesta wave (fora do mínimo GREEN).

### Minor 2 — divergência doc vs. impl na fronteira do ACL (já racionalizada)
O texto do `000-request.md §Escopo(in).3` ("abre os 2 readers no boot" dentro do `from-sources`)
diverge da implementação (composition abre). A W1 declarou a divergência conscientemente e ela é a
escolha **correta**. **Recomendação:** alinhar o texto do request/handbook numa próxima passada de doc
para não induzir a leitura errada no futuro. Documental, não de código.

### Observação de risco (validar em #500 — NÃO é Blocker) — realizado não é recortado por Rede
`RealizedReadFromSources` filtra o financial **só** por `budgetPlanId`+`year` (o reader da S5 não expõe
eixo de Rede). Consequência: num relatório filtrado por `partnerStateId`/`partnerMunicipalityId`, o
**previsto** sai recortado pela Rede (OR no orçado), mas o **realizado/provisionado** sai **do plano
inteiro** (todas as Redes). Isso é **decisão acknowledged** do request ("recorte de Rede vive no
orçado; órfãos viram CA7b") e **nenhum CA exige** realizado Rede-filtrado — logo, **conforme aos
critérios de aceite**. Fica o risco semântico: numa view Rede-filtrada, realizado pode superar o
previsto da Rede. Corrigir exigiria tocar o reader da S5 (**fora de escopo** — regressão zero das
S1-S5). **Recomendação:** validar contra dados reais quando #500 fechar; se a P.O. considerar o
realizado plan-wide incorreto sob filtro de Rede, abrir issue-report para uma S7 (eixo de Rede no
financial). Não bloqueia esta entrega.

---

## Gates (executados nesta wave, read-only)

```
pnpm run typecheck   → tsc --noEmit   OK (zero erros)
pnpm run lint        → eslint .        OK (zero erros)
pnpm test            → 4308 tests / 4289 pass / 0 fail / 19 skip
  novos (isolado)    → 27 tests / 27 pass / 0 fail  (14 stitch + 13 http)
```

Gated (#500, não-executado, **esperado** — não é achado): a rota-contra-DB e o teste do OR
(`planned-amounts-or-filter.drizzle-mysql.test.ts`, opt-in `MYSQL_INTEGRATION=1`). A auditoria da query
do OR e do wiring do ACL foi feita por leitura (o banco não pegaria erro). OR no ON conferido;
anti-fan-out via `GROUP BY`/`SUM` conferido; ACL só via public-api conferido.

## Próximo passo
W3 (QUALITY) — `ts-quality-checker`. Gates já verdes nesta wave; W3 re-roda o gate canônico
(`typecheck` + `format:check` + `lint` + `test`) e fecha o ticket. As 2 Minor + a observação de risco
ficam como recomendações (não bloqueiam W3); sugerido issue-report para a observação de Rede após #500.
