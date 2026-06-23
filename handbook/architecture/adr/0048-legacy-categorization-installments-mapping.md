[← Voltar para ADRs](./README.md)

# ADR-0048: Reuso da categorização 020 + Anticorruption Layer de `installments → payables` + dashboard fatiado (gate Camadas 0–2)

- **Status:** Proposed
- **Date:** 2026-06-23
- **Deciders:** Gabriel (tech lead / arquiteto) — aguardando ratificação. P.O. já ratificou o RBAC (ver §Decisão D3).
- **Origem:** Spike [#233](https://github.com/ERP-Bem-Comum/core-api/issues/233) (research time-boxed). Relatório completo em [`.claude/.planning/SPIKE-233-CATEGORIZACAO-INSTALLMENTS.md`](../../../.claude/.planning/SPIKE-233-CATEGORIZACAO-INSTALLMENTS.md).
- **Gate de:** Camada 2 do épico [#169](https://github.com/ERP-Bem-Comum/core-api/issues/169) — Dashboard ([#112](https://github.com/ERP-Bem-Comum/core-api/issues/112)), Reports ([#114](https://github.com/ERP-Bem-Comum/core-api/issues/114)), Budget Plans ([#113](https://github.com/ERP-Bem-Comum/core-api/issues/113)).
- **Conformidade com:** [ADR-0001](./0001-strangler-fig-over-rewrite.md) (strangler fig — **vence**), [ADR-0005](./0005-thin-bff-gateway.md) (thin BFF), [ADR-0006](./0006-modular-monolith-core-api.md) / [ADR-0014](./0014-mysql-database-isolation.md) (modular monolith / isolamento), [ADR-0015](./0015-mysql-outbox-pattern.md) (outbox), [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) (read-models por projeção). **Não cria modelo novo nem altera a 020** — apenas fixa a tradução legado↔novo.

---

## Contexto

O frontend v2 (política zero-mock) precisa dos módulos **Dashboard**, **Reports** e **Budget Plans**, que existem no ERP legado (NestJS) mas não no core-api. Os três computam seus números a partir de duas estruturas legadas:

1. A hierarquia **`CostCenter → Category → SubCategory`** (`../../ERP-BACKEND/src/modules/cost-centers/entities/*`), com `releaseType` (IPCA/CAED/DESPESAS_PESSOAIS/DESPESAS_LOGISTICAS) na folha — eixo de agrupamento de todo relatório/dashboard.
2. As **`installments`** (parcelas — `installments/entities/installments.entity.ts`), onde o legado mede "pago": `SUM(Installments.value) WHERE status = 'PAGO'`.

O core-api tem a categorização **020** — `Category` (`group: despesa|receita|ajuste` + `parentId` hierárquico opcional) ⊥ `CostCenter` (lista plana `code`+`name`), **sem `releaseType`** — e é orientado a **`payables`/títulos** (`Document` Fato Gerador → `Payable` Parent/Child por retenção), **sem parcelamento temporal** (1 `dueDate` por documento). Os dois modelos são incompatíveis por desenho: o ADR-0001 (imutável) estabeleceu que "o handbook é fonte da verdade e **não será alterado**" e que "muda quem é o agregado raiz (Documento, não Título)".

Sem fixar a tradução entre os dois mundos, todo KPI/relatório das Camadas 0–2 fica ambíguo. Este ADR é o **gate** dessa camada.

---

## Decisão

Tratamos o legado como um **Bounded Context distinto e não-cooperativo** e fixamos um **Anticorruption Layer** (Evans, cap.14: "a mechanism that translates conceptual objects and actions from one model and protocol to another") — um **mapa de equivalência** — em vez de portar a estrutura legada. Três decisões:

### D1 — Categorização: **reusar a 020**, não portar a hierarquia legada

A 020 fica **intocada**. A hierarquia legada de 3 níveis é **achatada** via o mapa abaixo. Portar `CostCenter→Category→SubCategory`+`releaseType` seria adotar o relacionamento **Conformist** com o legado (Evans `:4984`), o que contradiz o ADR-0001 (modelo novo soberano). O caminho canônico é o ACL (Evans `:4991`).

**Mapa A — categorização (legado → core 020):**

| Legado | Nível | Core-api 020 | Tradução |
| ------ | ----- | ------------ | -------- |
| `CostCenter.type` (PAGAR/RECEBER) | — | `Category.group` (`despesa`/`receita`) | a natureza migra do CostCenter para a Category; `ajuste` é novo (sem origem legada) |
| `CostCenter` (`name`) | 1 | `CostCenter` (`code`+`name`) | dimensão de rateio, lista plana nos dois lados |
| `CostCenterCategory` | 2 | `Category` top-level (`parentId=null`) | |
| `CostCenterSubCategory` | 3 (folha) | `Category` filha (`parentId` preenchido) | usa a hierarquia opcional da 020 (#147 F3) |
| `CostCenterSubCategory.releaseType` | 3 | **— (sem equivalente)** | conceito de orçamento/calibração → **Camada 3** (Budget Plans), não de categorização de lançamento |
| `Categorization` (pivô) | — | refs no `Document` (`categoryRef`, `costCenterRef`, `programRef`, `budgetPlanRef`) | core não tem tabela-pivô; refs leves (ADR-0014) |

### D2 — `installments → payables`: equivalência de granularidade e status; **sem parcelamento temporal agora**

A unidade de baixa do core (`Payable`) cumpre o papel da parcela legada **para títulos sem parcelamento** (1 `Document` = 1 vencimento = 1 `Payable` Parent). A transição `Approved → Paid` por título já existe (#223).

**Mapa B — granularidade/valor:**

| Legado | Core-api | Tradução |
| ------ | -------- | -------- |
| `Payable` (título) | `Document` (Fato Gerador) | raiz diferente (ADR-0001) |
| `Installment` (parcela) | `Payable` (unidade de baixa) | parcela legada = fração temporal; payable core = fração por retenção |
| `Installment.type=LIQUIDO` | `Payable kind='Parent'` (`value=netValue`) | |
| `Installment.type=IMPOSTO` | `Payable kind='Child'` (retenção ISS/IRRF/INSS/CSRF) | |
| **`SUM(Installment.value WHERE status='PAGO')`** | **`SUM(Payable.value WHERE status='Paid')`** | **fórmula-chave** de `totalExpenses`/realizado |

**Mapa C — status (`InstallmentStatus` → `Payable.status`):**

| Legado | Core | Tradução |
| ------ | ---- | -------- |
| PENDENTE | `Open` / `Approved` | "a pagar" abrange 2 estados |
| **PAGO** | **`Paid`** | baixa manual por título (#223) |
| ATRASADO | **derivado**: `status∈{Open,Approved}` ∧ `dueDate<hoje` | core não materializa "atrasado" |
| CANCELADO | hard delete em `Open` / `Refused` | |

### D3 — Endpoint de Dashboard: **fatiado** (1 por widget)

Por ADR-0005 (thin BFF) + recomendação do #112: `…/dashboard/kpis`, `…/dashboard/cost-centers`, `…/dashboard/realized`, `…/dashboard/last-payments`, `…/dashboard/no-contract-suppliers`. Desacopla a entrega no front (1 widget = 1 PR).

**RBAC (ratificado pela P.O., #233 em 2026-06-23):** Dashboard (#112) e Reports (#114) **sem** `authorize(permission)` — só autenticação, espelhando o legado (qualquer usuário autenticado vê os agregados). Budget Plans (#113, Camada 3) decide RBAC ao entrar (write-heavy + compartilhamento externo).

---

## Consequências

**Positivas:**

- A 020 permanece intocada; a divergência legado↔novo fica isolada num mapa de tradução explícito (ACL — Evans cap.14), em conformidade com o ADR-0001.
- Destrava os cards `DASH-F1`, `DASH-F5`, `REP-3` (Análise de Planejamento), `REP-4` (Posição de Pagamentos) com fórmulas e agrupamentos sem ambiguidade.
- Endpoints fatiados permitem entrega incremental (zero-mock) no front, 1 widget por PR.

**Negativas / trade-offs:**

- **Perda de granularidade:** 3 níveis legados → 2 dimensões + hierarquia opcional. Suficiente para os relatórios de pagáveis da Camada 2, mas não reproduz `releaseType`/SubCategory para fins de orçamento (Camada 3).
- **Sem parcelamento temporal:** a migração do dump legado com títulos parcelados exige decisão própria (1 Document/parcela vs. estender o core) — **R-1**, abrir issue antes da migração de histórico. Não bloqueia a Camada 2 sobre dados novos.
- **Receita parcial:** `Category.group='receita'` existe, mas `receivables` não — KPIs de receita ficam parciais até #179.
- **Fronteira de leitura:** Dashboard/Reports não podem ler `fin_*` direto (ADR-0014); a topologia (read-model via outbox vs. leitura via `financial/public-api`) é decisão dos tickets de implementação, não deste ADR.

---

## Quando re-avaliar

- **Migração de dados históricos:** se o dump legado trouxer títulos parcelados, reabrir D2 (R-1).
- **Camada 3 (Budget Plans #113):** o agregado de planejamento (cenário/calibração/IPCA/CAED) reintroduz `releaseType` — exigirá ADR próprio que **estende** este, não o supersede.
- **Receivables (#179):** ao existir o módulo `receivables`, completar os mapas para os slices de receita/fluxo de caixa.

---

## Referências

- Spike completo: [`.claude/.planning/SPIKE-233-CATEGORIZACAO-INSTALLMENTS.md`](../../../.claude/.planning/SPIKE-233-CATEGORIZACAO-INSTALLMENTS.md).
- Evans, _Domain-Driven Design_, cap.14 — Anticorruption Layer / Conformist (`ddd--evans-livro-azul.md:2272,4837,4984,4991,4997,5015`).
- Vernon, _Implementing DDD_, cap.3 — Context Maps (`ddd--vernon-livro-vermelho.md:438,596`).
- ADR-0001 (strangler fig), ADR-0005 (thin BFF), ADR-0006/0014, ADR-0015, ADR-0022.
- Issues: #233, #112, #114, #113, #169, #179.
