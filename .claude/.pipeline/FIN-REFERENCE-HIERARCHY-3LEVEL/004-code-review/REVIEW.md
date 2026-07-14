# Code Review — FIN-REFERENCE-HIERARCHY-3LEVEL — Round 1

**Veredito:** APPROVED · code-reviewer · 2026-07-13

## Issues
### 🔴 Crítica / 🟡 Importante
Nenhuma.

### 🔵 Sugestão
- **costCenterId opcional no seed sem dado populado:** o shape (`ReferenceCategorySeed.costCenterId?`) e o plumbing existem, mas nenhuma entrada do seed define costCenterId (todas top-level sem centro). É intencional (000-request: "só a capacidade + o shape"; seed real do legado = follow-up de dado). Sem ação.

## O que está bom
- **Additivo e back-compat total:** `cost_center_id` NULL; categorias pré-#341 leem `costCenterId: null`. 3961 unit + 76 integração sem regressão.
- **Consistente com o #147:** `costCenterId` espelha exatamente o padrão do `parentId` (soft ref sem FK — ADR-0014; rehidratação defensiva no read; DTO/schema aditivos).
- **Domínio purista:** branded `CostCenterId`, `Result`, `Readonly`; validação delegada ao seed (soft ref).
- **Validado no MySQL real:** migration 0035 aplica + read retorna cost_center_id (CA1/CA4).
- **budget-plans intocado:** decisão de ownership documentada (owner conceitual = Plano Orçamentário; unificação canônica = follow-up/ADR).

## Próximo passo
APPROVED → W3 (gate + OrbStack já verdes).
