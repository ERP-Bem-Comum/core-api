# W0 — Testes RED · BGP-MONTH-VO (#413)

**Agente/Skill:** `tdd-strategist` · **Outcome:** **RED** · **Data:** 2026-07-15

## Suítes escritas

| Arquivo | Cobre |
| :--- | :--- |
| `tests/modules/budget-plans/domain/shared/exercise-month.test.ts` (**novo**) | CA1, CA2, CA6 |
| `tests/modules/budget-plans/domain/budget-result/budget-result.test.ts` (**estendido**) | CA3, CA5 + `clone` |

## RED — falha por inexistência da API (não por asserção)

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '.../src/modules/budget-plans/domain/shared/exercise-month.ts'
  imported from '.../tests/modules/budget-plans/domain/shared/exercise-month.test.ts'
  code: 'ERR_MODULE_NOT_FOUND'

Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '.../src/modules/budget-plans/domain/shared/exercise-month.ts'
  imported from '.../tests/modules/budget-plans/domain/budget-result/budget-result.test.ts'
  code: 'ERR_MODULE_NOT_FOUND'
```

**É o RED correto:** o módulo não existe. Não há implementação parcial nem asserção frouxa passando por acidente.

## Cobertura por critério de aceite

| CA | Teste | Estado |
| :-- | :--- | :--- |
| **CA1** — 1..12 válido | `parse` aceita os 12 meses (loop) | RED |
| **CA2** — fora da faixa → erro | `0`, `13`, `-1`, `99`; `3.5` (não-inteiro); `NaN`, `±Infinity` → `err('exercise-month-invalid')`, **sem throw** | RED |
| **CA3** — agregado carrega `month` | `create` com `month: 3` → `r.value.month === 3` | RED |
| **CA4** — `create` sem `month` é erro de tipo | **compilador** (`typecheck` no W3) — o campo é obrigatório, não opcional | W3 |
| **CA5** — meses distintos, entidades distintas | mesma conta em março/abril → ids e valores independentes | RED |
| **CA6** — `rehydrate` rejeita row corrompida | `0`, `13`, `-5`, `2.5` → erro (não confia no banco) | RED |

## Testes além dos CAs (justificados)

- **Prova da P.O. (#454):** 12 × R$ 3.670,92 = **R$ 44.051,04**. Ancora no domínio a regra _"o mensal é a ENTRADA; o anual é o RESULTADO"_ e vira rede de segurança para o SC-005.
- **`clone` preserva o mês:** o `clone` (US4/#318, derivação de plano filho) copia campo a campo — sem este teste, o `month` seria esquecido silenciosamente ao clonar.

## Decisões de teste

- **Helper `month(raw)`** nas fixtures: o VO já é coberto pela sua própria suíte; no agregado o foco é a dimensão. O `throw` no helper é **de fixture inválida**, não do domínio — permitido em `tests/**` (`.claude/rules/testing.md`).
- **Sem mock/stub:** domínio puro, funções sobre dados. Nada a duplicar.
- **Casos de fronteira explícitos** (`0`/`13`) em vez de só "inválido genérico" — é onde o off-by-one mora.

## Próxima wave

**W1** — `ts-domain-modeler`: criar `exercise-month.ts` (branded + smart constructor + `Result`) e acrescentar `month` ao `BudgetResult` (`create` e `clone`). **Mínimo até GREEN**, nada além.
