# REPORTS-REALIZED-ENDPOINT — escopo (S6 do épico #502 · fatia final do Realizado × Planejado #416)

> Size **M**. **Costura** o orçado (`budget-plans/public-api/read.ts`) com o realizado+provisionado
> (`financial/public-api/realized-provisioned-projection.ts`, já no **grão de subcategoria** após S5) na
> árvore de 3 níveis do relatório, e expõe `GET /api/v2/reports/realized`. É o clímax: o número na tela.

> ⚠️ **Este ticket foi RE-ESCOPADO (2026-07-21).** O W0 antigo (na branch `feat/reports-realized-vs-planned`)
> travava a premissa **obsoleta** "realizado/provisionado só na categoria; subcategoria = só previsto,
> realized=0". As fatias S1–S5 **inverteram** isso: o financial agora carrega `subcategory_ref` e o leitor
> agrega **no grão de subcategoria**, incluindo títulos manuais. O W0 é **reescrito** contra esta realidade.

## O que já existe (nesta branch: dev + S1 + S2 + read ports + S5)

- **Orçado** — `buildBudgetPlansReadPort` → `listPlannedAmounts(filter)` devolve linhas planas com a
  **trilha completa**: `budgetPlanId, costCenter{id,name}, category{id,name}, subcategory{id,name}, month,
  plannedCents`. Grade de 12 meses materializada (nós zerados aparecem).
- **Realizado + Provisionado** — `openRealizedProvisionedReader` → `list(filter)` devolve
  `{ budgetPlanRef, categoryRef, subcategoryRef, month 'YYYY-MM', realizedCents, provisionedCents }`, no
  **grão de subcategoria**, já somando documentos + títulos manuais (S5).

## A costura (o coração) — grão de subcategoria, categoria do PLANO

`stitchRealizedReport(planned, financial): RealizedReport`:

1. **A árvore vem do PLANO** (as linhas do `planned` são o esqueleto: trilha + `expected` por mês).
2. **Realizado/provisionado casam por `(budgetPlanId==budgetPlanRef, subcategoryId==subcategoryRef, mês)`**
   — **no grão de subcategoria** (não mais só categoria). ⚠️ **A categoria e a trilha vêm do PLANO** (da
   linha `planned`), **NÃO** do `categoryRef` da linha financeira — o título manual sai com
   `categoryRef=null` (nota da S5), e mesmo o documento pode ter categoria inconsistente. O plano é o dono
   (ADR-0051). **`categoryRef` do financial é ignorado na montagem da árvore.**
3. **Somas (CA5):** subcategoria → soma dos 12 meses = total do nó; categorias = soma das subcategorias;
   centros = soma das categorias; total geral = soma dos centros. **Nas 3 medidas.**
4. **CA7b — "Sem orçamento previsto":** realizado/provisionado cujo `(budgetPlanRef, subcategoryRef)` **não**
   casa nenhuma linha do plano → linha sintética (`expected=0`), nunca descartado. Entra nos totais.
5. **Mês:** `'YYYY-MM'` → `Number(slice(5,7))`; grade de 12.

## Ajuste OR na fatia 1 (decisão da P.O.) — parte deste ticket

`listPlannedAmounts`: hoje `partnerStateRef` **AND** `partnerMunicipalityRef` no `ON` → zera. Quando
**ambos** vêm, vira **OR** (`(kind='state' AND ref=?) OR (kind='municipality' AND ref=?)`), **ainda no ON**
(nunca no WHERE — mataria os meses zerados). Um filtro só = como está. Grade de 12 + boot-scoped intactos.

## Escopo (in)

1. `reports/application/ports/realized-read.ts` — o port (tipos da árvore + filtro).
2. `reports/adapters/persistence/realized-read.stitch.ts` — a costura pura (+ InMemory).
3. `reports/adapters/persistence/realized-read.from-sources.ts` — ACL: abre os 2 readers no boot, mapeia
   filtro, chama ambos, delega ao stitch.
4. `reports/adapters/http` — rota `GET /api/v2/reports/realized`, Zod `.strict()` (`programId?`,
   `budgetPlanId?`, `partnerStateId?`, `partnerMunicipalityId?`, **`year` obrigatório**), gate, wiring `server.ts`.
5. Ajuste OR em `budget-plans/.../planned-amounts-read.drizzle.ts` (+ teste próprio, gated).

## Resposta (legado, `handbook/legacy_docs/openapi.yaml:3070`)
```
{ totalExpected, totalRealized, totalProvisioned,
  costCenters[] { id, name, budgetPlanId, totais…,
    categories[] { id, name, totais…, months[12],
      subCategories[] { id, name, totais…, months[12] } } } }
RealizedMonth = { month 1..12, expected, realized, provisioned }
```

## Fora de escopo
- CSV/PDF server-side · Contas a Receber · Dashboard · reclassificar os 91 legados · guarda (S4) · contrato (S3).
- Mudar os readers das S1/S2/S5 (regressão zero).

## Critérios de aceite
- **CA1** `GET /api/v2/reports/realized?year=YYYY` → árvore de 3 níveis, 3 totais/nó + `months[12]` em categoria e subcategoria.
- **CA2** Previsto = do orçado. **CA3/CA4** Realizado/Provisionado = da S5, **no grão de subcategoria** (a folha tem número, não zero).
- **CA5** Somas conservam nos 4 níveis (mês→nó, filhos→pai, centros→geral), nas 3 medidas.
- **CA6** Categoria/trilha vêm do PLANO via `subcategoryRef` — o `categoryRef` do financial **não** posiciona a árvore (título manual com `categoryRef=null` cai na categoria certa).
- **CA7** Nó do plano sem movimento → zerado, não some. **CA7b** realizado/provisionado sem plano → "Sem orçamento previsto".
- **CA8** `year` obrigatório (sem → 400 Zod). Filtros combináveis; **estado+município = OR** (soma as duas Redes).
- **CA9** ADR-0006: `reports` lê budget-plans e financial só via public-api. **CA10** regressão zero (`/reports/team`, `/analysis/*` intactos).
- **CA11** Gate de permissão (definir: `budget-plan:read` + `fiscal-document:read`, como o W0 antigo — `payable:read` não existe).

## Verificação (quando a #500 fechar)
`ETL-BUDGET-PLANS`: 5 planos / 390 subcategorias / 5.040 linhas. A âncora da nota 10 (R$55 numa subcategoria) atravessa daqui.

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — costura no grão folha, categoria do plano (CA6), somas (CA5), CA7b, OR, rota |
| W1 | `ports-and-adapters` + `fastify-server-expert` (par `zod-expert`) | stitch + ACL + rota + wiring + OR |
| W2 | `code-reviewer` | audit read-only (categoria-do-plano, somas, ADR-0006, CA7b) |
| W3 | `ts-quality-checker` | gate (integração registrada como não-executada — #500) |
