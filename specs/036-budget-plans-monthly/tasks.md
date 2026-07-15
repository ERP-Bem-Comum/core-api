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

- [x] T001 Abrir ticket com `pnpm run pipeline:state init BGP-MONTH-VO --size S` e escrever o escopo em `.claude/.pipeline/BGP-MONTH-VO/000-request.md` (VO `ExerciseMonth` + `month` no agregado)
- [x] T002 [P] Abrir ticket com `pnpm run pipeline:state init BGP-MONTH-PERSIST --size M` e escrever o escopo em `.claude/.pipeline/BGP-MONTH-PERSIST/000-request.md` (schema + migration + mapper + repos; **incluir o achado do bug de contagem em dobro**)
- [x] T003 [P] Abrir ticket com `pnpm run pipeline:state init BGP-MONTH-HTTP --size S` e escrever o escopo em `.claude/.pipeline/BGP-MONTH-HTTP/000-request.md` (`month` no contrato + use cases)

> ⚠️ Antes de criar: conferir se o nome do ticket já existe em `.claude/.pipeline/` (pode colidir com um fechado).

---

## Phase 2: Foundational (BLOQUEIA todas as user stories)

**Purpose**: o VO `ExerciseMonth`. **Só o VO** — ver a correção abaixo.

**Ticket**: `BGP-MONTH-VO` (S) — W0 → W3 completo.

