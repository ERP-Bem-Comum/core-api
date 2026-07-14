# W1 — GREEN · FIN-REFERENCE-HIERARCHY-3LEVEL (#341)

> Skills `drizzle-schema-author` + `ts-domain-modeler`. Módulo `financial`.

## Entregue (escopo A — Financial ganha costCenterId)
- **Domínio** `Category` += `costCenterId: CostCenterId | null` (types + `create` default null).
- **Schema** `fin_categories` += `cost_center_id varchar(36)` NULL + índice (soft ref, sem FK — ADR-0014). **Migration `0035_wet_puff_adder`** (ALTER + CREATE INDEX).
- **Read** `category-read.drizzle` seleciona + rehidrata `cost_center_id` (espelha o `parentId`).
- **Borda** `categoriesToDto` + `categoryResponseSchema` (Zod) expõem `costCenterId` (nullable).
- **Seed** `ReferenceCategorySeed` += `costCenterId?`; `seededCategories` (composition) propaga.
- **Doc** `handbook/domain_questions/financeiro/07-categorization-taxonomy.md` (owner = budget-plans; como o financial lê; follow-ups).

## Cobertura
- Domínio (CA1/CA3): `category.test.ts` §costCenterId — create com/sem costCenterId.
- Integração (CA1/CA4): `category-read.drizzle-mysql.test.ts` §#341 — read retorna cost_center_id no MySQL real + null nas pré-existentes.

## Gate (prévia)
typecheck+format+lint verdes · **3961 unit** · **76 integração** (OrbStack).
