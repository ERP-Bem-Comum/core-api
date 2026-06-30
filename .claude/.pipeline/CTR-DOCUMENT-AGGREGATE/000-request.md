# 000 — Request CTR-DOCUMENT-AGGREGATE

> **Agregado `DocumentoContratual` MVP — APENAS DOMAIN. Size S (re-escopado de M).**
> Persistência (schema/migration/adapters/suite) vai para `CTR-DOCUMENT-AGGREGATE-PERSISTENCE` (M, gatilhado imediatamente após este fechar).
>
> Implementa [spec §4.3](../../../handbook/domain_questions/contratos/especificacao-dominio.md) (DocumentoContratual) cobrindo **RN-AS-01** (assinatura eletrônica registrada) e **RN-AS-02** (hash/versão/evidências).

## Re-escopo (decisão registrada)

Request original (M) cobria 15 arquivos: domain + schema + migration + 2 adapters + suite + tests. Decisão do usuário (2026-05-22): **dividir em 2 tickets** para reduzir risco e dar checkpoint claro:

| # | Ticket | Size | Cobre |
| :--- | :--- | :---: | :--- |
| **#4a (este)** | **`CTR-DOCUMENT-AGGREGATE`** | **S** | 5 domain files + tests do create + public-api types |
| #4b (próximo) | `CTR-DOCUMENT-AGGREGATE-PERSISTENCE` | M | schema + migration + mapper + 2 adapters + suite contratual + tests integration |

O nome do ticket atual NÃO foi renomeado (evita rebobinar STATE.json). Tratamos como "ticket pai de domínio".

## Justificativa

Domínio de Contratos tem hoje `Contract` e `Amendment`. Faltava o terceiro agregado: `DocumentoContratual`. Sem ele, não há tipo para criar/passar quando `uploadDocument` (ticket futuro) precisar persistir o documento + emitir evento.

Estratégia incremental:
1. Modelar o agregado domain-puro (este ticket) — garante que `create()` valida tudo necessário, `DocumentoContratualAnexado` emite com payload completo.
2. Depois, adicionar persistência (próximo ticket) — schema + mapper round-trip + 2 adapters cobertos pela suite contratual.

## Decisões fixadas

### 1. Agregado MVP — refined type `{ status: 'Active' }`

```ts
type DocumentoContratualCore = Readonly<{
  id: DocumentId;
  // Parent polimórfico (RN-01: vínculo formal obrigatório)
  parentType: 'Contract' | 'Amendment';
  parentId: ContractId | AmendmentId;
  // Categoria
  categoria: CategoriaDocumento;
  // Arquivo
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  hashSha256: string;          // RN-AS-02
  // Storage (acopla com DocumentStorage port)
  bucket: BucketName;
  storageKey: StorageKey;
  // Assinatura (RN-AS-01)
  signedElectronically: boolean;
  // Versionamento
  version: number;             // RN-AS-02; default 1 no create
  // Audit trail
  uploadedAt: Date;
  uploadedBy: UserRef;
  // Retenção (RN-11 — exclusão lógica usa este campo no futuro)
  retentionUntil: Date | null;
}>;

export type DocumentoContratual = DocumentoContratualCore & Readonly<{ status: 'Active' }>;
```

Outros estados (`'LogicallyDeleted'`, `'Superseded'`) ficam para tickets de lifecycle.

### 2. `CategoriaDocumento` — discriminated union literal

```ts
export type CategoriaDocumento =
  | 'contrato_assinado'
  | 'aditivo_assinado'
  | 'parecer'
  | 'certidao'
  | 'justificativa'
  | 'anexo_tecnico'
  | 'publicacao'
  | 'outro';
```

8 categorias da spec §4.3 em snake_case PT-BR.

### 3. Operação `create(input)` — única operação

```ts
export const create = (input: CreateDocumentoContratualInput): Result<DocumentoContratual, DocumentoError> => ...;
```

