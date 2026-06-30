# 003 - W1 (GREEN) - CTR-USECASE-SUPERSEDE-DOCUMENT

**Veredito:** GREEN. 767 / 751 / 0 / 16 (+6 CA-SUP1..SUP6).

## Arquivos criados

| Arquivo | Conteúdo |
| :--- | :--- |
| `application/use-cases/supersede-document.ts` | `supersedeDocument(deps)(cmd)` factory |
| `cli/commands/substituir-documento.ts` | comando CLI `--documento --substituido-por [--user-id]` |
| `migrations/mysql/0004_fast_shatterstar.sql` | ALTER + 3 colunas + CHECK + hardening utf8mb4_bin |
| `tests/.../supersede-document.test.ts` | 6 tests CA-SUP1..SUP6 |

## Arquivos modificados

| Arquivo | Mudança |
| :--- | :--- |
| `schemas/mysql.ts` | + 3 colunas (`superseded_at`, `superseded_by`, `superseded_by_document_id`) + CHECK consistência |
| `mappers/document.mapper.ts` | branch Superseded ativo (from + to com 3 campos) |
| `cli/state.ts` | + `supersededAt` em DATE_KEYS + branch `Superseded` no validator |
| `cli/registry.ts` | + `substituir-documento` |
| `public-api/index.ts` | + exports `supersedeDocument` + types |

## Sequência canônica

1. `DocumentId.rehydrate` (documentId + supersededByDocumentId)
2. `UserRef.rehydrate` (supersededBy)
3. `findById(documentId)` → null = `document-not-found`
4. `findById(supersededByDocumentId)` → null = `supersede-target-not-found`
5. Switch `doc.status`: Active continua; LogicallyDeleted = already-deleted; Superseded = already-superseded
6. `Document.supersede(active, byDocId, by, clock.now())` (propaga `document-supersede-self` se self-ref)
7. `repo.save(superseded, [event])`

## CAs

9/9 satisfeitos.

## Gates W3

- typecheck/format/lint OK
- Tests: **767 / 751 / 0 / 16**

## Veredito W1

GREEN. Lifecycle SUPERSEDE completo ponta-a-ponta. Frente lifecycle inteira do agregado ContractDocument entregue.
