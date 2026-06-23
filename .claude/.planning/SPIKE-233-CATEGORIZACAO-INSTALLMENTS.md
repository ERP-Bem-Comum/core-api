# Spike #233 — Alinhamento de categorização (020 × cost-centers legado) + mapping `installments → payables`

> **Tipo:** Spike/research time-boxed (~2 dias). **Sem código de produção.**
> **Entregável:** este relatório + [ADR-0048](../../handbook/architecture/adr/0048-legacy-categorization-installments-mapping.md) (mapa de equivalência destilado).
> **Gate de:** Camada 2 do épico [#169](https://github.com/ERP-Bem-Comum/core-api/issues/169) — Dashboard (#112), Reports (#114), Budget Plans (#113).
> **Data:** 2026-06-23 · **Autor:** spike conduzido por agente, recomendações para ratificação do tech lead.

---

## 1. Sumário executivo (as 3 decisões)

| # | Pergunta da issue | Recomendação | Fundamento principal |
| - | ----------------- | ------------ | -------------------- |
| **D1** | Categorização: reusar a **020** OU portar a hierarquia legada `CostCenter→Category→SubCategory`? | **Reusar a 020.** Não portar. Traduzir o legado via **Anticorruption Layer** (mapa de equivalência). | ADR-0001 (imutável): o modelo novo é soberano e o handbook não muda. Evans cap.14 (ACL/Conformist). |
| **D2** | Mapping `installments → payables`: equivalência de **granularidade** e **status**. | Legado `Payable`→core `Document`; legado `Installment`→core `Payable`; `PAGO`→`'Paid'`. **Sem parcelamento temporal no core** (lacuna registrada, não bloqueia Camada 2). | Modelo core sem `installments`; baixa manual por título já entrega `Approved→Paid` (#223). |
| **D3** | Endpoint Dashboard: **agregado** (1 chamada) vs **fatiado** (1 por widget)? | **Fatiado** (BFF, 1 endpoint por widget). | ADR-0005 (thin BFF), entrega incremental no front (1 widget/PR), recomendação do próprio #112. |

**RBAC** (decidido pela P.O. no comentário da #233, 2026-06-23): Dashboard (#112) e Reports (#114) **sem `authorize(permission)`** — só autenticação (espelha o legado). Budget Plans (#113, Camada 3) decide RBAC depois.

---

## 2. Por que isto é o gate da Camada 2

Os 3 módulos legados (Dashboard, Reports, Budget Plans) computam **todos** os seus números a partir de duas estruturas legadas:

1. A hierarquia **`CostCenter → Category → SubCategory`** (com `releaseType` na folha) — eixo de agrupamento de todos os relatórios e do dashboard.
2. As **`installments`** (parcelas) — a unidade onde o legado mede "pago" / "realizado" (`SUM(value) WHERE status = PAGO`).

O core-api novo tem a categorização **020** (que **diverge** da hierarquia legada) e é orientado a **`payables`/títulos** (não a `installments`). Sem fixar a tradução entre os dois mundos, qualquer KPI/relatório fica ambíguo: não dá para saber de qual coluna/agrupamento sai cada número. Daí ser o **gate** que destrava `DASH-F1`, `DASH-F5`, `REP-3` (Análise de Planejamento), `REP-4` (Posição de Pagamentos).

---

## 3. Achados — modelo **legado** (NestJS, `../../ERP-BACKEND`)

### 3.1 Hierarquia de categorização (3 níveis obrigatórios)

- **`CostCenter`** — `src/modules/cost-centers/entities/cost-center.entity.ts`
  - `name`, `active`, `type: CostCenterType` (**PAGAR** = "A PAGAR" / **RECEBER** = "A RECEBER" — `cost-centers/enum/index.ts`), `budgetPlanId` (FK→`BudgetPlan`).
- **`CostCenterCategory`** (2º nível) — `cost-center-category.entity.ts:9-57` — `name`, `costCenterId` (FK), `active`.
- **`CostCenterSubCategory`** (3º nível, **folha**) — `cost-center-sub-category.entity.ts:9-58`
  - `name`, `costCenterCategoryId` (FK), `type: SubCategoryType` (INSTITUCIONAL/REDE),
  - **`releaseType: SubCategoryReleaseType`** — `IPCA | CAED | DESPESAS_PESSOAIS | DESPESAS_LOGISTICAS` (`cost-centers/enum/index.ts:6-11`).
- **`Categorization`** (pivô) — `categorization/entities/categorization.entity.ts:13-92` — liga **um lançamento** aos 3 níveis + `programId` + `budgetPlanId`, com FKs nulláveis para `payableRelationalId`, `receivableRelationalId`, `cardMovRelationalId`, `bankRecordApiId`. **Todo lançamento referencia os 3 níveis** (CC→Cat→SubCat).

### 3.2 Títulos e parcelas

- **`Payables`** — `payables/entities/payable.entity.ts:28-137` — `liquidValue`, `taxValue`, `totalValue`, `payableStatus`, `dueDate`, `paymentDate`, `installments: OneToMany<Installments>`, `categorization: OneToOne<Categorization>`.
  - `PayableStatus` (`payables/enums/index.ts:38-46`): PENDENTE / EM APROVAÇÃO / **LANÇADO** (APPROVED) / NÃO EFETIVADO / **EFETIVADO** (PAID) / ATRASADO / CONCLUIDO.
- **`Installments`** (parcela) — `installments/entities/installments.entity.ts:8-73`
  - `installmentNumber`, `totalInstallments`, `type: InstallmentType` (**LIQUIDO**/**IMPOSTO**), `dueDate`, `value: float`, `status: InstallmentStatus`, `payableId`/`receivableId` (FK).
  - `InstallmentStatus` (`installments/enum/index.ts:6-11`): **PENDENTE** / **PAGO** / **CANCELADO** / **ATRASADO**.
- **Onde o legado mede "pago":** no nível da **parcela** — `SUM(CASE WHEN Installments.status = "PAGO" THEN Installments.value ELSE 0 END)` (ex.: `reports/repositories/position-reports-repository.ts`). **Não** no `Payable.payableStatus`.

### 3.3 Dashboard & realizado

- `statistics/statistics.controller.ts:21-49` + `statistics-repository.ts:29-111`: KPIs vêm de `SUM(Installments.value) WHERE status=PAGO`, agrupado por **CostCenter** (despesas) e **Financier** (receita), no período (mês atual ±1; período anterior = −2 meses). `lastPayments` = 5 parcelas PAGO ordenadas por `dueDate` desc.
- `reports/services/realized-report.service.ts:12-91`: **realizado × previsto** combina 3 fontes — `BudgetResult.valueInCents` (previsto), `Installments.value` PAGO + `BankReconciliation` (realizado), `Contracts.totalValue` (provisionado) — hierarquizado por `CostCenter→Category→SubCategory→mês`.

### 3.4 Budget Plans (Camada 3)

- `budget-plans/entities/budget-plan.entity.ts:21-105`: `year`, `scenarioName`, `version`, `status` (RASCUNHO/EM_CALIBRACAO/APROVADO), `programId`, `parentId` (auto-FK = árvore de revisões).
- `budgets/entities/budget-result.entity.ts:7-66`: `costCenterSubCategoryId`, `month`, `valueInCents`, `data` (JSON com fatores IPCA/CAED da calibração). **`releaseType` da subcategoria orienta a calibração** (IPCA = auto-ajuste por inflação; CAED = manual).

---

## 4. Achados — modelo **core-api** (feature 020 + payables)

### 4.1 Categorização 020 — duas dimensões ortogonais (não 3 níveis)

- **`Category`** — `src/modules/financial/domain/category/types.ts:7-15`: `id`, `name`, `group: CategoryGroup` (**`despesa | receita | ajuste`** — `category-group.ts:8`), `active`, **`parentId: CategoryId | null`** (hierarquia opcional, #147 F3). Tabela `fin_categories` (`adapters/persistence/schemas/mysql.ts:809-826`).
- **`CostCenter`** — `cost-center/types.ts:6-11`: `id`, `code`, `name`, `active`. **Lista plana, sem `type` PAGAR/RECEBER, sem hierarquia.** Tabela `fin_cost_centers` (`mysql.ts:836-848`).
- **`Program`** — cross-módulo (`programs/public-api`, ADR-0006); o financial só lê `{id, name}`.
- **Não existe `releaseType`.** A natureza do lançamento é multidimensional: `Document.type` (tipo fiscal) + `Category.group` (despesa/receita/ajuste).
- **Seed canônico:** 11 categorias (`reference-categories.ts`) + 5 cost-centers `CC-001..CC-005` (`reference-cost-centers.ts`).
- O `Document` referencia categorização por **refs leves** (UUID, sem FK física — ADR-0014): `categoryRef`, `costCenterRef`, `programRef`, `budgetPlanRef`, `contractRef` (todos nulláveis) — `domain/document/types.ts` + `mysql.ts:87-91`. **Não há tabela-pivô `Categorization`.**

### 4.2 Títulos — `Document` (raiz) + `Payable` (interno), sem parcelamento temporal

- **`Document`** (agregado-raiz = **Fato Gerador**) — `domain/document/types.ts:29-36`. Status: **`Draft | Open | Approved | Transmitted | Refused | Paid | Reconciled`**. Um **único `dueDate`** por documento (`types.ts:70`).
- **`Payable`** (entidade **interna** ao Document, não agregado) — `domain/payable/types.ts:7-20`: `kind: 'Parent' | 'Child'`, `value: Money` (centavos), `dueDate`, `status: DocumentStatus`.
  - **Granularidade por retenção, não por tempo:** 1 **Parent** (valor = líquido) + N **Child** (1 por retenção que gera título). `buildOpenPayables()` em `document.ts:79-109`.
- **Baixa por título já existe:** `payPayableManually()` (`document.ts:249-279`, use-case `register-manual-payment.ts`, #223) leva **um** Payable de `Approved → Paid` deixando os irmãos `Approved` — o documento permanece `Approved`. Evento `PayableManuallyPaid` no outbox (ADR-0015).
- Valores sempre em **centavos** (`Money`, persistido como `bigint`). Eventos de domínio + outbox transacional (ADR-0015).

---

## 5. O delta (os 3 gaps que o spike resolve)

1. **Granularidade da categorização:** legado = **3 níveis encadeados** (`CC→Cat→SubCat`) onde a natureza PAGAR/RECEBER mora no **CostCenter**; core = **2 dimensões ortogonais** (`CostCenter` ⊥ `Category`) onde a natureza despesa/receita mora na **Category.group**, com hierarquia **opcional** de 1–2 níveis via `parentId`.
2. **`releaseType` não tem equivalente** no core — é conceito de **orçamento/calibração** (IPCA/CAED), não de categorização de lançamento. Pertence à Camada 3 (Budget Plans), não às Camadas 0–2.
3. **Granularidade de pagamento:** legado mede "pago" na **parcela** (`Installment`, fração **temporal**); core mede na **fração por retenção** (`Payable`) e **não parcela no tempo** (1 `dueDate` por Document).

---

## 6. Mapa de equivalência (o Anticorruption Layer)

> Evans, _Domain-Driven Design_, cap.14: "create another class whose job it will be to translate between our model and the language of the [legacy] System … reabstract them in terms of our domain model" (`ddd--evans-livro-azul.md:2272`); o ACL é "a mechanism that translates conceptual objects and actions from one model and protocol to another" (`:5015`); o "conceptual translation map" (`:4837`). As tabelas abaixo **são** esse mapa.

### Mapa A — Categorização (legado → core 020)

| Legado | Nível | Core-api 020 | Tradução / observação |
| ------ | ----- | ------------ | --------------------- |
| `CostCenter.type` (PAGAR/RECEBER) | — | `Category.group` (`despesa`/`receita`) | A **natureza** migra do CostCenter para a Category. `ajuste` é novo (sem origem legada). |
| `CostCenter` (`name`) | 1 | `CostCenter` (`code` + `name`) | Dimensão de rateio. Lista plana nos dois lados. |
| `CostCenterCategory` (`name`) | 2 | `Category` top-level (`parentId = null`) | |
| `CostCenterSubCategory` (`name`) | 3 (folha) | `Category` filha (`parentId` preenchido) | Usa a hierarquia opcional da 020 (#147 F3). |
| `CostCenterSubCategory.releaseType` (IPCA/CAED/…) | 3 | **— (sem equivalente)** | Conceito de orçamento/calibração → **Camada 3** (Budget Plans). Fora do escopo Camada 2. |
| `Categorization` (pivô, FKs) | — | refs no `Document` (`categoryRef`, `costCenterRef`, `programRef`, `budgetPlanRef`) | Core não tem tabela-pivô — refs leves no próprio documento (ADR-0014). |
| `Program` | — | `Program` (cross-módulo `programs`) | |
| `BudgetPlan` (agregado) | — | `budgetPlanRef` (no Document) + agregado de planejamento **inexistente** | O agregado de Budget Plan é **Camada 3** (#113). |

### Mapa B — `installments → payables` (granularidade + valor)

| Legado | Core-api | Tradução / observação |
| ------ | -------- | --------------------- |
| `Payable` (título) | `Document` (Fato Gerador) | Raiz **diferente** por ADR-0001 (título avulso → documento soberano). |
| `Installment` (parcela: `dueDate`+`value`+`status`) | `Payable` (unidade de baixa) | Unidade onde se mede "pago" nos dois lados — **mas** a parcela legada é fração **temporal**; o Payable core é fração **por retenção**. |
| `Installment.type = LIQUIDO` | `Payable kind = 'Parent'` (`value = netValue`) | |
| `Installment.type = IMPOSTO` | `Payable kind = 'Child'` (`retentionType` ≠ null) | Semântica difere: legado = parcela de imposto; core = título de retenção (ISS/IRRF/INSS/CSRF). |
| **`SUM(Installment.value WHERE status = PAGO)`** | **`SUM(Payable.value WHERE status = 'Paid')`** | **Fórmula-chave** de `totalExpenses`/realizado. Reproduz o número legado sobre os payables novos. |

### Mapa C — Status (`InstallmentStatus` legado → `Payable.status` core)

| Legado (`InstallmentStatus`) | Core (`Payable.status`) | Tradução |
| ---------------------------- | ----------------------- | -------- |
| PENDENTE ("PENDENTE") | `Open` (não-aprovado) ou `Approved` (aprovado, a pagar) | "a pagar" no core abrange 2 estados. |
| **PAGO** ("PAGO") | **`Paid`** | Via baixa manual por título (#223), `Approved → Paid`. |
| ATRASADO ("ATRASADO") | **derivado**: `status ∈ {Open, Approved}` ∧ `dueDate < hoje` | Core **não materializa** "atrasado" — é cálculo na borda de leitura. |
| CANCELADO ("CANCELADO") | `Document` cancelado (hard delete em `Open`) / `Refused` (reservado) | |

---

## 7. As 3 decisões — fundamentação

### D1 — Reusar a 020 (não portar a hierarquia legada)

**Decidido essencialmente pelo ADR-0001** (`handbook/architecture/adr/0001-strangler-fig-over-rewrite.md`), que é **imutável** e vence tudo na hierarquia de fontes:

> "A P.O. estabeleceu que **o handbook é fonte da verdade e não será alterado**." … "Muda quem é o agregado raiz (Documento, não Título)."

Portar `CostCenter→Category→SubCategory` + `releaseType` para dentro do core seria adotar o relacionamento **Conformist** com o legado (Evans: "give up on an independent model altogether" — `ddd--evans-livro-azul.md:4984`), o que **contradiz** o ADR-0001 (modelo novo soberano). O caminho canônico para integrar com um legado de modelo incompatível, **sem** deixá-lo corromper o modelo novo, é o **Anticorruption Layer** (Evans: "Insulate yourself as much as possible by creating an ANTICORRUPTION LAYER, an aggressive approach to implementing a translation map" — `:4991`). O **Mapa A** (§6) é esse translation map.

Consequência prática: a 020 fica **intocada**. A hierarquia legada de 3 níveis é **achatada** em 2 dimensões (CostCenter ⊥ Category) + hierarquia opcional de Category. Para Dashboard/Reports da Camada 2 — que agrupam por `Supplier → CostCenter → Category` — isso é **suficiente**.

### D2 — `installments → payables` via Mapa B/C; sem parcelamento temporal agora

A unidade de baixa do core (`Payable`) cumpre o papel da parcela legada **para títulos sem parcelamento** (1 Document = 1 vencimento = 1 Payable Parent). A fórmula `SUM(Payable.value WHERE status='Paid')` reproduz o `SUM(Installment.value WHERE PAGO)` legado. A transição `Approved → Paid` por título já está implementada (#223). **Lacuna registrada** em §8.

### D3 — Dashboard fatiado (BFF)

ADR-0005 (`0005-thin-bff-gateway.md`) + recomendação do próprio #112: 1 endpoint por widget desacopla a entrega no front (1 widget = 1 PR, política zero-mock) e mantém cada query simples. Endpoints sugeridos: `…/dashboard/kpis`, `…/dashboard/cost-centers`, `…/dashboard/realized`, `…/dashboard/last-payments`, `…/dashboard/no-contract-suppliers`. **Sem RBAC** (decisão da P.O.), só autenticação.

---

## 8. Lacunas e riscos (issues a abrir quando priorizado)

1. **Parcelamento temporal ausente no core (R-1, ALTO para migração de dados).** O core hoje não modela N parcelas com vencimentos distintos para um mesmo título. Não bloqueia a Camada 2 sobre **dados novos** (criados no core sem parcelamento), mas a **migração do dump legado** com títulos parcelados exige decisão: (a) 1 Document por parcela, ou (b) estender o core com parcelamento temporal. Abrir issue própria antes da migração de histórico. **Não resolver agora** (ADR-0040: registrar, não desviar).
2. **`ajuste` / `releaseType` (R-2, MÉDIO).** `Category.group = 'ajuste'` não tem origem legada; `releaseType` (IPCA/CAED) não tem destino no core. Ambos pertencem à **Camada 3** (Budget Plans, #113) e ao agregado de planejamento inexistente. Não impactam Dashboard/Reports.
3. **Receita/recebíveis (R-3, já registrado em #179).** `Category.group='receita'` existe, mas **não há `receivables`** no core. Os KPIs/relatórios de receita do dashboard ficam parciais até o módulo `receivables` (Posição Recebíveis, Análise de Recebimentos, Fluxo de Caixa — adiados em #179).
4. **Fronteira de leitura cross-módulo (R-4, MÉDIO).** Dashboard/Reports leem dados do `financial` mas **não podem** ler tabelas `fin_*` direto (ADR-0014). A topologia (read-model próprio via outbox vs. leitura via `financial/public-api`) é **decisão dos tickets de implementação**, não deste spike — registrada para os cards da Camada 2.

---

## 9. Desbloqueios diretos (DoD da #233)

| Card | Como o spike destrava |
| ---- | --------------------- |
| **DASH-F1** (KPIs do dashboard) | Mapa B/C define `totalExpenses = SUM(Payable.value WHERE 'Paid')`; agrupamento por CostCenter via Mapa A. |
| **DASH-F5** (distribuição por centro de custo) | `barChartCostCenterPayment` = pagos agrupados por `costCenterRef` (Mapa A, CostCenter 1:1). |
| **REP-3** (Análise de Planejamento) | "Planejado" = `budgetPlanRef`/Camada 3; "realizado" via Mapa B. Parte de planejamento depende do agregado de Budget Plan (Camada 3) — registrar dependência. |
| **REP-4** (Posição de Pagamentos) | Direto: `Supplier → CostCenter → Category` (Mapa A) × status PENDENTE/PAGO/ATRASADO (Mapa C). |

---

## 10. Referências

- [ADR-0048](../../handbook/architecture/adr/0048-legacy-categorization-installments-mapping.md) (destilado deste spike — **Proposed**).
- ADR-0001 (strangler fig, imutável), ADR-0005 (thin BFF), ADR-0006/0014 (modular monolith / isolamento), ADR-0015 (outbox), ADR-0022 (read-models por projeção).
- Evans, _Domain-Driven Design_, cap.14 (Anticorruption Layer / Conformist) — `acdg/skills_base/shared-references/ddd/ddd--evans-livro-azul.md:2272,4837,4984,4991,4997,5015`.
- Vernon, _Implementing DDD_, cap.3 (Context Maps) — `ddd--vernon-livro-vermelho.md:438,596`.
- Issues: #233 (este spike), #112/#114/#113 (features), #169 (épico), #179 (recebíveis adiados).
