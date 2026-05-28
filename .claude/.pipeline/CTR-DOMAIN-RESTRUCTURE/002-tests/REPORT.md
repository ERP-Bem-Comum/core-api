# W0 RED — Blast Radius Map
## Ticket: CTR-DOMAIN-RESTRUCTURE
## Data: 2026-05-21

W0 degenerado: refactor mecanico. Nenhum teste novo escrito.
Checklist de imports para guia de execucao de W1.

---

## Baseline pnpm test (pre-refactor)

tests 643 / suites 216 / pass 630 / fail 0 / skipped 13 / duration ~37990ms
Criterio de saida W1: fail 0, pass 630 mantidos.

---

## Blast radius por arquivo movido

### 1. domain/shared/money.ts -> src/shared/kernel/money.ts (11 src + 5 tests = 16 linhas)

- adapters/persistence/mappers/money.mapper.ts:2,3
- application/use-cases/create-amendment.ts:7,8
- application/use-cases/create-contract.ts:5,6
- cli/formatters/money.ts:1
- domain/contract/contract.ts:4
- domain/contract/errors.ts:31
- domain/contract/events.ts:2
- domain/contract/types.ts:2
- tests/.../adapters/persistence/fixtures.ts:5
- tests/.../application/use-cases/homologate-amendment.test.ts:6
- tests/.../cli/format.test.ts:4
- tests/.../domain/amendment/amendment.test.ts:5
- tests/.../domain/contract/contract.test.ts:5
- tests/.../domain/contract/errors.test.ts:8
- tests/.../domain/shared/money.test.ts:5
- tests/.../domain/shared/non-zero-money.test.ts:17

### 2. domain/shared/period.ts -> src/shared/kernel/period.ts (7 src + 5 tests = 12 linhas)

- adapters/persistence/mappers/period.mapper.ts:5,6
- application/use-cases/create-contract.ts:7,8
- cli/formatters/period.ts:1
- domain/contract/contract.ts:5
- domain/contract/events.ts:3
- domain/contract/types.ts:3
- tests/.../adapters/persistence/contract-repository.suite.ts:12
- tests/.../adapters/persistence/fixtures.ts:7
- tests/.../application/use-cases/homologate-amendment.test.ts:8
- tests/.../cli/format.test.ts:6
- tests/.../domain/contract/contract.test.ts:6
- tests/.../domain/shared/period.test.ts:5

### 3. domain/shared/user-ref.ts -> src/shared/kernel/user-ref.ts (2 src + 4 tests = 6 linhas)

- adapters/persistence/mappers/amendment.mapper.ts:19
- application/use-cases/homologate-amendment.ts:7,8
- tests/.../adapters/persistence/fixtures.ts:11
- tests/.../application/use-cases/homologate-amendment.test.ts:12
- tests/.../domain/amendment/amendment.test.ts:10
- tests/.../domain/shared/user-ref.test.ts:5

HOTSPOT CRITICO: ids.ts linhas 18 e 29 re-exportam UserRef/UserRefError/userRefRehydrate de ./user-ref.ts.
Recomendacao W1: REMOVER essas linhas do barrel BC (UserRef e cross-BC, nao pertence aqui).

### 4. domain/shared/non-zero-money.ts -> src/shared/kernel/non-zero-money.ts (3 src + 5 tests = 9 linhas)

- adapters/persistence/mappers/amendment.mapper.ts:4,5
- application/use-cases/create-amendment.ts:9
- domain/amendment/types.ts:2
- tests/.../adapters/persistence/fixtures.ts:6
- tests/.../application/use-cases/homologate-amendment.test.ts:7
- tests/.../cli/format.test.ts:5
- tests/.../domain/amendment/amendment.test.ts:6
- tests/.../domain/shared/non-zero-money.test.ts:19

### 5. domain/shared/bucket-name.ts -> application/ports/document-storage.types.ts (NOVO) — 4 linhas

- application/ports/document-storage.ts:2
- tests/.../application/ports/document-storage.contract.ts:34
- tests/.../domain/shared/bucket-name.test.ts:5
- tests/.../domain/shared/storage-ref.test.ts:5

### 6. domain/shared/storage-key.ts -> application/ports/document-storage.types.ts (NOVO) — 4 linhas

