# W0 — RED · FIN-PAYABLE-ACCOUNT-ACTIVE

Skill: **`tdd-strategist`**. Runner: `node --test --experimental-strip-types`.

## Arquivos

| Arquivo | Camada | CAs |
| :-- | :-- | :-- |
| `tests/.../use-cases/list-cedente-accounts-with-balance.test.ts` (estendido) | application | CA1, CA2 |
| `tests/.../use-cases/save-document-account-active.test.ts` (novo) | application | CA4, CA5 |
| `tests/.../http/payable-account-active.http.test.ts` (novo) | adapter HTTP | CA3, CA6 |

## Resultado (esperado: novo comportamento RED, regressão GREEN)

| CA | Teste | Estado | Motivo |
| :-- | :-- | :-- | :-- |
| CA1 | onlyActive=true exclui Closed | ✖ RED | `2 !== 1` — filtro ainda não existe |
| CA2 | sem flag mantém todas (compat) | ✔ GREEN | guard de regressão (comportamento atual preservado) |
| CA3 | `?status=active` omite encerradas | ✖ RED | querystring/filtro ainda não existe |
| CA4 | save c/ conta Closed → err | ✖ RED | `false !== true` — guard ainda não existe |
| CA5 | save c/ conta Active → ok | ✔ GREEN | caminho atual já funciona (não regride) |
| CA6 | POST documento conta encerrada → 422 | ✖ RED | `201 !== 422` — guard ainda não existe |

**4 RED + 2 GREEN.** Os dois GREEN são intencionais: travam o requisito de backward-compat (CA2: listagem geral mantém `Closed`) e de não-regressão do caminho feliz (CA5: conta ativa segue). W1 deve levar os 4 RED a GREEN sem quebrar os 2 GREEN.
