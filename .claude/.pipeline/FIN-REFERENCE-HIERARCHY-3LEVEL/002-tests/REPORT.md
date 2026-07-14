# W0 — RED · FIN-REFERENCE-HIERARCHY-3LEVEL (#341)

> Outcome: RED · Skill `tdd-strategist` · Módulo `financial`.

## Testes (novos, no arquivo existente)
`tests/modules/financial/domain/category/category.test.ts` — bloco "costCenterId (hierarquia 3 níveis · #341)":
- **CA1** `Category.create({..., costCenterId})` → `category.costCenterId` = o centro de custo.
- **CA3** `create` sem costCenterId → `costCenterId: null` (back-compat).

## Prova de RED
Ambos falham por inexistência de `costCenterId` no domínio `Category` (create input + type). W1: add `costCenterId: CostCenterId | null` + schema `cost_center_id` + read/DTO + seed shape.