> ⚠️ **Fatiamento corrigido no W1 (2026-07-15).** O escopo original incluía `month` no agregado `BudgetResult`. **Não é isolável:** o `budgetResultFromRow` monta o agregado **a partir da row**, então `month` obrigatório exige a **coluna** — que só existe na Phase 3. O typecheck reprovou em **7 call sites** (mapper, use case e 5 testes): é **mudança de assinatura transversal** (mesma lição do #373).
>
> **`month` no agregado + CA3/CA4/CA5 desceram para a Phase 3** (`BGP-MONTH-PERSIST`), junto do schema/mapper/repo que o exigem. Rejeitado: `month` opcional (fura o CA4/FR-005), default no mapper (inventa dado), e typecheck vermelho entre fatias (viola o gate W3 e a §II).

### W0 — RED (falha por inexistência da API)

- [x] T004 Escrever `tests/modules/budget-plans/domain/shared/exercise-month.test.ts`: `parse` aceita 1..12; rejeita **0**, **13**, **−1**, **99**, **3.5**, **NaN**, **±Infinity** → `err('exercise-month-invalid')`; `rehydrate` idem (não confia no banco). **RED confirmado**: `ERR_MODULE_NOT_FOUND`
- [x] T005 ~~Estender `budget-result.test.ts`~~ → **movida para a Phase 3 (T012a)** — ver correção acima
- [x] T006 Registrar W0 RED no pipeline (`wave-start --agent tdd-strategist` → `wave-finish --outcome RED`)

### W1 — GREEN (mínimo)

- [x] T007 Criar `src/modules/budget-plans/domain/shared/exercise-month.ts`: branded `ExerciseMonth`, `parse`, `rehydrate`, erro `'exercise-month-invalid'` (EN kebab). **Zero throw, zero class** (§V). `Number.isInteger` já barra NaN/Infinity/fração
- [x] T008 ~~`month` no agregado~~ → **movida para a Phase 3 (T014a)** — ver correção acima
- [x] T009 W1 GREEN registrado — **6/6 pass · typecheck limpo** (a prova de que a fatia é isolável)

### W2/W3

- [x] T010 W2 code review (read-only, máx 3 rounds) → `004-code-review/REVIEW.md`
- [x] T011 W3 gate: `pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` + `pnpm test` — todos verdes; contagem de testes ≥ baseline (regressão zero, §II). `pipeline:state close BGP-MONTH-VO`

**Checkpoint**: `ExerciseMonth` existe e o agregado carrega `month`. Nada persiste ainda.

---

## Phase 3: User Story 1 — Orçar conta a conta, mês a mês (P1) 🎯 MVP

**Goal**: rodar o cálculo de uma conta para um mês específico e o valor ficar guardado naquele mês, sem sobrescrever os outros.

**Independent Test**: rodar o cálculo da mesma conta em dois meses diferentes, recarregar, e conferir que cada mês guardou o seu valor — sem colisão.

**Tickets**: `BGP-MONTH-PERSIST` (M) → `BGP-MONTH-HTTP` (S, parte de escrita).

### W0 — RED · persistência

- [x] T012a [US1] **(herdada da Phase 2)** Estender `tests/modules/budget-plans/domain/budget-result/budget-result.test.ts`: `create` exige `month` (CA3); mesma conta em meses distintos → entidades distintas (CA5); `clone` **preserva o mês**; 12 × R$ 3.670,92 = **R$ 44.051,04** (prova da P.O., #454). Deve falhar: `create` não aceita `month`
- [x] T012 [US1] Escrever `tests/modules/budget-plans/adapters/persistence/repos/budget-result-repository.drizzle-mysql.test.ts`: **(a)** recalcular o mesmo `(budget, subcategoria, month)` **atualiza** — segue 1 linha, `id` preservado, `value_cents`/`model` novos; **(b)** 12 meses coexistem; **(c)** `SUM(value_cents)` = valor × 12; **(d)** mês fora de 1..12 é barrado pelo CHECK. Deve falhar: não existe `month` nem `save`
- [x] T013 [P] [US1] Estender `tests/modules/budget-plans/adapters/persistence/repos/*.in-memory*` (ou o teste de paridade): in-memory replica a chave `(budgetId, subcategoryId, month)` e a semântica de upsert — **paridade in-memory ↔ drizzle**

### W1 — GREEN · persistência

- [x] T014a [US1] **(herdada da Phase 2)** Adicionar `month: ExerciseMonth` ao agregado em `src/modules/budget-plans/domain/budget-result/budget-result.ts` (`BudgetResult`, `CreateBudgetResultParams`, `create`) **e ao `clone`** (copia o mês da origem — clonar move de orçamento, nunca de mês). **Manter `model`**. ⚠️ Isto quebra **7 call sites** de uma vez (mapper, `add-budget-result`, 5 testes) — é esperado: a dimensão é obrigatória (CA4). Ajustá-los faz parte desta fatia
- [x] T014 [US1] Alterar `src/modules/budget-plans/adapters/persistence/schemas/mysql.ts` (bloco `bgp_budget_results`, ~:203-229): **+** `month: tinyint('month').notNull()`; **+** `check('bgp_budget_results_month_chk', sql\`${t.month} BETWEEN 1 AND 12\`)`; **+** `uniqueIndex('bgp_budget_results_budget_subcategory_month_uq').on(t.budgetId, t.subcategoryId, t.month)`; **−** `index('bgp_budget_results_budget_id_idx')`(**redundante** — o UNIQUE é índice de prefixo). Manter`subcategory_id_idx` e a ausência de FK
- [x] T015 [US1] Gerar a migration: `pnpm run db:generate:budget-plans` e versionar o arquivo. **NUNCA escrever à mão** (constituição §VI). Conferir o SQL emitido: `NOT NULL` sem default é seguro — zero linhas em todos os ambientes
- [x] T016 [US1] Atualizar `src/modules/budget-plans/adapters/persistence/mappers/budget-result.mapper.ts`: `budgetResultToInsert` inclui `month`; `budgetResultFromRow` faz `ExerciseMonth.rehydrate` e devolve `err('budget-result-corrupt')` se a row vier fora de 1..12
- [x] T017 [US1] Trocar `add` → `save` em `src/modules/budget-plans/domain/budget-result/repository.ts` (port) e nos **dois** adapters: `budget-result-repository.drizzle.ts` usa **`.onDuplicateKeyUpdate({ set: { valueCents, model } })`** (atômico; ADR-0020 permite; padrão já usado em `payable-view-store`/`supplier-view-store`); `budget-result-repository.in-memory.ts` faz o mesmo por chave composta

### W0/W1 — borda (escrita)

- [x] T018 [US1] Escrever `tests/modules/budget-plans/adapters/http/*.http.test.ts` (RED, via `fastify.inject`): POST nos 4 modelos com `month` → **201** com `month` no body; **400** para `month` 0/13/−1/3.5/ausente; **403** `budget-plan-not-editable` em plano Aprovado; repetir o POST **atualiza** (não duplica). ⚠️ **`personal-expenses` depende da clarification da 030 `:37`** — ver Bloqueios
- [x] T019 [US1] Adicionar `month: z.int().min(1).max(12)` a `budgetResultTargetSchema` em `src/modules/budget-plans/adapters/http/schemas.ts` (~:282). Os 4 POSTs herdam por `.extend()` — **não** tocar nos inputs de cada modelo. `z.int()`, **não** `z.coerce` (body é JSON)
- [x] T020 [US1] Propagar `month` em `src/modules/budget-plans/application/use-cases/add-budget-result.ts`: `+month` no command, `ExerciseMonth.parse` na validação, repassar ao `BudgetResult.create` e ao `repo.save`. Manter a sequência canônica (validar → fetch → domain → persist)
- [x] T021 [US1] Incluir `month` no DTO de saída (`budgetResultToDto`, `budgetResultResponseSchema`)

### Gates

- [x] T022 [US1] W2 code review dos dois tickets (máx 3 rounds cada) → `004-code-review/REVIEW.md`
- [x] T023 [US1] W3 gate + **validação com MySQL real** (OrbStack ou QA — x99 offline): a migration aplica, o UNIQUE existe (`SHOW INDEX ... LIKE '%month_uq'`), o upsert atualiza. `pipeline:state close` nos dois tickets

**Checkpoint**: 🎯 **MVP entregue.** Os 4 formulários de "Calculando Gastos" deixam de ser órfãos — cada um grava no mês para o qual foi rodado.

---

## Phase 4: User Story 2 — Ver o ano inteiro dividido por mês (P1)

**Goal**: o grid do exercício com as contas nas linhas e os meses nas colunas, com passador de mês.

**Independent Test**: com valores em vários meses e contas, abrir o grid e conferir que cada célula (conta, mês) mostra o valor certo e que os totais de linha/coluna fecham.

**Ticket**: `BGP-MONTH-HTTP` (S, parte de leitura).

- [x] T024 [US2] Escrever o teste RED da leitura em `tests/modules/budget-plans/adapters/http/*.http.test.ts`: `GET /budget-plans/budget-results/by-budget/:budgetId` devolve `month` em cada item; `?month=3` filtra; `?month=banana` → **400**
- [x] T025 [US2] Devolver `month` em `src/modules/budget-plans/application/use-cases/get-budget-results.ts` (a soma `Money.add` já existe e passa a totalizar o ano — não duplicar a lógica na borda)
- [x] T026 [US2] Aceitar `?month=` opcional na query da rota `by-budget` em `src/modules/budget-plans/adapters/http/plugin.ts` (~:505) com `z.coerce.number().int().min(1).max(12)` — `z.coerce` **aqui sim** (query é string), seguindo `listBudgetPlansQuerySchema`
- [x] T027 [US2] W2 + W3 do `BGP-MONTH-HTTP`; `pipeline:state close`

> **Sem paginação e sem filtro obrigatório**: o grid é **por rede** → pior caso realista ≈ **1.9k itens** (158 subcategorias × 12). Uma ida traz o ano e o **passador de mês é client-side** (research §D4).

**Checkpoint**: a tela de Orçamento deixa de ser placeholder.

---

## Phase 5: User Story 3 — Totais anuais consistentes (P2)

**Goal**: as visões que já mostram o anual (por Rede, Consolidado, Planejado do Insight) refletem a soma dos meses, sem divergir entre telas.

**Independent Test**: informar valores mensais e conferir que o anual apresentado em cada visão é a soma exata dos meses.

- [x] T028 [US3] Teste de não-regressão do total — **coberto pelo CA6 do `BGP-MONTH-HTTP`**: `GET by-budget` com 12 meses devolve `totalInCents` = **4.405.104** (prova da P.O., #454). A soma vive no domínio (`Money.add`), não na borda
- [x] T029 [P] [US3] Consolidado ABC (#319) e Insight (#416) **não regridem** com 12 linhas por conta — suíte completa verde (4076 testes, 0 falhas). Nenhum consumidor assumia "1 linha por (budget, subcategoria)"
- [x] T030 [US3] ⚠️ **Investigado — divergência CONFIRMADA e registrada na issue #458** (não corrigida aqui, sem scope-creep): `BudgetPlan.total` soma o `valueInCents` **informado** no `POST /budgets`; `getBudgetResults.total` soma os lançamentos **calculados**. São fontes independentes, sem invariante ligando — "Por Rede" e "Calculando Gastos" podem mostrar números diferentes. Viola o FR-007/SC-002. **Pré-existente**; o #413 tornou evidente. Exige decisão da P.O. (total derivado × teto)

**Checkpoint**: FR-007 e SC-002 verificados — uma fonte por número, sem divergência entre telas.

---

## Phase 6: Polish & dívida documental

- [x] T031 [P] Atualizar `specs/030-budget-plans-reproducao/spec.md:74` (Success Criteria): paridade de **fórmula** continua exigida; paridade de **grão** foi **abandonada** (FR-013 — o legado orça em categoria × mês, esta feature em subcategoria × mês). **O `FR-003` fica INTACTO** — o FR-008 preserva o cálculo como fonte única
- [x] T032 [P] Anotar em `specs/030-budget-plans-reproducao/spec.md:37` que a clarification (folha × qtd) **voltou a ser bloqueante** por causa desta feature, com link para [research.md §D6](./research.md)
- [x] T033 **Quickstart ponta a ponta EXECUTADO** contra MySQL 8.4 real (2026-07-15): plano → estrutura → orçamento Rede CE → 12 meses → grid → `?month=3` → recálculo → reabertura. **Todas as 8 provas verdes**, incluindo a da P.O. (12 × R.670,92 = **R.051,04**) e as 12 linhas exatas no banco após recálculo. Registrado no PR #459
- [x] T034 **PR #459 aberto** para `dev`, referenciando #413 e #454 — registra que os 4 formulários de "Calculando Gastos" deixaram de ser órfãos

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
