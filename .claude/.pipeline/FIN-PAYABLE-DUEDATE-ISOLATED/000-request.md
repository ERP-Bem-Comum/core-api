# FIN-PAYABLE-DUEDATE-ISOLATED — escopo

> Issue **#270** — `alterar vencimento de UM título (payable) isolado — sem propagar pai↔filhos`. Módulo **`financial`**. Size **M**.

## Contexto
Hoje editar o vencimento no documento propaga para todos os títulos/impostos (comportamento de `editMetadata`). A P.O. quer alterar o `dueDate` de **um único payable** sem afetar o pai nem os demais filhos/impostos.

## Escopo (in)
1. Domínio: regra que permite mutar o `dueDate` de **um** payable sem propagação pai↔filhos (invariante de não-propagação explícita).
2. Endpoint `PATCH /documents/:id/payables/:payableId { dueDate }` (ou parar a propagação no fluxo de `editMetadata`, o que for coeso com o agregado).
3. Preservar integridade: alterar o filho não recalcula/reescreve o vencimento do pai nem dos irmãos.

## Fora de escopo
- Alterar valor/rateio do título (só `dueDate`).
- Conciliação / contrapartida (#269).

## Critérios de aceite
- **CA1** `PATCH /documents/:id/payables/:payableId { dueDate }` altera **só** aquele título; pai e demais filhos/impostos inalterados.
- **CA2** `dueDate` inválido (formato/regra de negócio) → erro de borda EN kebab, não 500.
- **CA3** `:id`/`:payableId` inexistente ou não-pertencente → erro adequado (404/domínio).

## Pipeline (agentes por wave)
| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED (não-propagação CA1 + validações) | skill **`tdd-strategist`** |
| W1 | regra de domínio + borda | skill **`ts-domain-modeler`** + agente **`drizzle-orm-expert`** + **`fastify-server-expert`** ↔ **`zod-expert`** |
| W2 | audit read-only | skill **`code-reviewer`** |
| W3 | gate + `test:integration` (x99) | skill **`ts-quality-checker`** |

## Research (agentes + MCPs)
- **`Explore`** sobre `editMetadata` e o agregado `Document`/payables em `src/modules/financial/`.
- **`acdg-skills`** (MCP): invariante de agregado / propagação pai↔filho (DDD tático).
- **`mcp__security`**: autorização do PATCH (RBAC).

## DoD
Gate W3 verde. Vencimento individual sem propagação. Fecha #270.
