# Tasks: Orçamento mensal no Plano Orçamentário (#413)

**Input**: Design documents from `/specs/036-budget-plans-monthly/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/](./contracts/budget-results-monthly.md)

**Tests**: **OBRIGATÓRIOS** — a constituição §I (TDD fail-first W0→W3) é **não-negociável**. Todo ticket abre com W0 RED antes de tocar `src/`.

**Organization**: agrupadas por user story. As fases mapeiam 1:1 nos **3 tickets de pipeline** do plan.md (domínio → persistência → borda).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivo diferente, sem dependência pendente)
- **[Story]**: US1 · US2 · US3 (da spec.md). Setup/Foundational/Polish não levam label.

## Path Conventions

Modular monolith — módulo `budget-plans` (ADR-0006). Código em `src/modules/budget-plans/`, testes espelhando em `tests/modules/budget-plans/`.

---

## ⚠️ Bloqueios conhecidos (ler antes de começar)

| Bloqueio                                                                                                                                           | O que trava                                 | Ação                                                                                                                                                                                                         |
| :------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 **Clarification da spec 030 `:37`** — folha `DESPESAS_PESSOAIS` × "Qtd de {subcategoria}": a UI mostra qtd, a **fórmula legada não multiplica** | **W1 de T018** (o POST `personal-expenses`) | Confirmar com a P.O. **antes** dessa fatia. Voltou a ser bloqueante porque o cálculo **persiste 12× por conta** — divergência corrompe dado real, não é mais cosmética. Ver [research.md §D6](./research.md) |
| 🔴 **#374** — `BUDGET_PLANS_DRIVER`/`_DATABASE_URL` ausentes no deploy                                                                             | **A ENTREGA**, não a construção             | Sem isso o mensal é implementado e o planejador **continua perdendo tudo no restart**. QA ✅; produção aguarda deploy (taskdef mergeado em ERP-INFRA#20)                                                     |
| 🟡 **x99 offline**                                                                                                                                 | Validação com MySQL real                    | Usar **OrbStack local** ou o **QA**. ⚠️ `pnpm test:integration:*` **DESTRÓI a infra dev** (`down -v`) — usar MySQL avulso                                                                                    |

---

## Phase 1: Setup

**Purpose**: abrir os tickets de pipeline. Nenhum código.

- [ ] T001 Abrir ticket com `pnpm run pipeline:state init BGP-MONTH-VO --size S` e escrever o escopo em `.claude/.pipeline/BGP-MONTH-VO/000-request.md` (VO `ExerciseMonth` + `month` no agregado)
- [ ] T002 [P] Abrir ticket com `pnpm run pipeline:state init BGP-MONTH-PERSIST --size M` e escrever o escopo em `.claude/.pipeline/BGP-MONTH-PERSIST/000-request.md` (schema + migration + mapper + repos; **incluir o achado do bug de contagem em dobro**)
- [ ] T003 [P] Abrir ticket com `pnpm run pipeline:state init BGP-MONTH-HTTP --size S` e escrever o escopo em `.claude/.pipeline/BGP-MONTH-HTTP/000-request.md` (`month` no contrato + use cases)

> ⚠️ Antes de criar: conferir se o nome do ticket já existe em `.claude/.pipeline/` (pode colidir com um fechado).

---

## Phase 2: Foundational (BLOQUEIA todas as user stories)

**Purpose**: o VO `ExerciseMonth` e o `month` no agregado. Nenhuma US existe sem isto.

**Ticket**: `BGP-MONTH-VO` (S) — W0 → W3 completo.

### W0 — RED (falha por inexistência da API)

- [ ] T004 Escrever `tests/modules/budget-plans/domain/shared/exercise-month.test.ts`: `parse` aceita 1..12; rejeita **0**, **13**, **−1**, **3.5**, **NaN**, `Infinity` → `err('exercise-month-invalid')`; `rehydrate` idem. Deve falhar: o arquivo `exercise-month.ts` não existe
- [ ] T005 [P] Estender `tests/modules/budget-plans/domain/budget-result/budget-result.test.ts`: `BudgetResult.create` exige `month`; dois results com mesmo `(budgetId, subcategoryId)` e meses diferentes são entidades distintas. Deve falhar: `create` não aceita `month`
- [ ] T006 Registrar W0 RED: `pnpm run pipeline:state wave-start BGP-MONTH-VO W0 --agent tdd-strategist` e `wave-finish ... --outcome RED --report 002-tests/REPORT.md`

### W1 — GREEN (mínimo)

- [ ] T007 Criar `src/modules/budget-plans/domain/shared/exercise-month.ts`: branded type `ExerciseMonth`, `parse(raw: number): Result<ExerciseMonth, ExerciseMonthError>`, `rehydrate`, erro `'exercise-month-invalid'` (EN kebab). **Zero throw, zero class** (constituição §V)
- [ ] T008 Adicionar `month: ExerciseMonth` ao agregado em `src/modules/budget-plans/domain/budget-result/budget-result.ts` e ao input de `BudgetResult.create`. **Manter `model`** — segue descrevendo como o valor foi produzido
- [ ] T009 Rodar W1 até GREEN e registrar (`wave-start`/`wave-finish --outcome GREEN`)

### W2/W3

- [ ] T010 W2 code review (read-only, máx 3 rounds) → `004-code-review/REVIEW.md`
- [ ] T011 W3 gate: `pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` + `pnpm test` — todos verdes; contagem de testes ≥ baseline (regressão zero, §II). `pipeline:state close BGP-MONTH-VO`

**Checkpoint**: `ExerciseMonth` existe e o agregado carrega `month`. Nada persiste ainda.

---

## Phase 3: User Story 1 — Orçar conta a conta, mês a mês (P1) 🎯 MVP

**Goal**: rodar o cálculo de uma conta para um mês específico e o valor ficar guardado naquele mês, sem sobrescrever os outros.

**Independent Test**: rodar o cálculo da mesma conta em dois meses diferentes, recarregar, e conferir que cada mês guardou o seu valor — sem colisão.

**Tickets**: `BGP-MONTH-PERSIST` (M) → `BGP-MONTH-HTTP` (S, parte de escrita).

### W0 — RED · persistência

- [ ] T012 [US1] Escrever `tests/modules/budget-plans/adapters/persistence/repos/budget-result-repository.drizzle-mysql.test.ts`: **(a)** recalcular o mesmo `(budget, subcategoria, month)` **atualiza** — segue 1 linha, `id` preservado, `value_cents`/`model` novos; **(b)** 12 meses coexistem; **(c)** `SUM(value_cents)` = valor × 12; **(d)** mês fora de 1..12 é barrado pelo CHECK. Deve falhar: não existe `month` nem `save`
- [ ] T013 [P] [US1] Estender `tests/modules/budget-plans/adapters/persistence/repos/*.in-memory*` (ou o teste de paridade): in-memory replica a chave `(budgetId, subcategoryId, month)` e a semântica de upsert — **paridade in-memory ↔ drizzle**

### W1 — GREEN · persistência

- [ ] T014 [US1] Alterar `src/modules/budget-plans/adapters/persistence/schemas/mysql.ts` (bloco `bgp_budget_results`, ~:203-229): **+** `month: tinyint('month').notNull()`; **+** `check('bgp_budget_results_month_chk', sql\`${t.month} BETWEEN 1 AND 12\`)`; **+** `uniqueIndex('bgp_budget_results_budget_subcategory_month_uq').on(t.budgetId, t.subcategoryId, t.month)`; **−** `index('bgp_budget_results_budget_id_idx')`(**redundante** — o UNIQUE é índice de prefixo). Manter`subcategory_id_idx` e a ausência de FK
- [ ] T015 [US1] Gerar a migration: `pnpm run db:generate:budget-plans` e versionar o arquivo. **NUNCA escrever à mão** (constituição §VI). Conferir o SQL emitido: `NOT NULL` sem default é seguro — zero linhas em todos os ambientes
- [ ] T016 [US1] Atualizar `src/modules/budget-plans/adapters/persistence/mappers/budget-result.mapper.ts`: `budgetResultToInsert` inclui `month`; `budgetResultFromRow` faz `ExerciseMonth.rehydrate` e devolve `err('budget-result-corrupt')` se a row vier fora de 1..12
- [ ] T017 [US1] Trocar `add` → `save` em `src/modules/budget-plans/domain/budget-result/repository.ts` (port) e nos **dois** adapters: `budget-result-repository.drizzle.ts` usa **`.onDuplicateKeyUpdate({ set: { valueCents, model } })`** (atômico; ADR-0020 permite; padrão já usado em `payable-view-store`/`supplier-view-store`); `budget-result-repository.in-memory.ts` faz o mesmo por chave composta

### W0/W1 — borda (escrita)

- [ ] T018 [US1] Escrever `tests/modules/budget-plans/adapters/http/*.http.test.ts` (RED, via `fastify.inject`): POST nos 4 modelos com `month` → **201** com `month` no body; **400** para `month` 0/13/−1/3.5/ausente; **403** `budget-plan-not-editable` em plano Aprovado; repetir o POST **atualiza** (não duplica). ⚠️ **`personal-expenses` depende da clarification da 030 `:37`** — ver Bloqueios
- [ ] T019 [US1] Adicionar `month: z.int().min(1).max(12)` a `budgetResultTargetSchema` em `src/modules/budget-plans/adapters/http/schemas.ts` (~:282). Os 4 POSTs herdam por `.extend()` — **não** tocar nos inputs de cada modelo. `z.int()`, **não** `z.coerce` (body é JSON)
- [ ] T020 [US1] Propagar `month` em `src/modules/budget-plans/application/use-cases/add-budget-result.ts`: `+month` no command, `ExerciseMonth.parse` na validação, repassar ao `BudgetResult.create` e ao `repo.save`. Manter a sequência canônica (validar → fetch → domain → persist)
- [ ] T021 [US1] Incluir `month` no DTO de saída (`budgetResultToDto`, `budgetResultResponseSchema`)

### Gates

- [ ] T022 [US1] W2 code review dos dois tickets (máx 3 rounds cada) → `004-code-review/REVIEW.md`
- [ ] T023 [US1] W3 gate + **validação com MySQL real** (OrbStack ou QA — x99 offline): a migration aplica, o UNIQUE existe (`SHOW INDEX ... LIKE '%month_uq'`), o upsert atualiza. `pipeline:state close` nos dois tickets

**Checkpoint**: 🎯 **MVP entregue.** Os 4 formulários de "Calculando Gastos" deixam de ser órfãos — cada um grava no mês para o qual foi rodado.

---

## Phase 4: User Story 2 — Ver o ano inteiro dividido por mês (P1)

**Goal**: o grid do exercício com as contas nas linhas e os meses nas colunas, com passador de mês.

**Independent Test**: com valores em vários meses e contas, abrir o grid e conferir que cada célula (conta, mês) mostra o valor certo e que os totais de linha/coluna fecham.

**Ticket**: `BGP-MONTH-HTTP` (S, parte de leitura).

- [ ] T024 [US2] Escrever o teste RED da leitura em `tests/modules/budget-plans/adapters/http/*.http.test.ts`: `GET /budget-plans/budget-results/by-budget/:budgetId` devolve `month` em cada item; `?month=3` filtra; `?month=banana` → **400**
- [ ] T025 [US2] Devolver `month` em `src/modules/budget-plans/application/use-cases/get-budget-results.ts` (a soma `Money.add` já existe e passa a totalizar o ano — não duplicar a lógica na borda)
- [ ] T026 [US2] Aceitar `?month=` opcional na query da rota `by-budget` em `src/modules/budget-plans/adapters/http/plugin.ts` (~:505) com `z.coerce.number().int().min(1).max(12)` — `z.coerce` **aqui sim** (query é string), seguindo `listBudgetPlansQuerySchema`
- [ ] T027 [US2] W2 + W3 do `BGP-MONTH-HTTP`; `pipeline:state close`

> **Sem paginação e sem filtro obrigatório**: o grid é **por rede** → pior caso realista ≈ **1.9k itens** (158 subcategorias × 12). Uma ida traz o ano e o **passador de mês é client-side** (research §D4).

**Checkpoint**: a tela de Orçamento deixa de ser placeholder.

---

## Phase 5: User Story 3 — Totais anuais consistentes (P2)

**Goal**: as visões que já mostram o anual (por Rede, Consolidado, Planejado do Insight) refletem a soma dos meses, sem divergir entre telas.

**Independent Test**: informar valores mensais e conferir que o anual apresentado em cada visão é a soma exata dos meses.

- [ ] T028 [US3] Escrever teste de não-regressão: `getBudgetResults` devolve `totalInCents` = soma dos 12 meses (a soma vive no domínio via `Money.add` — `get-budget-results.ts:19-20`); **reproduzir a prova da P.O.**: 12 × R$ 3.670,92 = **R$ 44.051,04** (SC-005)
- [ ] T029 [P] [US3] Rodar a suíte do Consolidado ABC (US5/#319) e do Insight (#416) contra um plano com 12 meses e conferir que **nada regride** — nenhum consumidor assume "1 linha por (budget, subcategoria)"
- [ ] T030 [US3] ⚠️ **Investigar e registrar** (não corrigir aqui): `BudgetPlan.total` (`domain/budget-plan/budget-plan.ts:181`) soma **`plan.budgets`** (`bgp_budgets.value_cents`), enquanto `getBudgetResults.total` soma os **budget_results**. São **fontes distintas** e podem divergir — questão **pré-existente**, não introduzida pelo mês. Se divergirem, abrir issue via skill `issue-report` (ADR-0040), **sem** scope-creep

**Checkpoint**: FR-007 e SC-002 verificados — uma fonte por número, sem divergência entre telas.

---

## Phase 6: Polish & dívida documental

- [ ] T031 [P] Atualizar `specs/030-budget-plans-reproducao/spec.md:74` (Success Criteria): paridade de **fórmula** continua exigida; paridade de **grão** foi **abandonada** (FR-013 — o legado orça em categoria × mês, esta feature em subcategoria × mês). **O `FR-003` fica INTACTO** — o FR-008 preserva o cálculo como fonte única
- [ ] T032 [P] Anotar em `specs/030-budget-plans-reproducao/spec.md:37` que a clarification (folha × qtd) **voltou a ser bloqueante** por causa desta feature, com link para [research.md §D6](./research.md)
- [ ] T033 Rodar o [quickstart.md](./quickstart.md) de ponta a ponta contra MySQL real e conferir as 8 provas (com atenção à #5: 12 × 3.670,92 = 44.051,04)
- [ ] T034 Abrir PR para `dev` referenciando **#413** e **#454** (guarda-chuva dos 3 buracos de contrato), registrando que os 4 formulários deixaram de ser órfãos

---

## Dependencies

```
Phase 1 (Setup: T001-T003)
   ↓
Phase 2 (Foundational: BGP-MONTH-VO, T004-T011)  ← BLOQUEIA TUDO
   ↓
Phase 3 (US1 — MVP: BGP-MONTH-PERSIST + HTTP-escrita, T012-T023)
   ↓
Phase 4 (US2 — grid: HTTP-leitura, T024-T027)     ← precisa do dado da US1
   ↓
Phase 5 (US3 — totais, T028-T030)                 ← precisa da US1
   ↓
Phase 6 (Polish, T031-T034)
```

**Ordem obrigatória dos tickets**: `BGP-MONTH-VO` → `BGP-MONTH-PERSIST` → `BGP-MONTH-HTTP`. Cada um fecha W0→W3 antes do próximo (constituição §I; memória `always-full-w0-w3-pipeline`).

**US2 e US3 dependem da US1** — sem dado mensal não há grid nem total. Não são independentes entre si, mas **a US1 sozinha já é um incremento entregável** (o backend aceita e persiste o mês; o front liga).

## Parallel Opportunities

| Fase         | Paralelizável                               |
| :----------- | :------------------------------------------ |
| Setup        | T002, T003 (arquivos de ticket distintos)   |
| Foundational | T005 com T004 (arquivos de teste distintos) |
| US1          | T013 com T012 (in-memory × drizzle)         |
| US3          | T029 com T028                               |
| Polish       | T031, T032 (arquivos distintos)             |

**Não paralelizar**: T014→T015→T016→T017 (schema → migration → mapper → repo é cadeia dura), nem T019→T020→T021.

## Implementation Strategy

**MVP = Phase 2 + Phase 3 (US1).** Entrega o núcleo do #413: o mês entra no contrato e no armazenamento, os 4 formulários gravam, e o recálculo é idempotente. As fases 4-6 são incremento sobre um MVP funcionando.

**Corrige de graça um bug pré-existente:** o `UNIQUE (budget_id, subcategory_id, month)` protege o par `(budget_id, subcategory_id)`, hoje **sem chave** — o que faz recalcular gravar linha duplicada e o total por Rede **contar em dobro**. Nunca estourou porque nenhum ambiente tem plano (#374). Ver [research.md §D2](./research.md).

**Total: 34 tasks** — US1: 12 · US2: 4 · US3: 3 · Foundational: 8 · Setup: 3 · Polish: 4.
