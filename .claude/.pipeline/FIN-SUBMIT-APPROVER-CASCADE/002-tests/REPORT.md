# W0 — RED · FIN-SUBMIT-APPROVER-CASCADE

Skill: **`tdd-strategist`**. Runner: `node --test --experimental-strip-types`.

## Arquivo

`tests/modules/financial/application/use-cases/submit-draft-cascade.test.ts` (novo) — espelha `save-document-cascade.test.ts` (assertions de cascata) + `submit-draft-approver-limit.test.ts` (seed do Draft).

## Resultado

| CA | Teste | Estado | Motivo |
| :-- | :-- | :-- | :-- |
| CA1 | indicado insuficiente + outro apto → efetivo + `ApproverEscalated` | ✖ RED | submit hoje só bloqueia (`approver-limit-exceeded`); não escala nem emite evento |
| CA2 | nenhum apto (>1) → `no-approver-with-sufficient-limit`; fica Draft | ✖ RED | hoje retorna `approver-limit-exceeded` (POLICY), não o erro da cascata |
| CA3 | indicado já suficiente → submete sem escalar | ✔ GREEN | guard de regressão (caminho atual preservado) |

**2 RED + 1 GREEN.** O GREEN (CA3) trava o não-regressão do caminho feliz. W1 leva CA1/CA2 a GREEN sem quebrar CA3 nem o create.
