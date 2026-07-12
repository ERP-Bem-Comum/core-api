# W2 — Code Review (read-only) · BGP-ITEM-PROJECTIONS (#372)

**Agente:** zod-expert.

## Veredito: APPROVED

Sem Blocker/Major/Minor. Verificado:
1. **Response ↔ DTO ↔ view type** batem campo-a-campo: `partnersCount: z.number().int().nonnegative()` e `networkKind: z.enum(['state','municipality','mixed']).nullable()` casam com `BudgetPlanListItem` e o mapper 1:1. Enum inclui `'mixed'`, `.nullable()` cobre "sem budgets".
2. **Aditividade**: só acréscimo ao fim de type/schema/mapper; nenhum campo removido/renomeado (CA3 prova via `fastify.inject`).
3. **`deriveNetworkKind` puro e exaustivo**: sem I/O, 4 casos cobertos, `?? null` só para `noUncheckedIndexedAccess`; nenhum valor fora do enum.
4. **ADR-0027** (citado `:30`,`:32`): Zod só na borda — `list-budget-plans.ts` não importa zod; derivação é TS puro. Não fere `.claude/rules/application.md` (projeção de apresentação, não decide estado de negócio; `BudgetPartner.kind` segue única fonte de verdade).
5. **Sem vazamento**: só contagem + kind agregado (nenhum ref cru/valor de budget).
6. typecheck + lint limpos; 5/5 no contrato.
