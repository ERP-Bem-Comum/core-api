# BGP-ITEM-PROJECTIONS — escopo

> Issue **#372** (projeção de dado já carregado no agregado). Módulo **`budget-plans`**. Size **S**.
>
> **CORREÇÃO DE ESCOPO (2026-07-12):** o **#373** (`updatedByRef`) foi **REMOVIDO** deste ticket. `updatedByRef`/`updated_by` NÃO existe no agregado `BudgetPlan` nem na tabela (`grep` confirmou) — não é "dado já carregado", é auditoria que exige **migration** (coluna `updated_by`) + **captura do ator** em toda mutação (create/scenery/calibration/approve) + campo no agregado. Fora do escopo "sem migration" de um ticket S. **#373 vira ticket próprio** (`BGP-UPDATED-BY-AUDIT`, size M+, com migration).

## Contexto
No item de `GET /budget-plans`, dados já presentes no agregado (`plan.budgets`) não são projetados no DTO:
- **#372** — `partnersCount` (= `plan.budgets.length`) + `networkKind` (de `plan.budgets[].partner.kind`) por item.

É **projeção de dado já carregado** (o `toItem` já carrega `budgets[]` para calcular `totalInCents` e os descarta) — sem query nova, sem migration.

## Escopo (in)
1. Projetar `partnersCount` e `networkKind` no item de lista (#372).
2. Projetar `updatedByRef` no plano (#373), ao lado de `updatedAt`.
3. Atualizar DTO + response schema strict; garantir back-compat (campos aditivos).

## Fora de escopo
- Novo cálculo de contagem que exija join/agregação extra não disponível no agregado.
- Endpoint de detalhe (só o item de lista + plano).

## Critérios de aceite
- **CA1** Item de `GET /budget-plans` expõe `partnersCount` (número = qtd de budgets) por item.
- **CA2** Item expõe `networkKind` derivado de `plan.budgets[].partner.kind`: só `state` → `'state'`; só `municipality` → `'municipality'`; ambos os tipos → `'mixed'`; sem budgets → `null`.
- **CA3** Response validado contra schema; adição é aditiva (não quebra consumidores atuais).

## Pipeline (agentes por wave)
| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED (projeção CA1 + CA2) | skill **`tdd-strategist`** |
| W1 | mapear agregado→DTO + schema | agente **`zod-expert`** + **`fastify-server-expert`** |
| W2 | audit read-only | skill **`code-reviewer`** |
| W3 | gate | skill **`ts-quality-checker`** |

## Research (agentes + MCPs)
- **`Explore`** sobre o mapper de `GET /budget-plans` (confirmar que `partnersCount`/`networkKind`/`updatedByRef` já vêm do agregado).

## DoD
Gate W3 verde. `partnersCount` + `networkKind` projetados no item do GET. **Fecha #372.** O #373 (`updatedByRef`) fica aberto e será tratado em ticket próprio `BGP-UPDATED-BY-AUDIT` (migration + captura do ator).
