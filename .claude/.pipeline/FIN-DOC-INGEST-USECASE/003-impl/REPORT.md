# W1 — GREEN — FIN-DOC-INGEST-USECASE

Wave W1. Skill: **`ports-and-adapters`**. Módulo `financial`, feature 034 (fatia 2, ticket 2/3), épico #62.

## Entregue (6 componentes)

1. **Port `application/ports/source-file-storage.ts`** — `SourceFileStoragePort.upload(input) => Result<SourceFileRef, 'source-file-upload-failed'>`. Recebe bytes (ADR-0050), devolve o VO pronto.
2. **Adapter in-memory** (`adapters/storage/source-file-storage.in-memory.ts`) — `Map` + hash SHA-256 real dos bytes (`node:crypto`). Teste + boot sem S3.
3. **Adapter S3** (`adapters/storage/source-file-storage.s3.ts`) — **`@aws-sdk/client-s3` DIRETO** (não reusa `DocumentStorage` de contracts: ele exige VOs branded `BucketName`/`StorageKey` não-exportados; ADR-0006 = cada módulo dono do seu adapter). Reusa só `S3StorageConfig`/`parseAwsS3Env`.
4. **Mapper puro `application/document-reader-to-draft.ts`** — `readerResultToDraft`: Money→cents, Competencia→'YYYY-MM', Retention VO→RetentionInput, `supplier`→`description`; `supplierRef` omitido (decisão P.O.).
5. **`save-draft.ts` estendido** — `SaveDraftCommand.id?` (ingest fornece p/ casar a key) + `sourceFile?: SourceFileRefInput` (use case constrói o VO e passa ao domínio). `SaveDraftError += SourceFileRefError`.
6. **Use case `ingest-document.ts`** — orquestra reader + storage + saveDraft **por classe de erro**: RECURSO rejeita (não guarda); LEITURA guarda + rascunho vazio; sucesso pré-preenche. + **composição** (`documentReader` puro + `documentStorage` por driver + `ingestDocument` nas deps).

## CA → resultado

| CA | Estado |
| :-- | :-- |
| CA1 sucesso → guarda + pré-preenche + resolvedVia | ✔ |
| CA2 leitura falha → guarda + rascunho vazio + resolvedVia null | ✔ |
| CA3 recurso (bomb) → err, NÃO guarda | ✔ |
| CA4 mapper puro | ✔ |
| CA5 sourceFile no rascunho (via command estendido) | ✔ |
| CA6 upload falha → err | ✔ |

## Gates parciais

```
node --test ingest-document.test.ts → 5 pass / 0 fail
node --test tests/modules/financial   → 690 pass / 0 fail (zero regressão do save-draft central)
node --test .../adapters/http          → 212 pass / 0 fail (composição via fastify.inject)
pnpm run typecheck                     → exit 0
eslint (arquivos novos + composition)  → 0 errors
```

Próximo: **W2** (`code-reviewer` + `security-backend-expert` — fluxo de upload) + **W3**.
