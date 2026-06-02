# W2 — CODE REVIEW · PARTNERS-ETL-WRITE-PORT

**Skill:** code-reviewer (revisor independente, read-only) · **Round:** 1 · **Veredito:** **APPROVED** ✅ · **Data:** 2026-06-02

## Veredito

**APPROVED — Round 1.** Nenhum BLOCKER/MAJOR/MINOR. A implementação espelha fielmente o padrão auth aprovado (`AUTH-ETL-USER-PROVISIONING`), com a melhoria de retornar `ProvisionOutcome` explícito em vez de `void`.

## Verificações que passaram (evidência)

- **ADR-0020:** os 4 stores usam `SELECT ... .for('update')` → skip/INSERT em `db.transaction`. Zero `ON DUPLICATE KEY`. `partners-etl-store.drizzle.ts:113-125` + 3 análogos.
- **ADR-0014:** só `par_*` (parSuppliers/parFinanciers/parCollaborators/parUserProfiles).
- **Idempotência D17 (skip, nunca UPDATE):** confirmado nos 4 stores (`existing.length > 0 → 'already-exists'; return;` sem `.update()`) e no InMemory (`if (map.has(legacyId)) return ok('already-exists')`).
- **`ER_DUP_ENTRY` sem copy-paste:** cada `runProvision` passa o `dupIndex` da SUA tabela — `par_suppliers/financiers/collaborators/user_profiles_legacy_id_idx` (linhas 110/144/178/212), batidos 1:1 contra `schemas/mysql.ts`. `isLegacyDupEntry` checa errno 1062 + `sqlMessage.includes(dupIndex)` (inclui `e.cause`).
- **`legacyId` load-bearing:** nenhum `*ToInsert` seta `legacyId` e a coluna não tem `.default()` → `{ ...xToInsert(agg, now), legacyId }` é o que persiste a correlação (linhas 124/158/192/226).
- **PK por entidade:** suppliers/financiers/collaborators → `.id` + `<X>Id.rehydrate`; `userProfiles` → `parUserProfiles.userRef` + `UserRef.rehydrate` (linhas 202-209). Sem copy-paste.
- **`outcome`:** declarado por chamada (não compartilhado), default `'created'`, vira `'already-exists'` no skip e na race (`runProvision:79`).
- **Boundary:** `safe`/`runProvision` convertem tudo para `err('partners-etl-store-unavailable')`; port é `type` puro. Nenhum `Error` vaza.
- **Testes:** unit assere 2º provision = `already-exists` + ref preservada; integração 4/4 assere `rows.length === 1` (+ ref em suppliers/userProfiles). `userProfiles` cobre PK `user_ref`. Gate em `MYSQL_INTEGRATION=1`, adicionado a `test:integration:partners`.

## Issues

### NIT

| # | Local | Observação | Resolução |
| --- | --- | --- | --- |
| N1 | `partners-etl-store.drizzle.ts:36-37` | helper `log` (consistente com o auth) | Sem ação. |
| N2 | testes de integração | `findByLegacyId` ref-preservation só em suppliers/userProfiles (financiers/collaborators asseram só `rows.length===1`) | Aceito: como `provision` nunca faz UPDATE, row-count=1 já prova não-sobrescrita; ref-invariant coberto no unit + 2/4 entidades. |

## Conclusão

Sem mudanças exigidas. **APPROVED → segue para W3.**
