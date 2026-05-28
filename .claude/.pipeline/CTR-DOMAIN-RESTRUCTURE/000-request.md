# 000 — Request CTR-DOMAIN-RESTRUCTURE

> **Frente A — Refactor radical do domínio (entrevista 0001). Bloco H.** Refactor estrutural — move VOs cross-BC para Shared Kernel, Repositories para `domain/<agg>/`, tipos de port para junto do port.
> Depende de **todos os tickets do Bloco H/A/B/I/D fechados** ✅.
> 17º ticket consecutivo do protocolo **Opção B**.

---

## Origem

- **L972** da entrevista: > `CTR-DOMAIN-RESTRUCTURE` — Bloco H — Cria `src/shared/kernel/` (promove `Money`, `Period`, `UserRef` cross-BC); move `Repository` de `application/ports/` pra `domain/<aggregate>/repository.ts`; move `bucket-name`/`storage-key`/`storage-ref` pra `application/ports/document-storage.types.ts`. Mantém `adapters/`, `contracts/` (plural), `public-api/` por módulo. **Idealmente último** (depende dos demais para minimizar conflitos de import).
- **§3.H da SKILL.md** (recém-inserida) — Critério H2 (Repository — domain vs application), Shared Kernel vs BC-specific, tipos de port morando junto.

---

## Estado atual (snapshot 2026-05-21)

### `src/modules/contracts/domain/shared/`

11 arquivos: `money.ts`, `period.ts`, `user-ref.ts`, `non-zero-money.ts` (cross-BC) + `contract-id.ts`, `amendment-id.ts`, `document-id.ts`, `ids.ts` (BC-specific) + `bucket-name.ts`, `storage-key.ts`, `storage-ref.ts` (infra/storage port types).

### `src/modules/contracts/application/ports/`

4 arquivos: `contract-repository.ts`, `amendment-repository.ts`, `document-storage.ts`, `event-bus.ts`.

### `src/shared/`

`adapters/`, `brand.ts`, `id.ts`, `immutable.ts`, `index.ts`, `ports/`, `result.ts`, `utils/`. **Sem `kernel/` ainda.**

### Importações afetadas

`grep -rn "from.*shared/money\|from.*shared/period\|from.*shared/user-ref\|from.*shared/bucket-name\|from.*shared/storage-key\|from.*shared/storage-ref" src/ tests/` → **29 arquivos**. Mais consumidores de `contract-repository`/`amendment-repository` em use cases, adapters e tests.

---

## Estado-alvo

### 1. Promover VOs cross-BC para `src/shared/kernel/`

```
src/shared/kernel/money.ts                  # de src/modules/contracts/domain/shared/money.ts
src/shared/kernel/period.ts                 # de src/modules/contracts/domain/shared/period.ts
src/shared/kernel/user-ref.ts               # de src/modules/contracts/domain/shared/user-ref.ts
src/shared/kernel/non-zero-money.ts         # de src/modules/contracts/domain/shared/non-zero-money.ts
src/shared/kernel/index.ts                  # opcional: barrel
```

Critério (DO §36): VO **genuinamente** cross-BC. Money é universal (Faturamento/Orçamento futuros); Period é universal; UserRef é universal (qualquer módulo que precisa autoria de evento); NonZeroMoney é refinamento de Money — cross-BC por extensão.

### 2. Manter `src/modules/contracts/domain/shared/` para BC-specific

```
src/modules/contracts/domain/shared/contract-id.ts        # mantém
src/modules/contracts/domain/shared/amendment-id.ts       # mantém
src/modules/contracts/domain/shared/document-id.ts        # mantém
src/modules/contracts/domain/shared/ids.ts                # mantém (re-export barrel BC)
```

### 3. Mover Repository para `domain/<aggregate>/repository.ts` (Critério H2)

```
src/modules/contracts/domain/contract/repository.ts       # de application/ports/contract-repository.ts
src/modules/contracts/domain/amendment/repository.ts      # de application/ports/amendment-repository.ts
```

Critério H2: "port ditado por invariância/ciclo-de-vida de Agregado?" — Contract/Amendment repositories são ditados pelos agregados (findById com retorno tipado pelo agregado, save com input tipado pelo agregado). Logo → domain.

### 4. Consolidar tipos do port `DocumentStorage` em `document-storage.types.ts`

```
src/modules/contracts/application/ports/document-storage.types.ts   # NOVO consolida BucketName + StorageKey + StorageRef
src/modules/contracts/application/ports/document-storage.ts          # já existe; ajusta imports
# REMOVER: src/modules/contracts/domain/shared/{bucket-name,storage-key,storage-ref}.ts
```