Validações:
- `fileName` não-vazio (1..255 chars)
- `mimeType` não-vazio
- `sizeBytes >= 0`
- `hashSha256` matches `^[0-9a-f]{64}$`
- `version >= 1`
- `retentionUntil` se fornecido, deve ser `>= uploadedAt`

`storageRef` (bucket + key) vem dos VOs `BucketName`/`StorageKey` já validados.

### 4. Evento `DocumentoContratualAnexado` (spec §13.3)

```ts
export type DocumentoContratualAnexado = Readonly<{
  type: 'DocumentoContratualAnexado';
  schemaVersion: 1;
  payload: Readonly<{
    documentId: string;
    parentType: 'Contract' | 'Amendment';
    parentId: string;
    categoria: CategoriaDocumento;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    hashSha256: string;
    bucket: string;
    storageKey: string;
    signedElectronically: boolean;
    version: number;
    uploadedAt: string;        // ISO
    uploadedBy: string;
    retentionUntil: string | null;
  }>;
}>;
```

Emitido por `create(input)` junto com o agregado (padrão `Contract`, `Amendment`).

### 5. Errors — string literal union

```ts
export type DocumentoError =
  | 'document-invalid-file-name'
  | 'document-empty-mime-type'
  | 'document-negative-size'
  | 'document-invalid-hash-sha256'
  | 'document-invalid-version'
  | 'document-retention-before-upload';
```

### 6. Port `DocumentRepository` — **declaração apenas** (impl no #4b)

Definido neste ticket como **tipo apenas** (port = contrato). Implementação (InMemory + Drizzle) entra no `CTR-DOCUMENT-AGGREGATE-PERSISTENCE`.

```ts
// src/modules/contracts/domain/document/repository.ts
export type DocumentRepositoryError = 'document-repository-unavailable';

export type DocumentRepository = Readonly<{
  findById: (id: DocumentId) => Promise<Result<DocumentoContratual | null, DocumentRepositoryError>>;
  findByParent: (
    type: 'Contract' | 'Amendment',
    parentId: ContractId | AmendmentId,
  ) => Promise<Result<readonly DocumentoContratual[], DocumentRepositoryError>>;
  save: (
    doc: DocumentoContratual,
    events: readonly ContractsModuleEvent[],
  ) => Promise<Result<void, DocumentRepositoryError>>;
}>;
```

Port aqui dá a forma; adapters virão no próximo ticket.

### 7. Public-api expõe types (não namespace ainda)

```ts
export type {
  DocumentoContratual,
  CategoriaDocumento,
  DocumentoContratualAnexado,
  CreateDocumentoContratualInput,
  DocumentoError,
  DocumentRepository,
  DocumentRepositoryError,
} from '...';
export * as Documento from '../domain/document/document.ts'; // namespace para .create
```

E adicionar `DocumentoContratualAnexado` ao `ContractsModuleEvent` union em `public-api/events.ts` + decoder v1.

## Escopo deste ticket — arquivos

### Source (criar)

| Arquivo | Conteúdo |
| :--- | :--- |
| `domain/document/types.ts` | `DocumentoContratual` + `CreateDocumentoContratualInput` + `CategoriaDocumento` |
| `domain/document/document.ts` | `create(input)` smart constructor + validações |
| `domain/document/events.ts` | `DocumentoContratualAnexado` event |
| `domain/document/errors.ts` | `DocumentoError` string literal union |
| `domain/document/repository.ts` | port `DocumentRepository` + `DocumentRepositoryError` (TYPE ONLY — sem adapters) |

### Source (modificar)

| Arquivo | Mudança |
| :--- | :--- |
| `public-api/events.ts` | + `DocumentoContratualAnexado` no `ContractsModuleEvent` union + decoder v1 |
| `public-api/index.ts` | + exports do agregado + namespace `Documento` |

### Tests (criar)

| Arquivo | Conteúdo |
| :--- | :--- |
| `tests/modules/contracts/domain/document/document.test.ts` | tests do `create()` — CA-T39..T48 (10 cenários) |

