# Code Review — CTR-DOMAIN-RESTRUCTURE — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-21T00:00Z
**Escopo revisado:**
- `src/shared/kernel/{money,period,user-ref,non-zero-money,index}.ts`
- `src/modules/contracts/domain/contract/repository.ts`
- `src/modules/contracts/domain/amendment/repository.ts`
- `src/modules/contracts/application/ports/document-storage.types.ts`
- `src/modules/contracts/application/ports/document-storage.ts`
- `src/modules/contracts/domain/shared/ids.ts`
- `src/modules/contracts/domain/contract/{contract,types,errors,events}.ts`
- `src/modules/contracts/domain/amendment/{amendment,types,events}.ts`
- Verificações grep de CA7/CA8 em `src/modules/` e `tests/`

---

## Issues encontradas

Nenhuma issue crítica ou importante encontrada.

---

## O que está bom

### Critério H2 — Repositories em domain (CA3/CA4)

`ContractRepository` e `AmendmentRepository` estão corretamente posicionados em
`domain/contract/repository.ts` e `domain/amendment/repository.ts`. Os comentários
de cada arquivo citam literalmente o Critério H2 (§3.H.2 DO H§34), documentando
a decisão de design junto ao código. Os tipos importados são exclusivamente do
próprio agregado (`Contract`/`Amendment`, respectivos `Id`) e de `shared/result.ts`
— zero dependência de infra.

### Shared Kernel sem contaminação BC-specific (CA1/CA2)

`src/shared/kernel/` contém exatamente os 4 VOs previstos: `Money`, `Period`,
`UserRef`, `NonZeroMoney`. Verificação grep confirmou zero ocorrências de
`ContractId`, `AmendmentId`, `DocumentId` em `kernel/` — BC-specifics permanecem
em `domain/shared/ids.ts`. O barrel `kernel/index.ts` exporta apenas `export type`,
reforçando o Padrão D (namespace import para funções, barrel apenas para tipos).

### Zero vazamento de infra no domínio (CA2 / DON'T H§34)

`grep -rn "BucketName\|StorageKey\|StorageRef" src/modules/contracts/domain/`
retornou zero resultados. Os 3 VOs de vocabulário S3/MinIO vivem exclusivamente
em `application/ports/document-storage.types.ts`, junto ao port que os consome.

### document-storage.types.ts bem consolidado (CA5)

O arquivo consolida os 3 VOs com prefixos `createBucketName`, `createStorageKey`,
`createStorageRef` — evitando colisão de namespace quando o chamador faz
`import * as StorageRef from '...document-storage.types.ts'` e usa
`StorageRef.createStorageRef(...)`. A decisão D1 do W1 está implementada
corretamente. Cada smart constructor retorna `Result<Branded, ErrorUnion>` sem
`throw`, sem `class`, sem `any`.

### ids.ts — barrel BC-specific correto (CA9)

`domain/shared/ids.ts` reexporta apenas `ContractId`, `AmendmentId`, `DocumentId`
e suas funções com prefixo (`contractIdGenerate`, `amendmentIdGenerate`, etc.).
`UserRef` foi removido do barrel e migrado para `#src/shared/kernel/user-ref.ts`.
Consumidores nos 3 arquivos de amendment (`amendment.ts`, `events.ts`, `types.ts`)
importam diretamente de `kernel/user-ref.ts`.

### Conformidade com regras invariantes

- Zero `throw` em todos os arquivos revisados.
- Zero `class` em todos os arquivos revisados.
- Zero `any` em todos os arquivos revisados.
- Todos os imports terminam com `.ts` (NodeNext/ESM).
- Imports puramente de tipo usam `import type`.
- Toda função exportada tem return type explícito.
- Todos os tipos de entidade usam `Readonly<>` ou campos `readonly`.

### Eliminação total dos imports antigos

- CA7: `grep -rn "from.*shared/money|shared/period|shared/user-ref|shared/bucket-name|shared/storage-" src/modules/` → 0 ocorrências.
- CA8: `grep -rn "from.*application/ports/contract-repository|application/ports/amendment-repository" src/` → 0 ocorrências.
- A 1 ocorrência detectada em `tests/bdd/QA-REPORT.md` é texto em markdown de relatório histórico, não código ativo — não afeta compilação.

---

## Próximo passo

Pipeline-maestro avança para W3 (ts-quality-checker).
