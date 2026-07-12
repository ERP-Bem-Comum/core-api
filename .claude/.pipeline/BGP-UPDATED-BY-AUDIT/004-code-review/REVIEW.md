# W2 — Code Review (read-only) · BGP-UPDATED-BY-AUDIT (#373)

**Agente:** zod-expert (revisão da trilha completa: domínio → mapper → application → borda → schema/projeção → migration).

## Veredito: APPROVED

Sem Blocker/Major. Verificado:
- **Response ↔ produtor 1:1** nos 3 caminhos (list, detail, children): `updatedByRef: z.uuid().nullable()` casa com `string | null`; todos os produtores (view→dto) emitem o campo (bug de projeção da 1ª tentativa já corrigido).
- **Trilha do ator consistente**: as 6 mutações passam `req.userId` → use case valida `UserRef.rehydrate` → domínio seta junto do `updatedAt`. `clonePlanContent` propaga o derivador (D5).
- **UserRef** rehydrate-only UUID v4; hydrate do mapper trata nullable (legado → null, CA3) sem 500; erro dedicado `budget-plan-mapper-invalid-updated-by`.
- **Camada**: domínio puro (Result, sem throw); erros EN kebab; sem vazamento (só o ref). `audit: {now, actor}` em 2 factories (agrupamento coerente p/ max-params, mesma forma nas duas).
- **Migration** `updated_by varchar(36) NULL COLLATE utf8mb4_bin` confere com o schema Drizzle; nullable p/ legado; ADD COLUMN INSTANT no 8.4.

## Minor (não-bloqueante)
- `budget-plan.mapper.ts`: o branch `budget-plan-mapper-invalid-updated-by` / hydrate-null não tem teste unitário direto do mapper — **consistente com o padrão do arquivo** (nenhum branch de erro do mapper tem; cobertura via E2E CA1/CA2/CA4 + integração gateada). Aceito.
