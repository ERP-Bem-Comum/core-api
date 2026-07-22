# W0 — RED — FIN-DOC-INGEST-USECASE

Wave W0 (fail-first). Skill: **`tdd-strategist`**. Módulo `financial`, feature 034 (fatia 2, ticket 2/3), épico #62. Só testes RED — nenhum `src/` de produção tocado.

## Teste RED — `ingest-document.test.ts`

Fakes: `createMockDocumentReader` (existe, do PORT) + spies inline de `storage` e `saveDraft` (capturam chamadas → testam a ORQUESTRAÇÃO, não persistência real).

| CA | Assere |
| :-- | :-- |
| CA4 | `readerResultToDraft(SEED)` — `Money→cents`, `Competencia→'2026-04'`, `Retention VO→RetentionInput`, `supplier→description` (RAZAO + CNPJ); `supplierRef` ausente |
| CA1 | sucesso → `storage.upload` 1×, `saveDraft` com `type='NFS-e'` + `sourceFile`, `resolvedVia='xml'` |
| CA2 | reader `scanned-unsupported` → `storage.upload` 1× (guarda), `saveDraft` sem `type` (vazio) mas com `sourceFile`, `resolvedVia=null` |
| CA3 | reader `decompression-limit-exceeded` (recurso) → `err`, `storage.upload` **0×**, `saveDraft` **0×** |
| CA6 | `storage.upload` err → `ingest` err, `saveDraft` 0× |

## Saída literal RED

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../application/document-reader-to-draft.ts'
ℹ tests 1 · pass 0 · fail 1
```

Causa raiz esperada: `readerResultToDraft` + `ingestDocument` + port `SourceFileStoragePort` inexistentes (W1). Sem regressão.

## Contrato a implementar no W1

Port `source-file-storage.ts`; adapters in-memory + s3 (envelopa `contracts/public-api` `createS3DocumentStorage`); mapper `document-reader-to-draft.ts`; estender `save-draft.ts` (`id?` + `sourceFile?`); use case `ingest-document.ts` (por classe de erro); composição. Próximo: **W1** (`ports-and-adapters`).
