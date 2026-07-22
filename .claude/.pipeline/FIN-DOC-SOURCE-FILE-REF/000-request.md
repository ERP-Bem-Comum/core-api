# FIN-DOC-SOURCE-FILE-REF — escopo

> Feature **034-fin-documento-reader** (fatia 2 de feature, ticket 1/3 — fundação de domínio). Módulo **`financial`**. Épico **#62**. Size **M**.
> Habilita o ingest completo: o agregado `Document` passa a ser **dono do seu comprovante** (o PDF-fonte guardado). Decisão da P.O. (2026-07-09): `sourceFileRef` no agregado. Plano: `.claude/.planning/FIN-DOC-INGEST-FATIA2.md`.

## Escopo (in)

1. **VO `SourceFileRef`** em `domain/document/source-file-ref.ts` — `{ bucket, key, hashSha256, sizeBytes, mimeType }` imutável, com smart constructor `create(input): Result<SourceFileRef, SourceFileRefError>`:
   - `bucket`/`key` não-vazios; `key` **sem path-traversal** (`..`, `./`, control chars);
   - `hashSha256` = 64 hex chars;
   - `sizeBytes` inteiro > 0;
   - `mimeType` não-vazio.
   - **VO PRÓPRIO do financial** — NÃO importar `StorageRef` de contracts (ADR-0006: domínio não importa cross-módulo). Erros EN kebab: `source-file-bucket-invalid` | `source-file-key-invalid` | `source-file-hash-invalid` | `source-file-size-invalid` | `source-file-mime-invalid`.
2. **`Document.saveDraft`** aceita `sourceFileRef?: SourceFileRef | null` → entra no `OpenDocument` (campo opcional). Sem quebrar as chamadas existentes (nullable/omitível).
3. **Migration** — colunas `source_file_{bucket,key,hash_sha256,size_bytes,mime}` **nullable** em `fin_documents` (widening só adiciona colunas NULL — seguro, ADR-0020; sem hint ALGORITHM). `bigint` para `size_bytes`, `varchar` para os demais.
4. **Mapper** `document.mapper.ts` — persiste `sourceFileRef` → colunas; reidrata colunas → `SourceFileRef` (via smart constructor; row inválida → `Result` err, domínio rejeita).

## Fora de escopo (tickets seguintes)

- Use case `ingestDocument` + mapper `readerResult→draft` + storage (`FIN-DOC-INGEST-USECASE`).
- Borda HTTP `POST /documents/ingest` (`FIN-DOC-INGEST-HTTP`).

## Critérios de aceite

- **CA1 — VO valida.** `SourceFileRef.create` com input válido → `ok`; sha256 malformado / size 0 / key com `..` / bucket vazio → `err` específico.
- **CA2 — agregado carrega a ref.** `Document.saveDraft({ ..., sourceFileRef })` → `OpenDocument.sourceFileRef` presente e igual; sem `sourceFileRef` → `null`/omitido (compat retro).
- **CA3 — mapper round-trip.** domínio (com `sourceFileRef`) → row → domínio preserva os 5 campos; row com hash inválido → `err`.
- **CA4 — persistência real.** Migration aplica em MySQL 8.4 e um insert/select com `source_file_*` preservado (validação no banco real — Docker/x99).

## Pipeline (agentes por wave)

| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED — VO + saveDraft + mapper round-trip | skill **`tdd-strategist`** |
| W1 | VO + campo no agregado + migration + mapper | skill **`ts-domain-modeler`** + **`drizzle-schema-author`** |
| W2 | audit (VO puro, imutabilidade, ADR-0006, mapper→Result, migration segura) | skill **`code-reviewer`** + agente **`drizzle-orm-expert`** |
| W3 | gate | skill **`ts-quality-checker`** |

## DoD

Gate W3 verde + migration validada no MySQL real. `Document` carrega `sourceFileRef` opcional ponta-a-ponta (domínio→persistência). Desbloqueia `FIN-DOC-INGEST-USECASE`.
