# W1 — Implementação GREEN · BGP-MONTH-VO (#413)

**Agente/Skill:** `ts-domain-modeler` · **Outcome:** **GREEN** · **Data:** 2026-07-15

## Entregue

**Um único arquivo de produção:** `src/modules/budget-plans/domain/shared/exercise-month.ts` (20 linhas).

```ts
export type ExerciseMonth = Brand<number, 'ExerciseMonth'>;
export type ExerciseMonthError = 'exercise-month-invalid';

const isWithinExercise = (raw: number): boolean =>
  Number.isInteger(raw) && raw >= FIRST && raw <= LAST;

export const parse = (raw: number): Result<ExerciseMonth, ExerciseMonthError> => ...
export const rehydrate = (raw: number): Result<ExerciseMonth, ExerciseMonthError> => parse(raw);
```

## Resultado

```
ℹ tests 6 · pass 6 · fail 0        (exercise-month.test.ts)
$ tsc --noEmit                      (sem erros)
```

## ⚠️ Escopo corrigido durante esta wave — o `month` no agregado desceu para `BGP-MONTH-PERSIST`

O escopo original mandava também acrescentar `month` ao agregado `BudgetResult`. Foi implementado, e **o typecheck reprovou**:

```
budget-result.mapper.ts(42,3): error TS2322 — Result<{...sem month}> não atribuível a Result<{...com month}>
add-budget-result.ts(56,40):   error TS2345 — falta 'month' no argumento
tests/.../budget-result-repository.suite.ts(24,33)      — idem
tests/.../remove-budget-atomic.drizzle-mysql.test.ts(112,41) — idem
tests/.../delete-budget.test.ts(72,39)                  — idem
tests/.../get-plan-export.test.ts(130,9): TS2741        — Property 'month' is missing
tests/.../start-calibration.test.ts(101,35)             — idem
```

**Causa-raiz:** `budgetResultFromRow` (`mappers/budget-result.mapper.ts:25-49`) monta o agregado **a partir da row do banco**. Com `month` obrigatório, ele **precisa da coluna** — que só existe em `BGP-MONTH-PERSIST`. É **mudança de assinatura transversal**: 2 arquivos de produção + 5 de teste.

**Decisão:** reverter o agregado nesta fatia (`git checkout` em `budget-result.ts` e no seu teste) e **mover `month` no agregado + CA3/CA4/CA5 para `BGP-MONTH-PERSIST`**, onde vive junto do schema/mapper/repo que o exigem.

**Alternativas rejeitadas:**

| Alternativa | Por que não |
| :--- | :--- |
| `month` **opcional** no agregado | Gambiarra: fura o CA4 e o FR-005 (a dimensão é obrigatória por regra de negócio); "opcional agora, obrigatório depois" nunca vira depois |
| **Default** no mapper (ex.: `month = 1`) | Inventa dado que ninguém informou — o mesmo vício que a spec 036 rejeitou no FR-009 |
| Deixar o **typecheck vermelho** entre fatias | **Viola** o gate W3 e a política de regressão zero (constituição §II). Fatia que não fecha verde não é fatia |

**Lição:** o fatiamento por camada não isola **mudança de assinatura de agregado** — o tipo vaza para todos os call sites de uma vez. É a mesma lição do #373, registrada em `release-404-bloco-a-budget-plans-done`. O plano (`plan.md` §"Estimativa de Pipeline") e o `tasks.md` foram corrigidos.

## Decisões de implementação

- **`Number.isInteger` sozinho** já barra `NaN`, `±Infinity` e fração — sem guarda extra. Menos código, mesma garantia.
- **`rehydrate` delega a `parse`**: a regra é idêntica (o domínio não confia no banco, mesmo com o CHECK). Duas portas, uma regra — sem duplicar a condição.
- **`FIRST`/`LAST` como constantes nomeadas**, não literais no meio da expressão: o exercício é o ano civil (Assumption da spec 036) e isso fica explícito.
- **Sem `generate()`** (diferente do `budget-id.ts`): mês não se gera, se informa.
- Padrão D (module-as-namespace), igual aos VOs vizinhos: `import * as ExerciseMonth`.

## Conformidade

| Regra | Estado |
| :--- | :--- |
| Zero `throw`, zero `class`, `Result<T,E>` | ✅ |
| Branded type + smart constructor | ✅ |
| Erro EN kebab-case (`exercise-month-invalid`) | ✅ |
| `import type` + extensão `.ts` | ✅ |
| Nenhum arquivo fora de `domain/shared/` tocado | ✅ |
| Regressão zero | ✅ typecheck limpo; suíte do módulo intacta |

## Próxima wave

**W2** — `code-reviewer` (read-only, máx 3 rounds).
