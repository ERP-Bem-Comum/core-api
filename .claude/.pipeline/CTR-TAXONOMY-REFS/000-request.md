# CTR-TAXONOMY-REFS — escopo (S3 do épico Taxonomia Planejável Unificada, #502 · = issue #343)

> Size **M**. O contrato passa a carregar **Centro de Custo / Categoria / Subcategoria como refs reais
> do plano** (hoje: Centro/Categoria são texto livre; Subcategoria não existe). Espelha o documento (S1),
> para a herança contrato→documento funcionar **por ref**. **1 módulo: contracts.**

## Decisão da P.O. (2026-07-22)
A tela **Incluir Contrato** envia **refs do plano (IDs bgp)** nos três campos Centro → Categoria →
Subcategoria (mesma cascata da Conciliação, que lê a árvore do Plano Orçamentário). Logo o backend
recebe **refs**, não texto. Atende a #343 **parte 2** (migrar para refs), não só a parte 1.

## Estado medido (2026-07-22, verificado)
`ctr_contracts` (`schemas/mysql.ts:88-91`): `program_id`/`budget_plan_id` são **refs (UUID string)**;
`categorizacao`/`centro_de_custo` são **texto livre** (varchar 255); **sem subcategoria**. No domínio,
`programId`/`budgetPlanId` são `string | null` (ref leve, **não VO branded** — `types.ts:36-37`,
`contract.ts:71-72`). **Este é o padrão a espelhar** (string simples, validada na borda).

## Escopo (in) — só contracts
1. **Schema** `ctr_contracts`: 3 colunas novas `cost_center_ref`, `category_ref`, `subcategory_ref`
   (`varchar(36)`, nullable, sem FK — ADR-0014), ao lado de `program_id`/`budget_plan_id`. Migration
   **aditiva/INSTANT** (`0017_*`). **Mantém** `categorizacao`/`centro_de_custo` (texto livre) para
   back-compat dos contratos existentes — NÃO remover, NÃO migrar dado antigo.
2. **Domínio** (`contract/types.ts` + `contract.ts`): `costCenterRef`/`categoryRef`/`subcategoryRef`
   `string | null`, ao lado de `programId`/`budgetPlanId`, propagados em `create`/edição/rehydrate —
   **string simples, não VO branded** (padrão do módulo).
3. **Mapper** persistence: grava/lê as 3 colunas.
4. **Borda HTTP** (`http/schemas.ts`): `costCenterRef`/`categoryRef`/`subcategoryRef` **opcionais**
   (`z.uuid().optional()`) no create **e** update body; DTO de resposta os inclui.

## Fora de escopo
- Migrar `categorizacao`/`centro_de_custo` de texto→ref nos contratos existentes (histórico fica de
  fora — mesma decisão dos 91 documentos; refs nascem nulos).
- Validar pertencimento ao plano — ref **opaco** (ADR-0014), como `programId`/`budgetPlanId`.
- Guarda de exclusão (S4), leitura/relatório, herança contrato→documento em si (é UX do front + o
  documento já aceita os refs — S1).
- Remover os campos de texto livre.

## Critérios de aceite
- **CA1** `ctr_contracts` ganha `cost_center_ref`/`category_ref`/`subcategory_ref` (nullable). Migration
  aditiva; regressão zero (contratos existentes intactos, refs nascem nulos).
- **CA2** Criar/editar contrato com os 3 refs → persiste; ler de volta → devolve os mesmos valores.
- **CA3** Os 3 refs convivem com `program_id`/`budget_plan_id` e com os campos de texto livre.
- **CA4** Os 3 são **opcionais**: contrato sem eles continua válido (nascem nulos) — back-compat.
- **CA5** Refs malformados (não-UUID) → rejeitados na borda (400). Refs **opacos** (sem resolver nome,
  sem validar contra o plano).
- **CA6** DTO de resposta do contrato inclui os 3 refs.
- **CA7** ADR-0006/0014: refs opacos, sem FK, sem importar domínio de budget-plans, sem tocar `bgp_*`.
- **CA8** Regressão zero: fluxos existentes de contrato (create/update/list/detalhe) inalterados.

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — 3 colunas, persistência+roundtrip, opcionalidade, back-compat |
| W1 | `drizzle-schema-author` + `ports-and-adapters` | schema+migration + domínio + mapper + borda |
| W2 | `code-reviewer` | audit read-only (ref opaco, padrão string do módulo, back-compat, regressão) |
| W3 | `ts-quality-checker` | gate (integração registrada como não-executada — #500) |
