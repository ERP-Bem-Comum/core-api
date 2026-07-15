# BGP-MONTH-PERSIST — escopo (#413)

> A dimensão **mês** no agregado `BudgetResult` e na persistência: coluna, CHECK, **UNIQUE** e **upsert idempotente**.
> Size **M**. Branch `feat/413-budget-plans-monthly`. Fatia **2 de 3** da feature 036 (Orçamento mensal).
> Tasks T012–T017 (+ **T012a/T014a**, herdadas da fatia 1) de [`specs/036-budget-plans-monthly/tasks.md`](../../../specs/036-budget-plans-monthly/tasks.md).

## Contexto

A fatia 1 (`BGP-MONTH-VO`, closed-green) entregou o VO `ExerciseMonth`. Esta fatia leva o mês **ao agregado e ao banco**.

**Herdado da fatia 1 (o typecheck provou que é inseparável daqui):** o `month` no agregado arrasta **7 call sites**, porque o `budgetResultFromRow` monta o agregado **a partir da row** — sem a coluna, não há de onde tirar o mês. Por isso agregado + schema + mapper + repo andam **juntos**, nesta fatia.

## 🔴 Achado que esta fatia corrige (bug pré-existente, não introduzido pelo mês)

Medido no código:

```ts
// application/use-cases/add-budget-result.ts:56-66 — SEMPRE gera id novo, SEMPRE insere
const result = BudgetResult.create({ id: BudgetResultId.generate(), … });
await deps.budgetResultRepo.add(result.value);

// adapters/persistence/repos/budget-result-repository.drizzle.ts:32-35 — INSERT puro
add: async (result) => safe('add', async () => {
  await db.insert(schema.budgetResults).values(budgetResultToInsert(result));
}),
```

E o schema **não tem nenhum `uniqueIndex`** — só `budget_id_idx` e `subcategory_id_idx` (`schemas/mysql.ts:225-227`). O repo **não tem update**: só `add`, `listByBudgetId`, `deleteByBudgetId`.

