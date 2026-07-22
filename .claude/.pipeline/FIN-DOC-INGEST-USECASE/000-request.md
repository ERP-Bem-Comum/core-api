# FIN-DOC-INGEST-USECASE — escopo

> Feature **034-fin-documento-reader** (fatia 2 de feature, ticket 2/3 — o coração do wiring). Módulo **`financial`**. Épico **#62**. Size **L**.
> Depende de `FIN-DOC-SOURCE-FILE-REF` (#1, `Document.sourceFileRef`). Sem HTTP (fatia 3). Plano: `.claude/.planning/FIN-DOC-INGEST-FATIA2.md`.
> Decisão P.O. (2026-07-09): **supplierRef nulo** no ingest (humano seleciona; CNPJ/razão vão na `description`).

## Escopo (in)

1. **Port `application/ports/source-file-storage.ts`** — `SourceFileStoragePort = Readonly<{ upload }>`, `upload(input) => Promise<Result<SourceFileRef, SourceFileStorageError>>`. **Port próprio do financial** — `contracts/public-api` NÃO exporta o port `DocumentStorage` nem `StorageRef` nem o in-memory (só `createS3DocumentStorage`). Erros EN kebab.
2. **Adapters de storage:**
   - `adapters/storage/source-file-storage.in-memory.ts` — fake determinístico (hash real dos bytes via `node:crypto`), guarda em `Map` (teste + boot sem S3).
   - `adapters/storage/source-file-storage.s3.ts` — **envelopa `createS3DocumentStorage`** de `contracts/public-api`; gera `key = ${prefix}/${documentId}/${fileName}`, chama `upload` com `expectedSha256`, converte `StorageRef`(contracts) → `SourceFileRef`(financial VO). Config: bucket + keyPrefix.
3. **Mapper puro `application/document-reader-to-draft.ts`** — `readerResultToDraft(result): …` mapeia `DocumentReaderResult` → subconjunto de `SaveDraftCommand`: `Money`→cents, `Competencia`→string, `Retention[]`→`RetentionInput[]`, `supplier{legalName,taxId}`→texto na `description`; **`supplierRef` omitido** (null).
4. **Estender `save-draft.ts`** — `SaveDraftCommand.id?: DocumentId` (o ingest fornece; senão gera) + `sourceFile?: SourceFileRefInput | null` (use case constrói o VO `SourceFileRef.create` e passa ao domínio, que já aceita — #1). `SaveDraftError += SourceFileRefError`.
5. **Use case `application/use-cases/ingest-document.ts`** — `ingestDocument(deps)(cmd) => Result<{ documentId, resolvedVia, sourceFile }, IngestError>`. Deps: `reader: DocumentReaderPort`, `storage: SourceFileStoragePort`, `saveDraft`, `idGen`. Fluxo **por classe de erro do reader**:
   - RECURSO (`decompression-limit-exceeded`/`source-too-large`/`empty-input`) → `err`, **NÃO guarda** o PDF.
   - LEITURA (`scanned-unsupported`/`unsupported-pdf-structure`/`malformed-document`) → segue: guarda o PDF + rascunho **vazio** (só `sourceFile`), `resolvedVia=null`.
   - Sucesso → guarda o PDF + rascunho **pré-preenchido**.
6. **Composição** (`adapters/http/composition.ts`) — injeta `createDocumentReader()` (puro) + `documentStorage` (in-memory/s3 por driver) + `ingestDocument` nas deps.

## Fora de escopo (ticket #3)

- Borda HTTP `POST /documents/ingest` (upload seguro + Zod + error-mapping).
- Auto-resolver fornecedor por CNPJ (enriquecimento — fatia futura).

## Critérios de aceite (com fakes: mock reader + in-memory storage + in-memory repo)

- **CA1 — sucesso.** reader ok → guarda PDF (storage.upload chamado) + rascunho com type/documentNumber/competencia/issueDate/grossValueCents/retentions + `sourceFile`; devolve `resolvedVia`.
- **CA2 — erro de leitura.** reader `scanned-unsupported` → **guarda** PDF + rascunho vazio (só `sourceFile`), `resolvedVia=null`.
- **CA3 — erro de recurso.** reader `decompression-limit-exceeded` → `err`, storage **NÃO** chamado, nenhum rascunho criado.
- **CA4 — mapper puro.** `readerResultToDraft` — Money→cents, Competencia→'YYYY-MM', Retention VO→RetentionInput, supplier→description; supplierRef ausente.
- **CA5 — sourceFile no rascunho.** o rascunho persistido carrega o `sourceFileRef` (via saveDraft estendido).
- **CA6 — upload falha.** storage.upload err → `ingestDocument` err (sem rascunho).

## Pipeline (agentes por wave)

| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED — mapper + use case + port (fakes) | skill **`tdd-strategist`** |
| W1 | port + 2 adapters + mapper + estende saveDraft + use case + composição | skill **`ports-and-adapters`** |
| W2 | audit (pureza do mapper, orquestração, ADR-0006 no adapter S3, segurança do fluxo de upload) | skill **`code-reviewer`** + agente **`security-backend-expert`** |
| W3 | gate | skill **`ts-quality-checker`** |

## DoD

Gate W3 verde. `ingestDocument` compõe reader + storage + saveDraft com `sourceFileRef`, por classe de erro; validado com fakes. Desbloqueia `FIN-DOC-INGEST-HTTP` (#3).