Critério (DO §35; DON'T §34): vocabulário de infra (`BucketName`/`StorageKey`/`StorageRef`) não pertence ao domínio — vive junto do port que os consome.

### 5. `application/ports/` continua com capabilities cross-aggregate

```
src/modules/contracts/application/ports/document-storage.ts    # mantém (capability)
src/modules/contracts/application/ports/document-storage.types.ts   # NOVO
src/modules/contracts/application/ports/event-bus.ts            # mantém (capability cross-cutting)
```

`contract-repository.ts` e `amendment-repository.ts` **removidos** dessa pasta (movidos para `domain/<agg>/`).

### 6. Atualizar todos os imports (~29 arquivos + repos consumers + tests)

Codemod manual via `Edit`/`MultiEdit` (não é grande pra justificar ts-morph) ou sed-based:
- `from '../shared/money.ts'` → `from '#src/shared/kernel/money.ts'` (ou path relativo correspondente).
- `from '../shared/period.ts'` → `from '#src/shared/kernel/period.ts'`.
- `from '../shared/user-ref.ts'` → `from '#src/shared/kernel/user-ref.ts'`.
- `from '../shared/non-zero-money.ts'` → `from '#src/shared/kernel/non-zero-money.ts'`.
- `from '../shared/bucket-name.ts'` → `from '../../application/ports/document-storage.types.ts'`.
- `from '../../application/ports/contract-repository.ts'` → `from '../../domain/contract/repository.ts'`.
- Etc.

---

## Critérios de aceitação

- **CA1** — `src/shared/kernel/{money,period,user-ref,non-zero-money}.ts` existem.
- **CA2** — `src/modules/contracts/domain/shared/{money,period,user-ref,non-zero-money,bucket-name,storage-key,storage-ref}.ts` **NÃO** existem.
- **CA3** — `src/modules/contracts/domain/{contract,amendment}/repository.ts` existem.
- **CA4** — `src/modules/contracts/application/ports/{contract-repository,amendment-repository}.ts` **NÃO** existem.
- **CA5** — `src/modules/contracts/application/ports/document-storage.types.ts` existe e consolida `BucketName`/`StorageKey`/`StorageRef`.
- **CA6** — `pnpm test` 0 fails; `pnpm run typecheck` exit 0; `pnpm run lint` exit 0.
- **CA7** — `grep -r "from.*shared/money\|shared/period\|shared/user-ref\|shared/bucket-name\|shared/storage-" src/modules/` zero ocorrências (imports antigos eliminados).
- **CA8** — `grep -r "from.*application/ports/contract-repository\|application/ports/amendment-repository" src/` zero ocorrências (imports antigos eliminados).
- **CA9** — `src/modules/contracts/domain/shared/ids.ts` ainda existe e continua barrel para ContractId/AmendmentId/DocumentId BC-specific.

---

## Arquivos previstos

### Movimentações em `src/`

```
# CRIAR
src/shared/kernel/money.ts
src/shared/kernel/period.ts
src/shared/kernel/user-ref.ts
src/shared/kernel/non-zero-money.ts
src/modules/contracts/domain/contract/repository.ts
src/modules/contracts/domain/amendment/repository.ts
src/modules/contracts/application/ports/document-storage.types.ts

# REMOVER
src/modules/contracts/domain/shared/money.ts
src/modules/contracts/domain/shared/period.ts
src/modules/contracts/domain/shared/user-ref.ts
src/modules/contracts/domain/shared/non-zero-money.ts
src/modules/contracts/domain/shared/bucket-name.ts
src/modules/contracts/domain/shared/storage-key.ts
src/modules/contracts/domain/shared/storage-ref.ts
src/modules/contracts/application/ports/contract-repository.ts
src/modules/contracts/application/ports/amendment-repository.ts
```

### Imports ajustados (~29 arquivos `src/` + tests)

Diversos arquivos em `src/modules/contracts/{domain,application,adapters,cli}/` + `tests/modules/contracts/`. O ticket é em grande parte **mecânico** — mas TS strict + `verbatimModuleSyntax` + extensão `.ts` ajudam o typecheck a pegar tudo.

---

## Pipeline

| Wave | Foco |
| :--- | :--- |
| W0 RED | Testes existentes (643) ficam vermelhos quando imports quebram. Como é refactor mecânico, NÃO escrever testes novos — basta confirmar que após mover os arquivos, os testes existentes detectam o problema (compile errors). Critério: rodar `pnpm test` e capturar fails. |
| W1 GREEN | Mover os 11 arquivos, atualizar ~29+ imports, confirmar gates verdes. |
| W2 REVIEW | Audit estrutural: Shared Kernel correto, Repository em domain, Critério H2 aplicado, sem vazamento de infra no domínio. |
| W3 QUALITY | Gates padrão. |

**Particularidade:** W0 desse ticket é **degenerada** — testes existentes já cobrem o comportamento; o "RED" é só a constatação de que mover sem ajustar imports quebra typecheck. Vou simplificar W0 RED como "mover 1 arquivo (e.g., money.ts) para `src/shared/kernel/` sem ajustar imports → confirmar fails de typecheck" ou pular para W0 minimalista (REPORT só lista os imports a ajustar).

**Estratégia escolhida:** W0 lista o "blast radius" (todos arquivos que importam de cada path antigo), serve como checklist para W1. RED genérico — o ticket é meramente de organização.

---

## Não-objetivos

- **Reorganizar `src/shared/` inteiro** — só adicionar `kernel/`.
- **Promover `ContractId`/`AmendmentId`/`DocumentId` para kernel** — são BC-specific (DO §37; DON'T §36).
- **Criar barrel cross-BC `src/shared/index.ts` rico** — manter atual.
- **Refactor de tests profundo** — só ajustar imports.
- **Outbox MySQL** — escopo futuro.

---

## Risco / pontos de atenção

1. **~29 arquivos com imports + repos drizzle + tests** — escopo grande. Usar `MultiEdit` para minimizar tool uses.
2. **`domain/shared/ids.ts` é barrel** — verificar que não re-exporta nada movido para kernel.
3. **Adapters Drizzle** (`adapters/persistence/repos/*.drizzle.ts`) importam de application/ports e domain — ajustar caminhos.
4. **CLI** (`cli/*` e `cli/drivers/*`) importa de application/ports e domain — ajustar.
5. **Fixtures dos tests** importam pesado dos VOs — ajustar.
6. **Subpath imports `#src/*`** já configurados no `package.json` — usar onde fizer sentido para evitar `../../../../`.
7. **Mitigação Bug #47936** — Opus + checklist ativo. Esse ticket pode hitar limite de tool uses; aceitar fallback admin.
