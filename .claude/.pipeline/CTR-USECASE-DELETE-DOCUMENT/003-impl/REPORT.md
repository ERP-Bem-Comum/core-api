# 003 - W1 (GREEN) - CTR-USECASE-DELETE-DOCUMENT

**Veredito:** GREEN. 761 / 745 / 0 / 16 (+5 CA-DEL1..DEL5).

## Arquivos criados

| Arquivo | Conteúdo |
| :--- | :--- |
| `application/use-cases/delete-document.ts` | use case factory `deleteDocument(deps)(cmd)` |
| `cli/commands/excluir-documento.ts` | comando CLI `excluir-documento --documento --motivo --user-id?` |
| `migrations/mysql/0003_mature_jack_murdock.sql` | ALTER ctr_documents + 3 colunas + CHECK consistência + hardening utf8mb4_bin |
| `tests/.../delete-document.test.ts` | 5 tests CA-DEL1..DEL5 |

## Arquivos modificados

| Arquivo | Mudança |
| :--- | :--- |
| `schemas/mysql.ts` | + 3 colunas nullable (`deleted_at`, `deleted_by`, `deleted_reason`) + CHECK consistência |
| `mappers/document.mapper.ts` | discrimina por status no from/to (Active + LogicallyDeleted) |
| `cli/state.ts` | + `'deletedAt'` no DATE_KEYS; + branch `LogicallyDeleted` no validator |
| `cli/registry.ts` | + `'excluir-documento'` |
| `public-api/index.ts` | + exports `deleteDocument` + types |

## Sequência canônica

1. `DocumentId.rehydrate` 
2. `UserRef.rehydrate`
3. `documentRepo.findById` → null = `'document-not-found'`
4. Switch `doc.status`:
   - `'Active'` → continua
   - `'LogicallyDeleted'` → `'document-already-deleted'`
   - `'Superseded'` → `'document-already-superseded'`
5. `Document.logicallyDelete(active, reason, by, clock.now())`
6. `documentRepo.save(deleted, [event])`

## CAs

| CA | Status |
| :--- | :--- |
| CA1 - use case factory | OK |
| CA2 - errors discriminados | OK |
| CA3 - schema + migration | OK |
| CA4 - mapper round-trip Active/LogicallyDeleted | OK (5/5 tests cobrem indireto via use case) |
| CA5 - state validator estendido | OK |
| CA6 - CLI command registrado | OK |
| CA7 - tests CA-DEL1..DEL5 verdes | OK |
| CA8 - gates W3 verdes | OK |
| CA9 - zero regressão | OK |

9/9 satisfeitos.

## Gates W3

- typecheck/format/lint OK
- Tests: **761 / 745 / 0 / 16**

## Veredito W1

GREEN. Lifecycle DELETE completo ponta-a-ponta (domain + schema + migration + mapper + state + use case + CLI).
