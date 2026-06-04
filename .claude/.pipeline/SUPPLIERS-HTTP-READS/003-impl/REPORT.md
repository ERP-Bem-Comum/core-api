# W1 — GREEN — SUPPLIERS-HTTP-READS (S1)

> Skill: `ports-and-adapters`. Reads de Fornecedores (read-model + lista/filtros/detalhe).

## Arquivos criados
- `application/ports/supplier-reader.ts` — SupplierReader (getById, list) + SupplierReadRecord.
- `adapters/persistence/repos/supplier-reader.{in-memory,drizzle}.ts`.
- `adapters/http/supplier-{schemas,dto,list-query,plugin}.ts`.

## Arquivos editados
- `public-api/permissions.ts` — SUPPLIER_PERMISSION {read,write}.
- `application/use-cases/list-suppliers.ts` — SupplierListFilter + supplierMatchesFilter (search/active/categories; categories como string[]).
- `adapters/http/composition.ts` — supplierReader (memory/drizzle) + getSupplierById/listSupplierRecords + PartnersSeed.suppliers.
- `public-api/http.ts` — exporta suppliersHttpPlugin + SUPPLIER_PERMISSION.
- `src/server.ts` — registra suppliersHttpPlugin sob /api/v1.

## Decisões
- Espelha P1a/P1b de colaboradores: read-model enriquecido (legacyId+timestamps), filtro/paginação na borda (ADR-0032), item de lista = detalhe completo, meta legado.
- `categories` como `string[]` no filtro (evita enum de 39 valores; categoria inexistente não casa).
- Reusa o composition partners (mesmo pool MySQL RW split); suppliers no reader pool.

## Saída literal do gate
`tsc --noEmit` zero · `prettier --check` clean · `eslint` zero ·
```
ℹ tests 2051
ℹ pass 2034
ℹ fail 0
ℹ skipped 17
```
Teste S1 isolado: 7 · pass 7 · fail 0.
→ GREEN: zero regressão (2034 = 2027 + 7 novos).

## Próximo passo
W2 (REVIEW) — code-reviewer.
