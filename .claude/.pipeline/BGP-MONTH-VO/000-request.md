# BGP-MONTH-VO — escopo (#413)

> VO `ExerciseMonth` (mês do exercício, 1..12). **Só o VO.**
> Size **S**. Branch `feat/413-budget-plans-monthly`. Fatia **1 de 3** da feature 036 (Orçamento mensal).
> Tasks T004–T011 de [`specs/036-budget-plans-monthly/tasks.md`](../../../specs/036-budget-plans-monthly/tasks.md).

## ⚠️ Escopo corrigido durante o W1 (2026-07-15)

O escopo original incluía **`month` no agregado `BudgetResult`**. **Não é isolável** — o typecheck provou:

```
budget-result.mapper.ts(42,3): error TS2322 — falta 'month'
add-budget-result.ts(56,40):   error TS2345 — falta 'month'
+ 5 testes (suite, remove-budget-atomic, delete-budget, get-plan-export, start-calibration)
```

O `budgetResultFromRow` monta o agregado **a partir da row**: com `month` obrigatório, ele precisa da **coluna**, que só existe em `BGP-MONTH-PERSIST`. É **mudança de assinatura transversal** — o mesmo padrão da lição do #373.

**Decisão:** o `month` no agregado (+ o teste dele) **desce para `BGP-MONTH-PERSIST`**, junto do schema/mapper/repo que o exigem. Alternativas rejeitadas: `month` opcional ou default no mapper (gambiarra que fura o CA4 e o FR-005); deixar o typecheck vermelho entre fatias (**viola** o gate W3 e a política de regressão zero, §II).

Esta fatia entrega **o VO isolado**, que é genuinamente independente e fecha W0→W3 verde sozinho.

## Contexto

`grep month src/modules/budget-plans/` retorna **zero**: a dimensão não existe em nenhuma camada. Esta fatia introduz o conceito **no domínio**, e só nele — nada persiste nem trafega ainda (isso é `BGP-MONTH-PERSIST` e `BGP-MONTH-HTTP`).

**Decisão da P.O.** (spec 036, via #454): o orçado é lançado **mês a mês** — _"o mensal é a ENTRADA; o anual é o RESULTADO"_ (soma dos 12). O grão é **rede × subcategoria × mês**.

**Mudança aditiva:** o `BudgetResult` **não muda de natureza** — segue sendo o resultado do cálculo server-side (o `FR-003` da spec 030 fica intacto). Ganha uma dimensão na identidade.

## Escopo

### 1. VO novo — `src/modules/budget-plans/domain/shared/exercise-month.ts`

| Aspecto | Definição |
| :--- | :--- |
| Branded type | `ExerciseMonth = number & { readonly __brand: 'ExerciseMonth' }` |
| Faixa | inteiro **1..12** (ano civil — Assumption da spec 036) |
| Erro | `'exercise-month-invalid'` (EN kebab-case) |
| API | `parse(raw: number): Result<ExerciseMonth, ExerciseMonthError>` · `rehydrate(raw: number): Result<...>` (row → domínio) |

**Por que VO e não `number` cru:** o FR-005 exige rejeitar mês fora do exercício, e a regra é de **domínio**. O branded type impede passar um `number` qualquer onde se espera mês.

## Critérios de aceite

- [x] **CA1** — **Dado** `raw` inteiro em 1..12, **Quando** `ExerciseMonth.parse(raw)`, **Então** `ok` com o valor branded.
- [x] **CA2** — **Dado** `raw` ∈ {`0`, `13`, `-1`, `99`, `3.5`, `NaN`, `±Infinity`}, **Quando** `parse(raw)`, **Então** `err('exercise-month-invalid')`. **Nunca throw.**
- [x] **CA6** — **Dado** `rehydrate` com valor fora de 1..12 (row corrompida), **Quando** chamado, **Então** `err('exercise-month-invalid')` — o domínio rejeita estado inválido vindo do banco, mesmo com o CHECK do MySQL no lugar.

> **CA3 · CA4 · CA5** (agregado carrega o mês · `create` sem `month` é erro de tipo · meses distintos = entidades distintas) **movidos para `BGP-MONTH-PERSIST`** — ver "Escopo corrigido" acima.

## Fora de escopo

- **`month` no agregado `BudgetResult`** → **`BGP-MONTH-PERSIST`** (inseparável do schema/mapper)
- Schema/migration/`UNIQUE`/upsert → **`BGP-MONTH-PERSIST`**
- `month` no contrato HTTP e nos use cases → **`BGP-MONTH-HTTP`**
- **Um único arquivo de produção** é criado: `domain/shared/exercise-month.ts`. Nada mais é tocado.

## Invariantes

- Domínio **puro funcional**: zero `class`, zero `throw`, `Result<T,E>`, branded type, `Readonly` (constituição §V · `.claude/rules/domain.md`).
- Erros internos **EN kebab-case**; código EN; docs PT.
- `import type` para tipos; extensão `.ts` nos imports relativos.
- Regressão zero: a suíte do budget-plans segue verde; contagem ≥ baseline.

## Waves

| Wave | Agente/Skill | Saída |
| :--- | :--- | :--- |
| **W0** | `tdd-strategist` | `002-tests/REPORT.md` — RED por inexistência da API |
| **W1** | `ts-domain-modeler` | `003-impl/REPORT.md` — mínimo até GREEN |
| **W2** | `code-reviewer` | `004-code-review/REVIEW.md` — read-only, máx 3 rounds |
| **W3** | `ts-quality-checker` | `005-quality/REPORT.md` — typecheck + format + lint + test |
