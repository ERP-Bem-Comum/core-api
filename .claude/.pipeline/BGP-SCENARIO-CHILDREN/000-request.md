# BGP-SCENARIO-CHILDREN — escopo

> Issue **#401** — `expor GET /budget-plans/:id/children (listar cenários/versões)`. Módulo **`budget-plans`**. Size **S**.

## Contexto
Um cenário/versão criado a partir de um plano fica **invisível** — não há endpoint para listar os filhos (cenários/versões) de um plano. Front precisa da listagem para exibir o que foi criado.

## Escopo (in)
1. Use case de leitura: dado `:id` de plano, listar seus **cenários/versões** (filhos) via read-model/repo existente.
2. Endpoint `GET /budget-plans/:id/children` (DTO + response schema).
3. Ordenação e campos mínimos coerentes com o que o front consome (id, rótulo do cenário/versão, datas, estado).

## Fora de escopo
- Criação/edição de cenário (já existe).
- Projeções extras no item de lista (#372/#373 → `BGP-ITEM-PROJECTIONS`).

## Critérios de aceite
- **CA1** `GET /budget-plans/:id/children` → lista os cenários/versões do plano `:id`; plano sem filhos → lista vazia coerente (200).
- **CA2** `:id` inexistente → erro de borda adequado (404/domínio), não 500.
- **CA3** Response validado contra schema strict; ordenação determinística.

## Pipeline (agentes por wave)
| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED (lista filhos CA1 + CA2) | skill **`tdd-strategist`** |
| W1 | use case de leitura + borda | skill **`ports-and-adapters`** + agente **`drizzle-orm-expert`** + **`fastify-server-expert`** ↔ **`zod-expert`** |
| W2 | audit read-only | skill **`code-reviewer`** |
| W3 | gate + validação x99 | skill **`ts-quality-checker`** |

## Research (agentes + MCPs)
- **`Explore`** sobre o agregado/relacionamento plano→cenário em `src/modules/budget-plans/`.
- **`mysql-database-expert`**: índice de cobertura para o filtro por `parentId`/plano.

## DoD
Gate W3 verde. Cenários criados ficam visíveis via endpoint. Fecha #401.
