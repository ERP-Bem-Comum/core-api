# W1 — REPORT (BDG-COST-STRUCTURE, #316) — PARCIAL

> Camada de **domínio GREEN + auditada**. Persistência + borda HTTP = próximo bloco do W1.

## Feito (domínio puro — `src/modules/budget-plans/domain/cost-structure/`)
- **VOs** `cost-direction.ts` / `launch-type.ts` — union de literais (não `Brand<string>`, decisão do
  `typescript-language-expert`): `'A PAGAR'|'A RECEBER'` e os 4 launchTypes (`IPCA`/`CAED`/`DESPESAS_PESSOAIS`/
  `DESPESAS_LOGISTICAS`), com `isCostDirection`/`isLaunchType` (exaustividade p/ o `switch` da US3).
- **IDs** `cost-center-id`/`category-id`/`subcategory-id` — branded UUID v4 (molde `budget-plan-id`).
- **`types.ts`** — CostStructure→CostCenter→Category→Subcategory, imutável (Readonly). Árvore FIXA 3 níveis.
- **`errors.ts`** — union: `budget-plan-not-editable` · `cost-node-name-required` · `cost-node-parent-not-found` · `cost-node-invalid-direction` · `cost-node-invalid-launch-type`.
- **`cost-structure.ts`** — `empty`/`addCostCenter`/`addCategory`/`addSubcategory` puros, editabilidade por status.

## Testes (W0 → GREEN)
`launch-type` 2 · `cost-direction` 2 · `cost-structure` 6 (CA1 árvore, CA2 edição/nome/órfão/direction, CA3 APROVADO bloqueia) = **10/10**.
Gate parcial: typecheck ✅ · lint ✅ · format ✅.

## Auditoria de type system (typescript-language-expert)
Aplicado: VOs → union literal (exaustividade a jusante) + type predicates. Confirmado manter: duplicação dos
3 IDs (module-as-namespace, house style) e inputs `direction/launchType: string` validados no domínio (fail-closed).

## Pendente do W1 (próximo bloco)
- **Schema Drizzle** `bgp_cost_centers`/`bgp_categories`/`bgp_subcategories` (adjacency FK CASCADE, UUID `utf8mb4_bin`) + migration → skill `drizzle-schema-author` + validar com agente `mysql-database-expert`.
- **Repo** in-memory + Drizzle + mappers (contrato de persistência) + reconstrução da árvore por 3 SELECTs.
- **Borda HTTP** — GET árvore + POST/PATCH/DELETE nós (editabilidade por status) + use-cases.
- Depois: W2 (`code-reviewer` + `drizzle-orm-expert`) + W3 (`ts-quality-checker` + integração).
