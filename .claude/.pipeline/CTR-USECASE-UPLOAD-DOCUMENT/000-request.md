# 000 — Request CTR-USECASE-UPLOAD-DOCUMENT

> **Use case `uploadDocument` orquestrando storage + agregado + outbox. Size M.**
> 5º ticket entregue da frente Storage. Liga as peças entregues nos tickets anteriores:
> `DocumentStorage` (port + adapters), `ContractDocument` (agregado), `DocumentRepository` (port + adapters).

## Justificativa

Sem `uploadDocument`:
- Não há orquestração entre storage e agregado.
- `attachSignedDocument` continua usando `DocumentId` opaco sem validar que o documento existe.
- Spec §13.3 `DocumentoContratualAnexado` nunca é emitido em prod.

Este ticket entrega o use case canônico que: valida parent existe → calcula hash → upload no storage → cria agregado → save com evento.

## Decisões fixadas

### 1. Signature

```ts
export type UploadDocumentCommand = Readonly<{
  parentType: 'Contract' | 'Amendment';
  parentId: string;            // UUID raw
  categoria: DocumentCategory;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  signedElectronically: boolean;
  uploadedBy: string;          // UUID raw
  retentionUntil: Date | null;
  bucket: string;              // raw, validado via createBucketName
  storageKeyPrefix: string;    // raw, ex.: 'contracts/2026'
}>;

export type UploadDocumentOutput = Readonly<{
  document: ContractDocument;
  event: DocumentEvent;
}>;
```

### 2. Sequência canônica (validar → fetch → domain → persist → outbox)

1. **Validar inputs primitivos** via smart constructors:
   - `parentId` → `ContractId.rehydrate` OR `AmendmentId.rehydrate` (conforme `parentType`)
   - `uploadedBy` → `UserRef.rehydrate`
   - `bucket` → `createBucketName`
2. **Validar parent existe** via repo:
   - `parentType === 'Contract'` → `contractRepo.findById(parentId)` (deve retornar non-null)
   - `parentType === 'Amendment'` → `amendmentRepo.findById(parentId)`
3. **Gerar IDs**:
   - `documentId` via `DocumentId.generate()` (ou injeção)
   - `storageKey` derivada: `${storageKeyPrefix}/${documentId}/${fileName}` (validada via `createStorageKey`)
4. **Calcular hash SHA-256** dos bytes (via `node:crypto` na boundary do use case).
5. **Upload no storage** com `expectedSha256` para validação server-side.
6. **Criar agregado** via `Document.create({...})` (com `uploadedAt = clock.now()`).
7. **Save no repo** com `[event]` (transação ACID via Drizzle / sequencial InMemory).
8. Retornar `{ document, event }`.

### 3. Deps do use case

```ts
type Deps = Readonly<{
  clock: Clock;
  storage: DocumentStorage;
  documentRepo: DocumentRepository;
  contractRepo: ContractRepository;
  amendmentRepo: AmendmentRepository;
  idGenerator?: () => DocumentId;  // default = DocumentId.generate; injeção para determinismo em tests
}>;
```

### 4. Errors — union completa

```ts
export type UploadDocumentError =
  | DocumentIdError
  | ContractIdError
  | AmendmentIdError
  | UserRefError
  | BucketNameError
  | StorageKeyError
  | 'parent-not-found'
  | ContractRepositoryError
  | AmendmentRepositoryError
  | DocumentStorageError
  | ContractDocumentError
  | DocumentRepositoryError;
```

### 5. Pure boundary do hash

Hash SHA-256 calculado dentro do use case via `node:crypto.createHash`. Documenta acoplamento limitado a `Uint8Array` — port `DocumentStorage` aceita bytes diretos.

### 6. Não emite evento via `EventBus`

Padrão CTR-OUTBOX-INTEGRATION-IN-REPOS: evento entra no outbox via `documentRepo.save(doc, [event])`. Sem `eventBus.publish` direto.

## Escopo

### Arquivos criar

| Arquivo | Conteúdo |
| :--- | :--- |
| `src/modules/contracts/application/use-cases/upload-document.ts` | Use case factory `uploadDocument(deps)(cmd)` |
| `tests/modules/contracts/application/use-cases/upload-document.test.ts` | Tests CA-U1..U6 (happy + 5 error paths) |

### Arquivos modificar

| Arquivo | Mudança |
| :--- | :--- |
| `src/modules/contracts/public-api/index.ts` | + export `uploadDocument` (function), `UploadDocumentCommand`/`Output`/`Error` types |

### Não toca

- `attach-signed-document.ts` — refator para validar via `DocumentRepository.findById` fica em `CTR-AMENDMENT-DOCUMENT-LINK` (S).
- Schema MySQL — já tem `ctr_documents` desde `CTR-DOCUMENT-AGGREGATE-PERSISTENCE`.

## Critérios de aceitação

- **CA1** — `uploadDocument` é factory function `(deps) => (cmd) => Promise<Result<Output, Error>>`. Sem mutação, sem `throw`.
- **CA2** — Sequência canônica: validar → fetch parent → gerar IDs → hash → storage.upload → Document.create → repo.save → retornar.
- **CA3** — `expectedSha256` enviado para `storage.upload` (defesa em profundidade contra corrupção em transit).
- **CA4** — `parent-not-found` retornado quando `contractRepo.findById` ou `amendmentRepo.findById` retorna `null`.
- **CA5** — `documentRepo.save(doc, [event])` persiste o agregado + appenda evento no outbox.
- **CA6** — `uploadedAt` derivado de `clock.now()` (não `new Date()`).
- **CA7** — Public-api expõe `uploadDocument`, `UploadDocumentCommand`, `UploadDocumentOutput`, `UploadDocumentError`.
- **CA8** — Tests CA-U1..U6 verdes em `pnpm test`:
  - CA-U1: happy path → ok com `document` válido + `event` correto
  - CA-U2: parentType=Contract com parentId inexistente → `parent-not-found`
  - CA-U3: storage.upload retorna err → propagado
  - CA-U4: documentRepo.save retorna err → propagado
  - CA-U5: input com fileName vazio → `ContractDocumentError 'document-invalid-file-name'`
  - CA-U6: hash de storage retorna `integrity-mismatch` (mock simulando corrupção) → propagado
- **CA9** — Gates W3 verdes.
- **CA10** — ASCII puro no source novo.

## Não-objetivos

- **`attach-signed-document` refactor** — `CTR-AMENDMENT-DOCUMENT-LINK` (S).
- **Exclusão lógica / substituição** — tickets de lifecycle (`CTR-DOCUMENT-LIFECYCLE-*`).
- **CLI command `subir-documento`** — pode entrar em ticket separado (`CTR-CLI-UPLOAD`).
- **Composition root real** (CLI driver memory/mysql wiring) — pode entrar quando CLI tiver a feature.

## Risco

1. **Validação de parent** — 2 lookups possíveis (contract OR amendment) conforme parentType. Garantir branching limpo.
2. **`expectedSha256` semantica** — hash calculado **antes** do `storage.upload`. Caller mutou bytes entre cálculo e upload? Mitigação: usar `bytes.slice()` para snapshot defensivo.
3. **`storageKey` construída pelo use case** — formato `${prefix}/${docId}/${fileName}`. Documentar para evitar surpresa.