**Consequência hoje:** recalcular o mesmo `(budget, subcategoria)` grava **duas linhas** com ids diferentes → `listByBudgetId` devolve as duas → **o total por Rede conta em dobro**. Nunca estourou porque **nenhum ambiente tem plano** (causa: #374).

**Não é scope-creep:** a chave que o mês exige — `(budget_id, subcategory_id, month)` — **contém** o par hoje desprotegido. Corrigir junto é consequência da modelagem correta; separar exigiria migrar a mesma tabela duas vezes.

## Escopo

### 1. Agregado (herdado da fatia 1) — `domain/budget-result/budget-result.ts`

- `+ month: ExerciseMonth` em `BudgetResult` e `CreateBudgetResultParams`; `create` repassa.
- **`clone` copia o mês da origem** — clonar move o lançamento de orçamento, **nunca de mês**.
- **`model` PERMANECE** — segue descrevendo como o valor foi produzido.
- Ajustar os **7 call sites** que o compilador acusar (mapper, `add-budget-result`, 5 testes). Esperado: é o CA4 em ação.

### 2. Schema — `adapters/persistence/schemas/mysql.ts` (~:203-229)

| Mudança | Detalhe |
| :--- | :--- |
| **+ coluna** | `month: tinyint('month').notNull()` — 1..12 cabe em 1 byte. **Sem default**: greenfield (zero linhas em todos os ambientes) |
| **+ CHECK** | `bgp_budget_results_month_chk`: `month BETWEEN 1 AND 12` — sem ENUM nativo (ADR-0020) |
| **+ UNIQUE** | `bgp_budget_results_budget_subcategory_month_uq` em `(budget_id, subcategory_id, month)` |
| **− índice** | `bgp_budget_results_budget_id_idx` — **redundante**: o UNIQUE é índice de prefixo para `WHERE budget_id = ?` |
| **= índice** | `subcategory_id_idx` permanece (query "por subcategoria", CA3 do #317) |
| **= sem FK** | mantido — `bgp_budgets`/`bgp_subcategories` são replace-all; refs por identidade |

### 3. Migration

`pnpm run db:generate:budget-plans` e versionar. **NUNCA escrever à mão** (constituição §VI). Conferir o SQL emitido.

### 4. Mapper — `adapters/persistence/mappers/budget-result.mapper.ts`

- `budgetResultToInsert`: inclui `month`.
- `budgetResultFromRow`: `ExerciseMonth.rehydrate(row.month)` → `err('budget-result-corrupt')` se fora de 1..12.

### 5. Port + repos — `add` → `save` (upsert)

- Port `domain/budget-result/repository.ts`: `add` → **`save`** (a semântica deixa de ser "acrescentar").
- **Drizzle**: `.onDuplicateKeyUpdate({ set: { valueCents, model } })` — atômico (sem race entre SELECT e INSERT), **permitido** por ADR-0020, e já padrão no projeto (`payable-view-store`, `supplier-view-store`, `cedente-account-store`, `amendment-repository`).
- **In-memory**: mesma semântica, chave `(budgetId, subcategoryId, month)` — **paridade** com o drizzle.
- **Recálculo preserva o `id`** da linha existente; sobrescreve `value_cents` e `model`.

## Critérios de aceite

- [ ] **CA1** — **Dado** um `(budget, subcategoria, mês)` sem lançamento, **Quando** `save`, **Então** insere 1 linha.
- [ ] **CA2** — **Dado** um lançamento já existente para `(budget, subcategoria, mês)`, **Quando** `save` com outro valor, **Então** **atualiza** — segue **1 linha**, `id` **preservado**, `value_cents`/`model` novos. **Não duplica.**
- [ ] **CA3** — **Dado** a mesma conta em 12 meses, **Quando** salvos, **Então** coexistem **12 linhas** e `SUM(value_cents)` = valor × 12 (prova da P.O.: 3.670,92 × 12 = **4.405.104** centavos).
- [ ] **CA4** — **Dado** um `INSERT` direto com `month` fora de 1..12, **Quando** executado no MySQL real, **Então** o **CHECK rejeita**.
- [ ] **CA5** — **Dado** uma row com `month` corrompido (fora de 1..12), **Quando** `budgetResultFromRow`, **Então** `err('budget-result-corrupt')` — o domínio não confia no banco.
- [ ] **CA6** — **Dado** `create` sem `month`, **Quando** compilado, **Então** **erro de tipo** (herdado: CA4 da fatia 1).
- [ ] **CA7** — **Dado** dois results com mesmo `(budgetId, subcategoryId)` e meses diferentes, **Quando** criados, **Então** entidades **distintas** (herdado: CA5 da fatia 1).
- [ ] **CA8** — **Dado** um lançamento com mês, **Quando** `clone` para outro orçamento, **Então** o **mês é preservado**.
- [ ] **CA9** — **Dado** a suíte in-memory e a drizzle, **Quando** rodadas, **Então** **paridade** — mesma semântica de upsert nos dois adapters.

## Fora de escopo

- `month` no contrato HTTP, no command do use case e na leitura do grid → **`BGP-MONTH-HTTP`**
- Nenhum evento novo de outbox (`bgp_outbox` só publica `BudgetPlan`).
- Nenhuma migração de dado (US4 retirada — zero planos).

## Invariantes

- Money em centavos (bigint); sem JSON nativo, sem ENUM nativo, sem trigger/proc (ADR-0020).
- Prefixo `bgp_*` (ADR-0014); sem FK cross-agregado replace-all.
- Domínio puro; mapper devolve `Result` (adapters.md).
- Regressão zero: baseline **4062** testes, 0 falhas.

## Waves

| Wave | Agente/Skill | Saída |
| :--- | :--- | :--- |
| **W0** | `tdd-strategist` | `002-tests/REPORT.md` — RED |
| **W1** | `drizzle-schema-author` (schema/migration) + `ts-domain-modeler` (agregado) | `003-impl/REPORT.md` |
| **W2** | `code-reviewer` | `004-code-review/REVIEW.md` — máx 3 rounds |
| **W3** | `ts-quality-checker` | `005-quality/REPORT.md` + **validação em MySQL real** |

> ⚠️ **x99 offline** → validar no **OrbStack local** (`core-api-mysql`, healthy). **`pnpm test:integration:*` DESTRÓI a infra dev** (`down -v` + troca de secrets) — usar o container avulso já de pé.
