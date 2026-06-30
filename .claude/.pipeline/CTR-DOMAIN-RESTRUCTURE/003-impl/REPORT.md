# W1 — GREEN — CTR-DOMAIN-RESTRUCTURE

> **Status:** ✅ completed (round 1) · **Data:** 2026-05-21
> **Modo:** sub-agent (103 tool uses, interrompido Bug #47936 nos testes storage-key/storage-ref) + main session (sed batch + 4 edições cirúrgicas + 2 ajustes de teste smoke).

## Movimentações executadas (9 arquivos)

```
# CRIADOS
src/shared/kernel/money.ts
src/shared/kernel/period.ts
src/shared/kernel/user-ref.ts
src/shared/kernel/non-zero-money.ts
src/shared/kernel/index.ts                   # barrel
src/modules/contracts/domain/contract/repository.ts
src/modules/contracts/domain/amendment/repository.ts
src/modules/contracts/application/ports/document-storage.types.ts   # consolida BucketName + StorageKey + StorageRef

# REMOVIDOS
src/modules/contracts/domain/shared/money.ts
src/modules/contracts/domain/shared/period.ts
src/modules/contracts/domain/shared/user-ref.ts
src/modules/contracts/domain/shared/non-zero-money.ts
src/modules/contracts/domain/shared/bucket-name.ts
src/modules/contracts/domain/shared/storage-key.ts
src/modules/contracts/domain/shared/storage-ref.ts
src/modules/contracts/application/ports/contract-repository.ts
src/modules/contracts/application/ports/amendment-repository.ts

# AJUSTADO
src/modules/contracts/domain/shared/ids.ts   # removeu re-export de UserRef (agora cross-BC em kernel/)
```

## Imports atualizados (sub-agent + main session)

Sub-agent atualizou ~30 arquivos `src/` + 9 arquivos `tests/` via Edit/MultiEdit (103 tool uses, ~8 min). Interrompido nos últimos 2 testes storage-key/storage-ref.

Main session completou com `sed` batch:
- 11 testes — paths `#src/modules/contracts/domain/shared/{money,period,user-ref,non-zero-money}.ts` → `#src/shared/kernel/...`.
- 2 testes — paths `#src/modules/contracts/domain/shared/{bucket-name,storage-key,storage-ref}.ts` → `#src/modules/contracts/application/ports/document-storage.types.ts`.
- 3 use cases — `'../ports/{contract,amendment}-repository.ts'` → `'../../domain/{contract,amendment}/repository.ts'`.
- 2 suites de teste — `'#src/modules/contracts/application/ports/{contract,amendment}-repository.ts'` → `'#src/modules/contracts/domain/{contract,amendment}/repository.ts'`.
- 3 arquivos do amendment domain — UserRef movido de `'../shared/ids.ts'` para `'../../../../shared/kernel/user-ref.ts'`.
- 2 testes de smoke (ids/storage-ref) — ajustados para refletir nova realidade (UserRef removido do barrel ids; smart constructors em document-storage.types.ts usam prefixo `createX` para evitar colisão no namespace consolidado).

## Saída literal dos gates

### `pnpm run typecheck`
Exit 0. ✅

### `pnpm test`
```
ℹ tests 641
ℹ suites 216
ℹ pass 628
ℹ fail 0
ℹ skipped 13
ℹ duration_ms 37827.922625
```
Zero regressão funcional. ✅

### `pnpm run lint`
Exit 0. ✅

## Decisões técnicas

### D1 — `document-storage.types.ts` consolida 3 VOs com prefixos

`BucketName.create()` + `StorageKey.create()` + `StorageRef.create()` (módulos separados) → `createBucketName()` + `createStorageKey()` + `createStorageRef()` (1 módulo). Prefixos evitam colisão no namespace consolidado.

Consumidores que faziam `import * as StorageRef from '.../storage-ref.ts'` continuam compilando — agora apontam para `document-storage.types.ts` e usam `StorageRef.createStorageRef(...)`.

### D2 — Repository em `domain/<agg>/repository.ts` (Critério H2)

`ContractRepository`/`AmendmentRepository` saíram de `application/ports/` (capacidade) e foram para `domain/<aggregate>/repository.ts` (invariância — port ditado pelo agregado). Adapters Drizzle/InMemory continuam consumindo via import — só o path mudou.

### D3 — `ids.ts` barrel perde re-export de UserRef

`UserRef` é cross-BC (qualquer módulo precisa autoria) — promovido para `src/shared/kernel/user-ref.ts`. O barrel `domain/shared/ids.ts` continua re-exportando ContractId/AmendmentId/DocumentId (BC-specific), mas **não** UserRef. Consumidores que importavam `UserRef` de `ids.ts` migraram para `'#src/shared/kernel/user-ref.ts'` (3 arquivos: amendment.ts, events.ts, types.ts).

## Cobertura dos 9 CAs

| CA | Status |
| :--- | :---: |
| CA1 — `src/shared/kernel/*` existe | ✅ |
| CA2 — VOs cross-BC removidos de `domain/shared/` | ✅ |
| CA3 — Repositories em `domain/<agg>/repository.ts` | ✅ |
| CA4 — Repositories removidos de `application/ports/` | ✅ |
| CA5 — `document-storage.types.ts` consolida 3 VOs | ✅ |
| CA6 — Gates verdes (typecheck/test/lint) | ✅ |
| CA7 — Zero imports antigos de `shared/{money,period,user-ref,...}` em `src/modules/` | ✅ |
| CA8 — Zero imports antigos de `application/ports/{contract,amendment}-repository` | ✅ |
| CA9 — `ids.ts` continua barrel para BC-specific | ✅ |

## Próximo passo

→ **W2 (REVIEW)** — code-reviewer audita Critério H2 aplicado, Shared Kernel sem vazamento de BC-specific, sem vazamento de infra (`BucketName`/`StorageKey`) no domínio, document-storage.types.ts bem consolidado.
