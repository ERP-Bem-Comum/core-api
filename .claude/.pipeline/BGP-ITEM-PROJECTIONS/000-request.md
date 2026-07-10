# BGP-ITEM-PROJECTIONS — escopo

> Issues **#372** + **#373** (batch — mesmo GET, campos já carregados no agregado). Módulo **`budget-plans`**. Size **S**.

## Contexto
No item de `GET /budget-plans`, dois dados já presentes no agregado não são projetados no DTO:
- **#372** — `partnersCount` + `networkKind` (rede) por item.
- **#373** — `updatedByRef` (auditoria "atualizado por") — hoje só `updatedAt`.

Ambos são **projeção de dado já carregado** (sem nova query pesada, sem nova migration).

## Escopo (in)
1. Projetar `partnersCount` e `networkKind` no item de lista (#372).
2. Projetar `updatedByRef` no plano (#373), ao lado de `updatedAt`.
3. Atualizar DTO + response schema strict; garantir back-compat (campos aditivos).

## Fora de escopo
- Novo cálculo de contagem que exija join/agregação extra não disponível no agregado.
- Endpoint de detalhe (só o item de lista + plano).

## Critérios de aceite
- **CA1** Item de `GET /budget-plans` expõe `partnersCount` (número) e `networkKind` (#372).
- **CA2** Plano expõe `updatedByRef` (id de quem atualizou) além de `updatedAt` (#373); nunca atualizado → null coerente.
- **CA3** Response validado contra schema; adição não quebra consumidores atuais.

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
Gate W3 verde. Campos projetados no GET. Fecha #372 e #373.
