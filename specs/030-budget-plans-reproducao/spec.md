# Feature Spec — Plano Orçamentário (reprodução do legado no core-api)

> **Spec-kit:** 030-budget-plans-reproducao · **Issue guarda-chuva:** #113 · **Épico:** #169
> **Origem:** handoff do front (feature 041, P.O. Alessandra, 2026-07-01) · **Módulo novo:** `budget-plans`
> **Status:** DRAFT (specify) · **Sequenciamento:** pós-financeiro (#246) — Decisão 13 da P.O., **não bloqueia go-live**

## Contexto

O front v2 reproduz o módulo **Plano Orçamentário** (slices **Planejamento** + **Consolidado ABC**), portando do legado `../../ERP-BACKEND` (NestJS, módulos `budget-plans` + `budgets`). O core-api **não tem** o módulo — só o campo solto `budgetPlanRef` no financeiro. Política do front = **zero-mock** → nada construível sem endpoint real. Esta spec cria o módulo `budget-plans` como **modular monolith** (ADR-0006), tabelas com prefixo `bdg_*` (ADR-0014 — prefixo a confirmar no `/speckit-plan`), Money em **centavos** (bigint, ADR-0018), borda HTTP **Fastify + Zod** (ADR-0025/0027).

## Conceitos-chave (confirmados no handoff)

- **Plano** = `Ano + Programa` (`ETI`/`PARC`/`EPV`), **versionado** (`1.0`/`1.1`/`2.0`), status **`Rascunho` · `Em Calibração` · `Aprovado`**.
- **Orçamento** = recorte por **Rede** (Estado **ou** Município, varia por programa); 1 por parceiro; soma = total do plano.
- Árvore **Centro de Custo (`A PAGAR`/`A RECEBER`) → Categoria → Subcategoria**; a subcategoria carrega o **Tipo de lançamento**.
- **4 modelos de cálculo** (o "índice"): `DESPESAS_PESSOAIS` (folha), `IPCA`, `CAED` (qtd×unitário), `DESPESAS_LOGISTICAS` (viagem).
- **Edição por status:** `Rascunho`/`Em Calibração` editáveis; `Aprovado` bloqueado (edita-se iniciando Calibração).
- **Consolidado "ABC"** = nome da organização; agrega planos **`Aprovados`** por Ano Base × Programa(s).
- **Realizado** (Insights/Planejado×Realizado) = Financeiro/Conciliação com status **`CONCILIADO`** (cross-módulo).

## User Stories (priorizadas = fatias)

### US1 — CRUD de Plano `[P1]` · ticket `BDG-PLAN-CRUD` · #315

Como planejador, crio/listo/abro planos por Ano+Programa para começar o planejamento.
**Aceite:** criar nasce `Rascunho` v1.0; lista traz status/programa/ano/versão/total; `/:id` traz cabeçalho + orçamentos por Rede; `/options` popula os selects.

### US2 — Estrutura de custos `[P1]` · ticket `BDG-COST-STRUCTURE` · #316

Como planejador, monto a árvore Centro de Custo → Categoria → Subcategoria para organizar os lançamentos.
**Aceite:** GET retorna a árvore com o Tipo de lançamento na folha; edição respeita hierarquia e direcionamento; plano `Aprovado` bloqueia edição.

### US3 — Orçamento por Rede + 4 cálculos `[P1]` · ticket `BDG-BUDGET-CALC` · #317

Como planejador, lanço valores por subcategoria usando um dos 4 modelos, com o **backend como fonte única** do cálculo.
**Aceite:** `POST /budget-results/{modelo}` calcula/persiste em centavos batendo com a fórmula legada; GETs alimentam a planilha "Calculando Gastos" e a base do ano anterior.
**🔴 Clarification pendente — BLOQUEANTE:** na folha (`DESPESAS_PESSOAIS`) a UI mostra "Qtd de {subcategoria}", mas a fórmula legada **não multiplica por quantidade** (metadado) — confirmar antes do W1.

> **Agravada pela feature 036 (#413, 2026-07-15):** com o Orçamento mensal, o cálculo passa a persistir **12× por conta** (um por mês do exercício). Uma divergência de fórmula deixa de ser cosmética e **corrompe dado real, multiplicado por 12**. Aberta desde 2026-07-01. Ver [`specs/036-budget-plans-monthly/research.md`](../036-budget-plans-monthly/research.md) §D6.

### US4 — Ciclo de vida `[P2]` · ticket `BDG-PLAN-LIFECYCLE` · #318

Como planejador, crio cenários, inicio calibração, aprovo e vejo Planejado×Realizado.
**Aceite:** `start-calibration` deriva versão editável de plano `Aprovado` sem alterá-lo; aprovar transiciona e bloqueia; `/insights` cruza Planejado (plano) × Realizado (financeiro `CONCILIADO`).
**Cross-módulo:** Realizado via **read-model/evento** do financeiro (ADR-0022/0006) — não importar `financial/domain`.

### US5 — Consolidado ABC + CSV `[P2]` · ticket `BDG-CONSOLIDATED-CSV` · #319

Como gestor, consolido planos `Aprovados` por Ano Base × Programa e exporto CSV.
**Aceite:** `/consolidated-result` agrega em centavos; `/csv` gera server-side (layout = amostra real); `/:id/generate-csv` exporta um plano. Reusa `src/shared/utils/csv.ts`.

### US6 — Compartilhamento externo seguro `[P3 · DEFERRED]` · ticket `BDG-SHARE-EXTERNAL` · #320

Como gestor, compartilho o consolidado externamente **com segurança**.
**Decisão 9 da P.O.:** ADIAR pós-entrega — credencial legada **insegura**, **não portar as-is**; reescrever com token escopado+expirável. Requer threat model antes de qualquer implementação.

## Requisitos funcionais (transversais)

- **FR-001** Valores monetários em **centavos** (bigint) na persistência e nas responses.
- **FR-002** Responses validadas por **Zod** (ADR-0027); erros de borda 400/403 tipados.
- **FR-003** Cálculo é **server-side** (fonte única); o front só faz preview (Decisões 11/12).
- **FR-004** Isolamento de módulo: `budget-plans` não importa `domain/`/`application/` de outros módulos — só via `<module>/public-api/` (ADR-0006). `Program` via `programs/public-api/read.ts`; `Realizado` via read-model/evento do `financial`.
- **FR-005** Erros internos EN kebab-case: `budget-plan-not-found`, `budget-plan-not-editable`, `budget-not-found`, `calc-model-mismatch`, `plan-not-approved-for-consolidation`.
- **FR-006** Transições de status válidas apenas: `Rascunho→Em Calibração→Aprovado` e `Aprovado→(start-calibration)→Em Calibração`.

## Key Entities

- **BudgetPlan** (agregado): `id`, `year`, `programRef` (ETI/PARC/EPV), `version` (VO), `status` (enum), `budgets[]`.
- **Budget**: `id`, `planId`, `networkRef` (Rede: Estado|Município), `partnerRef`, totais.
- **CostStructure**: árvore `CostCenter(A PAGAR|A RECEBER) → Category → Subcategory{launchType}`.
- **BudgetResult**: `budgetId`, `subcategoryRef`, `model` (discriminated union dos 4), `valueCents`.
- **ConsolidatedResult** (read-model): agregação de planos `Aprovados` por Ano×Programa.

## Success Criteria

- Os 4 modelos de cálculo reproduzem a **fórmula** do legado (teste de paridade contra Apêndice B). **A paridade de _grão_ não é mais exigida** — desde a feature 036 (#413) o orçado é lançado em **rede × subcategoria × mês**, enquanto o legado orça em `costCenter + categoria × mês`. A decisão da P.O. ("orçado conta a conta", #454) prevalece sobre a reprodução do grão; a fórmula continua idêntica. Ver [`036-budget-plans-monthly/spec.md`](../036-budget-plans-monthly/spec.md) FR-013.
- CSV do consolidado bate com `HANDBOOK-plano-orcamentario-consolidado-abc-export-exemplo.csv`.
- Front v2 liga cada page ao endpoint real, encerrando o zero-mock do #113.

## Out of scope / deferred

- Compartilhamento externo (US6 — deferred, Decisão 9).
- Parcelamento temporal (ADR-0048/#233) e reforma tributária (fora do Plano Orçamentário).

## Próximo passo spec-kit

`/speckit-clarify` (resolver a divergência folha×qtd) → `/speckit-plan` (agregados + prefixo `bdg_*` + contrato de leitura cross-módulo do Realizado) → `/speckit-tasks`. **Implementação gated pós-#246.**
