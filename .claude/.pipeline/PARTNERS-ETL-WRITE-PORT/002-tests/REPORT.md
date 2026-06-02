# W0 — RED · PARTNERS-ETL-WRITE-PORT

**Skill:** tdd-strategist · **Outcome:** RED ✅ · **Data:** 2026-06-02

## Arquivos de teste criados

| Arquivo | Tipo | Cobertura |
| --- | --- | --- |
| `tests/modules/partners/adapters/persistence/repos/legacy-entity-store.in-memory.test.ts` | unit (`pnpm test`) | idempotência genérica do InMemory (skip-não-sobrescreve) + findByLegacyId |
| `tests/modules/partners/public-api/partners-etl-port.integration.test.ts` | integração gated (`MYSQL_INTEGRATION=1`) | `buildPartnersEtlPort` real, idempotência por DB das 4 entidades |

## Cenários — unit

1. provision de `legacyId` novo → `created`; `findByLegacyId` acha a ref.
2. re-provisionar mesmo `legacyId` (agregado distinto) → `already-exists` e **não sobrescreve** (`findByLegacyId` ainda retorna a 1ª ref).
3. `findByLegacyId` de `legacyId` ausente → `null`.

## Cenários — integração (gated)

4. **suppliers:** 2× provision(legacyId=7) → `created` + `already-exists`; 1 linha em `par_suppliers`; `findByLegacyId` = id do 1º.
5. **financiers:** 2× provision(legacyId=3) → `already-exists`; 1 linha em `par_financiers`.
6. **collaborators:** 2× provision(legacyId=9) → `already-exists`; 1 linha em `par_collaborators`.
7. **userProfiles:** 2× provision(legacyId=5) → `already-exists`; `findByLegacyId` = `user_ref` do 1º (PK = `user_ref`, não `id`); 1 linha em `par_user_profiles`.

## Confirmação RED

```
ℹ tests 2 · pass 0 · fail 2
```

`ERR_MODULE_NOT_FOUND` — APIs inexistentes (esperado):

- `#src/modules/partners/adapters/persistence/repos/legacy-entity-store.in-memory.ts`
- `#src/modules/partners/public-api/etl.ts`

## API que o W1 deve criar (contrato fixado)

- **Port** `LegacyEntityStore<A, Ref>` (`application/ports/legacy-entity-store.ts`): `findByLegacyId(legacyId: number): Promise<Result<Ref | null, PartnersEtlStoreError>>` + `provision(aggregate: A, legacyId: number): Promise<Result<'created' | 'already-exists', PartnersEtlStoreError>>` (insert idempotente, skip-by-legacy_id, NUNCA UPDATE).
- **InMemory** genérico `makeInMemoryLegacyEntityStore<A, Ref>(refOf: (a: A) => Ref)`.
- **Drizzle** `createDrizzlePartnersEtlStores(handle, clock)` → as 4 `LegacyEntityStore` (helper compartilhado SELECT-FOR-UPDATE-by-legacy_id → skip/insert; reusa `*ToInsert` + `legacyId`; captura `ER_DUP_ENTRY` em `par_<x>_legacy_id_idx`).
- **Factory** `buildPartnersEtlPort({ connectionString }): Promise<Result<PartnersEtlPort, PartnersMysqlDriverError>>` em `public-api/etl.ts`. `PartnersEtlPort = { suppliers, financiers, collaborators, userProfiles: LegacyEntityStore<...>; close }`.
- **Sem migration** — `legacy_id` já existe nas 4 `par_*` (P2).

## Próximo passo

W1 — implementar o mínimo até GREEN. Skill: `ports-and-adapters`.
