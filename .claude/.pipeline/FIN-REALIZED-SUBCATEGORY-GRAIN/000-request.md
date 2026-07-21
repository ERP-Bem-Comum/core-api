# FIN-REALIZED-SUBCATEGORY-GRAIN — escopo (S5 do épico Taxonomia Planejável Unificada, #502)

> Size **M**. O leitor do realizado/provisionado (`realized-provisioned-projection.ts`, público) passa a
> agregar **por subcategoria** (hoje para na categoria) **e a incluir os títulos manuais** no realizado
> (hoje invisíveis — o leitor só passa por payables). É a fatia que faz o dado carimbado nas S1/S2
> **aparecer** no relatório. **1 módulo: financial.**

## Estado medido (2026-07-21, verificado)

`src/modules/financial/public-api/realized-provisioned-projection.ts` (na `dev` após #503):
- **Realizado:** `finReconciliationItems → finReconciliations(Active) → finPayables → finDocuments`,
  `groupBy(finDocuments.budgetPlanRef, finDocuments.categoryRef, mês)` (`:146`). Grão = **categoria**.
- **Provisionado:** `finPayables → finDocuments`, mesmo grão de categoria (`:185`).
- **Título manual NÃO é lido:** o realizado passa só por `finReconciliationItems → finPayables`. Um
  título manual (`fin_manual_entries`) é uma conciliação **avulsa, sem payable** — fica **fora da soma**.
  Logo o carimbo da S2 hoje não aparece no relatório.
- `fin_documents` e `fin_manual_entries` já têm `subcategory_ref` (S1/S2, na `dev`).

## Escopo (in) — só financial

### Parte A — grão subcategoria (documentos)
`realized-provisioned-projection.ts`: adicionar `finDocuments.subcategoryRef` ao SELECT + `groupBy` das
**duas** queries (realizado e provisionado); `RealizedProvisionedRow` ganha `subcategoryRef: string | null`;
a chave de costura passa a `(budgetPlanRef, categoryRef, subcategoryRef, mês)`.

### Parte B — incluir o realizado dos títulos manuais
Terceira agregação, somada ao **realizado** (nunca ao provisionado — título manual já está conciliado):
`fin_manual_entries → fin_reconciliations (status='Active')`,
`groupBy(budget_plan_ref, subcategory_ref, mês = date_format(reconciled_at,'%Y-%m'))`,
`SUM(value_cents)`. Costurada em memória por `(budgetPlanRef, categoryRef?, subcategoryRef, mês)` — o
manual entry **não tem `category_ref`**, então entra com `categoryRef = null` (o consumidor agrupa por
subcategoria).

**Regra de inclusão (P.O., 2026-07-21):** um título manual soma no realizado **se, e só se,**
`budget_plan_ref IS NOT NULL` **E** `type NOT IN ('Transfer','Investment','Redemption')`.
- **Transferência/Aplicação/Resgate:** tesouraria (dinheiro entre contas da própria empresa) — **nunca**
  são títulos; excluídos por tipo, mesmo que classificados por engano.
- **Juros/Multa** (`FeePenaltyInterest` com plano): fazem parte do título gerador (ex.: nota paga com
  atraso — os R$5 de juros conciliados como título manual, classificados no plano da nota) — **entram**.
- **Tarifa bancária** (`FeePenaltyInterest` sem plano): taxa administrativa, sem vínculo orçamentário —
  **fica fora** por não ter `budget_plan_ref` (aparece em OUTROS relatórios — issue à parte).

## Fora de escopo

- Popular `fin_payable_view.subcategory_ref` (a coluna existe desde a S1, nasce nula) — outros leitores
  (payables-analysis) a consomem; **se necessário aqui**, decidir no W0, senão vira follow-up. O leitor
  do realizado lê `fin_documents` direto, não a view — então **não depende** disso.
- A rota (S6), a guarda (S4), o contrato (S3).
- Tarifa bancária em outros relatórios — **issue à parte** (registrada).
- Mudar `realized-by-plan-projection.ts` (#416, grão plano — outro leitor, intacto).

## Critérios de aceite

- **CA1** `RealizedProvisionedRow` ganha `subcategoryRef`; realizado e provisionado dos documentos
  agrupam por `(budgetPlanRef, categoryRef, subcategoryRef, mês)`.
- **CA2** Título manual com `budget_plan_ref` + `type` orçamentário (Payment/Receipt/FeePenaltyInterest)
  soma no **realizado**, no grão `(budgetPlanRef, subcategoryRef, mês=reconciled_at)`.
- **CA3** Título manual **Transfer/Investment/Redemption** **NÃO** soma — mesmo com `budget_plan_ref`.
- **CA4** Título manual **sem** `budget_plan_ref` (ex.: tarifa) **NÃO** soma.
- **CA5** Título manual **nunca** entra no provisionado (já está conciliado).
- **CA6** `Undone` não conta (a conciliação do manual entry precisa ser `Active`).
- **CA7** Documento sem subcategoria (`subcategory_ref` nulo) continua aparecendo — grão desce, não some
  (regressão zero do comportamento por categoria; o consumidor da S6 monta a árvore).
- **CA8** ADR-0006/0014: leitor público, plain rows, só `fin_*`, refs opacos. **CA9** regressão zero:
  os consumidores atuais de `RealizedProvisionedRow` (nenhum em produção ainda — só testes) e o
  `realized-by-plan-projection.ts` intactos.

## Verificação contra o exemplo da P.O.
Nota 10 líquida R$50 paga atrasada (saída R$55): R$50 conciliados com o título (documento) + R$5 título
manual de juros classificado no mesmo plano/subcategoria → o realizado daquela subcategoria/mês = **R$55**
(50 do documento + 5 do manual). É o teste-âncora do W0.

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — grão subcategoria + soma do manual (regra tipo × plano) + o exemplo da nota 10 |
| W1 | `ports-and-adapters` (par `drizzle-orm-expert`) | 3ª query + costura + `subcategoryRef` na row |
| W2 | `code-reviewer` | audit read-only (regra de inclusão, não-duplicação, eixos de data) |
| W3 | `ts-quality-checker` | gate (integração registrada como não-executada — #500) |
