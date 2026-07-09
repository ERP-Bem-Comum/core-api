# Code Review — FIN-DOC-LIST-FILTERS (#164) + FIN-DOC-BULK-DUEDATE (#162) — Round 1

**Veredito:** APPROVED (ambos)

**Reviewers (painel adversarial, 4 independentes):** code-reviewer (skill) + drizzle-orm-expert + security-backend-expert + fastify-server-expert. **Data:** 2026-07-09.

## Consolidação

| Reviewer | Veredito | Blocker | Major | Minor |
| --- | --- | --- | --- | --- |
| code-reviewer | APPROVED | 0 | 0 | 1 |
| fastify-server-expert | APPROVED | 0 | 0 | 2 |
| security-backend-expert | APPROVED | 0 | 0 | 3 |
| drizzle-orm-expert | APPROVED | 0 | 0 | 2 (🟡) + 3 (🔵) |

**Nenhum achado bloqueante.**

## Confirmações-chave
- **Rota estática precede `:id`** (fastify, verificado empiricamente + Refman Fastify Routes.md:253); union em querystring + OpenAPI gerado sem erro; response sem vazamento.
- **JOINs não inflam count** (drizzle): `finSupplierView.supplierRef` PK e `recon` GROUP BY são 1:0..1. `orderBy` por supplierName com desempate `id asc` = paginação determinística.
- **`inArray` com array vazio → `sql\`false\``** (inalcançável via querystring); `gte/lte` em net_value exclui Draft (NULL) automaticamente; escape/param sem injeção.
- **Segurança**: sem SQLi (bind param), sem IDOR novo (mesmo RBAC do PATCH individual), lote bounded (`items.max(100)`), falha parcial fail-safe (optimistic lock = idempotência de fato).

## Minor aplicados nesta rodada
1. **Bounds** (security M1/M2/M3): `.max(50)` nos arrays `type`/`supplierRef`; `.max(MAX_SAFE_INTEGER)` em `valorMin`/`valorMax` e `items[].version` — consistência com o resto do `schemas.ts`. ✅
2. **Paridade in-memory** (drizzle 🟡#1): `matchesFilter` agora respeita a precedência multi-sobre-single (espelha o Drizzle). ✅
3. **Cobertura x99 estendida** (drizzle 🟡#2): CA5 cobre `inArray` (supplierRefs/types) + `sort=netValue desc` contra MySQL real. ✅
4. **Cleanup** (drizzle 🔵#1): removido spread `[...arr]` no `inArray` (aceita ReadonlyArray). ✅
5. **Teste supplierRef multi** (fastify Minor-1): CA3b adicionado. ✅
6. **Doc de id duplicado no lote** (fastify Minor-2): comentário no use-case. ✅

## Minor não aplicados (registro)
- Índices para contract_ref/program_ref/net_value/type (drizzle) — decisão de `mysql-database-expert` quando o volume crescer; fora de escopo. `slow-query-log` já ativo.
- Cosméticos (comentário `and()` vazio; tie-breaker asc em order=desc) — não afetam corretude.

## Próximo (W3)
Gate: typecheck + format:check + lint + test. CA5 (#164) + CA5 (#162) validados no x99.
