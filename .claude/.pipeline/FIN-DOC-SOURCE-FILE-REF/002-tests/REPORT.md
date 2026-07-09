# W0 — RED — FIN-DOC-SOURCE-FILE-REF

Wave W0 (fail-first). Skill: **`tdd-strategist`**. Módulo `financial`, feature 034 (fatia 2, ticket 1/3), épico #62. Só testes RED — nenhum `src/` de produção tocado.

## Exploração-base (Explore + leitura direta)

- `DocumentCore` (`domain/document/types.ts:52-85`) = núcleo de `OpenDocument`/`ApprovedDocument`; `DraftDocument` (`:93-122`) é o rascunho parcial. O ingest cria **rascunho** via `saveDraft` (`document.ts:577`, `SaveDraftInput` `:541`). O campo `sourceFileRef` entra em `DocumentCore` **e** `DraftDocument` (espelha o padrão nullable de `issueDate`/`competencia`).

## Teste RED — `source-file-ref.test.ts`

| CA | Assere |
| :-- | :-- |
| CA1 | `SourceFileRef.create` — válido → ok; hash malformado → `source-file-hash-invalid`; size 0 → `source-file-size-invalid`; key `../` → `source-file-key-invalid`; bucket vazio → `source-file-bucket-invalid` |
| CA2 | `saveDraft({ sourceFileRef })` → `document.sourceFileRef` igual; sem ref → `null` (back-compat) |

Convenções: `node:test`, `#src/*`, VO próprio do financial (**não** importa `StorageRef` de contracts — ADR-0006).

## Saída literal RED

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../domain/document/source-file-ref.ts'
✖ source-file-ref.test.ts · fail 1
```

Causa raiz esperada: VO `SourceFileRef` inexistente (é o W1). Sem regressão.

## Contrato a implementar no W1

VO `SourceFileRef` (`{ bucket, key, hashSha256, sizeBytes, mimeType }` + `create()`); `sourceFileRef` em `DocumentCore` + `DraftDocument`; `SaveDraftInput.sourceFileRef?`; `saveDraft`/`create` propagam; migration (`source_file_*` nullable) + mapper round-trip. **CA3 (mapper) e CA4 (MySQL real) entram no W1** com seus testes. Próximo: **W1** (`ts-domain-modeler` + `drizzle-schema-author`).
