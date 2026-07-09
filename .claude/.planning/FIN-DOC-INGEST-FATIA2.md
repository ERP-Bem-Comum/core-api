# Fatia 2 de feature 034 — Ingestão de documento (borda + storage + wiring)

> **Decisões da P.O. (Gabriel, 2026-07-09):**
> - **Fluxo = INGEST COMPLETO:** `POST /api/v2/financial/documents/ingest` — upload → guarda o PDF-fonte no S3 → cria rascunho pré-preenchido (saveDraft) → devolve `documentId` + `resolvedVia` + campos lidos. O humano confere/edita/submete (o motor nunca confirma sozinho — #62 CA4).
> - **Vínculo do arquivo-fonte = campo `sourceFileRef` no agregado `Document`** (o documento é dono do seu comprovante). +colunas nullable em `fin_documents`.

## Arquitetura (ADR-0006)

O **domínio do financial não importa cross-módulo** — nem `StorageRef` de contracts. Logo:
- O `Document` (domínio) define **VO próprio `SourceFileRef`** (`{ bucket, key, hashSha256, sizeBytes, mimeType }`).
- A conversão `StorageRef` (contracts, via `contracts/public-api`) → `SourceFileRef` (financial) acontece na **application** (use case), que pode importar `contracts/public-api`.
- Storage reusa o adapter S3 de contracts (`createS3DocumentStorage`/`createInMemoryDocumentStorage`, exportados na public-api).

## Fatiamento (W0→W3 cada, 1 camada/ticket)

| # | Ticket | Camada | Size | Escopo |
| :-- | :-- | :-- | :-: | :-- |
| 1 | **FIN-DOC-SOURCE-FILE-REF** | domínio + persistência | M | VO `SourceFileRef` + `Document.sourceFileRef` (opcional) via `saveDraft`; migration (colunas `source_file_*` nullable em `fin_documents`); mapper row↔domínio |
| 2 | **FIN-DOC-INGEST-USECASE** | application + adapters | L | mapper puro `readerResultToDraft` (Money→cents, `SupplierIdentity`→supplierRef/nulo, `Competencia`→string, retenções); use case `ingestDocument` (storage.upload + reader.read + saveDraft c/ sourceFileRef); storage no financial (reuso public-api); composição memory/mysql |
| 3 | **FIN-DOC-INGEST-HTTP** | borda HTTP | M | rota `POST /financial/documents/ingest`; upload seguro (portar `octet-stream` parser + magic-bytes + `sanitizeFilename` de contracts); Zod (allowlist mime, query metadados); `authorize(FINANCIAL_PERMISSION.write)`; `DocumentReaderError`→status em `error-mapping.ts` |

## Comportamento do use case `ingestDocument` (a confirmar no #2)

- **Erro de RECURSO** do reader (`decompression-limit-exceeded`/`source-too-large`/`empty-input`) → rejeita tudo (413/400), **não** guarda o PDF.
- **Erro de LEITURA** (`scanned-unsupported`/`unsupported-pdf-structure`/`malformed-document`) → guarda o PDF + cria rascunho **vazio** (só `sourceFileRef`), `resolvedVia=null`; humano preenche à mão.
- **Sucesso** → guarda o PDF + rascunho pré-preenchido com os campos.

## Reuso mapeado (Explore 2026-07-09)

- Upload seguro: `contracts/adapters/http/plugin.ts:125-167` (parser, magic-bytes, sanitize) + `schemas.ts:320-334,484-494` (allowlist, query).
- Storage: `contracts/adapters/storage/document-storage.s3.ts` + `.in-memory.ts` + VOs `document-storage.types.ts`; exportados em `contracts/public-api/index.ts:33-52`.
- save-draft: `financial/application/use-cases/save-draft.ts` (`SaveDraftCommand`, cents/string).
- Composição: `financial/adapters/http/composition.ts` (`Pools`/`makeDeps`/`FinancialCompositionConfig`).
- Permissão: `FINANCIAL_PERMISSION.write` (`fiscal-document:write`).