- application/ports/document-storage.ts:3
- tests/.../application/ports/document-storage.contract.ts:35
- tests/.../domain/shared/storage-key.test.ts:5
- tests/.../domain/shared/storage-ref.test.ts:6

### 7. domain/shared/storage-ref.ts -> application/ports/document-storage.types.ts (NOVO) — 3 linhas

- application/ports/document-storage.ts:4
- tests/.../application/ports/document-storage.contract.ts:36
- tests/.../domain/shared/storage-ref.test.ts:7

Nota: storage-ref.test.ts importa BucketName(L5)+StorageKey(L6)+StorageRef(L7), todos para .types.ts.

### 8. application/ports/contract-repository.ts -> domain/contract/repository.ts — 4 linhas

- adapters/contract-repository.in-memory.ts:4
- adapters/persistence/repos/contract-repository.drizzle.ts:7
- cli/context.ts:3
- tests/.../adapters/persistence/contract-repository.suite.ts:9

### 9. application/ports/amendment-repository.ts -> domain/amendment/repository.ts — 4 linhas

- adapters/amendment-repository.in-memory.ts:4
- adapters/persistence/repos/amendment-repository.drizzle.ts:7
- cli/context.ts:4
- tests/.../adapters/persistence/amendment-repository.suite.ts:8

---

## Resumo total

9 arquivos movidos/removidos | 62 linhas de import | ~35 arquivos unicos a editar

---

## Mapeamento antigo -> novo (referencia W1)

domain/shared/money.ts             -> src/shared/kernel/money.ts
domain/shared/period.ts            -> src/shared/kernel/period.ts
domain/shared/user-ref.ts          -> src/shared/kernel/user-ref.ts
domain/shared/non-zero-money.ts    -> src/shared/kernel/non-zero-money.ts
domain/shared/bucket-name.ts       -> application/ports/document-storage.types.ts (consolidado)
domain/shared/storage-key.ts       -> application/ports/document-storage.types.ts (consolidado)
domain/shared/storage-ref.ts       -> application/ports/document-storage.types.ts (consolidado)
application/ports/contract-repository.ts  -> domain/contract/repository.ts
application/ports/amendment-repository.ts -> domain/amendment/repository.ts

Permanecem sem mover:
- domain/shared/{contract-id,amendment-id,document-id,ids}.ts  (BC-specific)
- application/ports/document-storage.ts (atualizar imports internos)
- application/ports/event-bus.ts (sem mudanca)

Novos a criar:
- src/shared/kernel/money.ts
- src/shared/kernel/period.ts
- src/shared/kernel/user-ref.ts
- src/shared/kernel/non-zero-money.ts
- src/shared/kernel/index.ts (barrel opcional)
- src/modules/contracts/domain/contract/repository.ts
- src/modules/contracts/domain/amendment/repository.ts
- src/modules/contracts/application/ports/document-storage.types.ts

---

## Hotspots para W1

1. ids.ts barrel (CRITICO): remover linhas 18+29 (re-exports UserRef/UserRefError/userRefRehydrate).
2. amendment.mapper.ts: importa UserRef(L19)+NonZeroMoney(L4-5) -> MultiEdit.
3. cli/context.ts: ContractRepository(L3)+AmendmentRepository(L4) -> dois ajustes no mesmo arquivo.
4. document-storage.ts: tres imports individuais -> um import do .types.ts companion.
5. package.json #src/*: wildcard existente ja cobre #src/shared/kernel/* sem entrada extra.

---

## Checklist W1

[ ] mkdir src/shared/kernel/
[ ] Criar money.ts, period.ts, user-ref.ts, non-zero-money.ts em src/shared/kernel/
[ ] Opcional: src/shared/kernel/index.ts barrel
[ ] Criar application/ports/document-storage.types.ts
[ ] Criar domain/contract/repository.ts
[ ] Criar domain/amendment/repository.ts
[ ] Remover 9 arquivos antigos (rm)
[ ] Atualizar ids.ts: remover re-exports de UserRef
[ ] Atualizar document-storage.ts: um import do .types.ts em vez de tres
[ ] Atualizar ~35 arquivos src/ e tests/
[ ] pnpm run typecheck exit 0
[ ] pnpm test 0 fails

---

W0 concluido 2026-05-21. Proxima wave: W1 GREEN.