**Total:** ~7 source files (5 novos + 2 modificados) + 1 test file.

## Critérios de aceitação

- **CA1** — `DocumentoContratual` modelado como refined type `{ status: 'Active' }`. Outros estados deixados para tickets de lifecycle.
- **CA2** — `create(input): Result<DocumentoContratual, DocumentoError>` smart constructor puro. Sem I/O.
- **CA3** — `CategoriaDocumento` discriminated union com 8 valores da spec §4.3.
- **CA4** — `DocumentoContratualAnexado` event com schemaVersion=1 + payload completo. Adicionado ao `ContractsModuleEvent` union + decoder v1 em `public-api/events.ts`.
- **CA5** — `DocumentoError` string literal union com 6 variantes cobrindo as validações.
- **CA6** — Port `DocumentRepository` declarado (3 ops). Impl fica para `CTR-DOCUMENT-AGGREGATE-PERSISTENCE`.
- **CA7** — Public-api expõe types do agregado + namespace `Documento` para `.create`.
- **CA8** — 10 tests unit verdes (CA-T39..T48) em `pnpm test`.
- **CA9** — Domain puro: sem `throw`, sem `class`, sem `any`. Result em todos os retornos não-triviais.
- **CA10** — Gates W3 verdes (typecheck/format/lint/test).
- **CA11** — ASCII puro nos arquivos novos.

## Não-objetivos (já mapeados em tickets futuros)

| Ticket | Cobre |
| :--- | :--- |
| **`CTR-DOCUMENT-AGGREGATE-PERSISTENCE`** (gatilhado após este) | Schema MySQL + migration + mapper + 2 adapters (InMemory + Drizzle) + suite contratual paramétrica |
| `CTR-DOCUMENT-LIFECYCLE-DELETE` (S) | Exclusão lógica (RN-11): `excluirLogicamente`, status `'LogicallyDeleted'`, evento `DocumentoContratualExcluido` |
| `CTR-DOCUMENT-LIFECYCLE-SUBSTITUTE` (S) | Substituição/versionamento: status `'Superseded'`, `version += 1` |
| `CTR-USECASE-UPLOAD-DOCUMENT` (M) | Use case que orquestra storage + repo + evento |
| `CTR-AMENDMENT-DOCUMENT-LINK` (S) | Refator de `attachSignedDocument` para validar via `DocumentRepository.findById` |
| Agregados `EventoContratual`/`MemoriaCalculoContratual`/`EventoAuditoria` | Outras frentes (spec §4.4-§4.6) |

## Risco / pontos de atenção

1. **Tamanho do agregado** — 16 campos é grande. Mitigação: dividido em `Core & { status }` para clareza; mesmo padrão de `Contract`.
2. **Parent polimórfico no domain** — `parentId: ContractId | AmendmentId`. Casts/discrimination via `parentType` em validações.
3. **`UserRef` é UUID v4** — `src/shared/kernel/user-ref.ts` (confirmado).
4. **`StorageRef` vs `bucket` + `storageKey` separados no agregado** — usar campos separados (`bucket: BucketName`, `storageKey: StorageKey`) ao invés do `StorageRef` agregado, porque o `StorageRef` carrega hash+size+mime que JÁ existem como campos próprios no documento. Evita redundância.

## Próximo ticket gatilhado

Após `close` deste, **imediatamente** init `CTR-DOCUMENT-AGGREGATE-PERSISTENCE` (M):

- Schema `ctrDocuments` (16 colunas + 3 indexes + 5 CHECK constraints)
- Migration `0006_*.sql` (drizzle-kit generate + hardening manual)
- Mapper row ↔ domain
- `InMemoryDocumentRepository` (com outbox integration)
- `DocumentRepositoryDrizzle` (com `appendOutboxInTx`)
- Suite contratual paramétrica `runDocumentRepositoryContract(label, makeImpl)`
- 2 test files consumers (InMemory + Drizzle guarded `MYSQL_INTEGRATION=1`)
