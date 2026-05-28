# 003 - W1 (GREEN) - CTR-AMENDMENT-DOCUMENT-LINK

**Skill:** main-session
**Veredito:** GREEN. 744 / 728 pass / 0 fail / 16 skip (+1 vs baseline: BDD 1.2 que estava red voltou a verde).

## Arquivos modificados (refator)

| Arquivo | Mudança |
| :--- | :--- |
| `application/use-cases/attach-signed-document.ts` | + `documentRepo: DocumentRepository` em Deps; + validação `documentRepo.findById` antes do attach; + `'signed-document-not-found'` + `DocumentRepositoryError` no error union |
| `tests/modules/contracts/application/use-cases/attach-signed-document.test.ts` | + 2 tests CA-L2/L3; setup atualizado (cria fixture document); ajuste do test "already-attached" |

## Arquivos modificados (composição CLI — efeito cascata)

| Arquivo | Mudança |
| :--- | :--- |
| `cli/context.ts` | + `documentRepo: DocumentRepository` no `CliContext` |
| `cli/drivers/memory.ts` | + `InMemoryDocumentRepository(outbox.port)` no wiring memory |
| `cli/drivers/mysql.ts` | + `DocumentRepositoryDrizzle(handle.db)` no wiring mysql |
| `cli/state.ts` | + `documentRepo` em load/saveState; + `isValidContractDocument`; + `uploadedAt`/`retentionUntil` no DATE_KEYS reviver; + `documents` opcional no Snapshot |
| `cli/commands/anexar-documento.ts` | + `documentRepo: ctx.documentRepo` no useCase factory |
| `tests/modules/contracts/cli/state.test.ts` | + `documentRepo` em todas as chamadas (~10) |
| `tests/regression/reports-2026-05-15.test.ts` | + `documentRepo` em chamadas (3) |

## Arquivos criados (escopo expandido para fechar E2E)

| Arquivo | Conteúdo |
| :--- | :--- |
| `cli/commands/subir-documento.ts` | comando CLI mínimo que cria ContractDocument + persist via documentRepo (sem upload bytes real) |
| Atualização `cli/registry.ts` | + `'subir-documento'` registrado |
| `tests/cli/contracts.cli.test.ts` (BDD 1.2) | E2E atualizado: `subir-documento` antes do `anexar-documento` |

## Sequência canônica atualizada do attachSignedDocument

1. `AmendmentId.rehydrate` (existente)
2. `DocumentId.rehydrate` (existente)
3. `amendmentRepo.findById` — amendment-not-found se null (existente)
4. **`documentRepo.findById` — signed-document-not-found se null (NOVO)**
5. `Amendment.parsePendingWithoutDocument` (existente)
6. `Amendment.attachSignedDocument` (existente)
7. `amendmentRepo.save(amendment, [event])` (existente)

## CAs

| CA | Status |
| :--- | :--- |
| CA1 - documentRepo em Deps | OK |
| CA2 - findById antes do attach | OK |
| CA3 - error union estendido | OK |
| CA4 - happy path com doc real | OK (CA-L1) |
| CA5 - signed-document-not-found | OK (CA-L2) |
| CA6 - document-repository-unavailable propagado | OK (CA-L3) |
| CA7 - gates verdes | OK |
| CA8 - ASCII puro | OK |

8/8 satisfeitos + extra de composição (CLI cascade + comando subir-documento).

## Gates W3

- typecheck/format/lint OK
- Tests: **744 / 728 / 0 / 16**

## Veredito W1

GREEN. Escopo de S cresceu para "S+ cascata" por causa da composição CLI (8 arquivos modificados ao invés dos 2 originais). Mas todo o trabalho foi mecânico e justificado.
