# 003 - W1 (GREEN) - CTR-USECASE-UPLOAD-DOCUMENT

**Skill:** main-session
**Veredito:** GREEN. 742 / 726 pass / 0 fail / 16 skip (+6 vs baseline).

## Arquivos criados

| Arquivo | Conteúdo |
| :--- | :--- |
| `src/modules/contracts/application/use-cases/upload-document.ts` | use case factory `uploadDocument(deps)(cmd)` (~150 linhas) |
| `tests/modules/contracts/application/use-cases/upload-document.test.ts` | 6 tests CA-U1..U6 (criado em W0) |

## Arquivos modificados

| Arquivo | Mudanca |
| :--- | :--- |
| `public-api/index.ts` | + exports `uploadDocument` + types |

## Sequencia canonica do use case

1. Validar `parentId` via smart constructor (`ContractId.rehydrate` OR `AmendmentId.rehydrate`)
2. Validar `uploadedBy` via `UserRef.rehydrate`
3. Validar `bucket` via `createBucketName`
4. Verificar parent existe (`contractRepo.findById` OR `amendmentRepo.findById`); null → `'parent-not-found'`
5. Gerar `documentId` (via `deps.idGenerator ?? DocumentId.generate`)
6. Construir `storageKey = ${prefix}/${docId}/${fileName}` + validar via `createStorageKey`
7. Defensive copy dos bytes via `.slice()` + calcular hash SHA-256 (`node:crypto`)
8. Upload no storage com `expectedSha256` (defesa em profundidade)
9. Criar agregado via `Document.create({ ...uploadedAt: deps.clock.now() })`
10. `documentRepo.save(doc, [event])` — outbox integration via repo
11. Retornar `{ document, event }`

## CAs

| CA | Status |
| :--- | :--- |
| CA1 - factory function | OK |
| CA2 - sequencia canonica | OK |
| CA3 - expectedSha256 enviado para storage.upload | OK |
| CA4 - parent-not-found quando repo retorna null | OK (CA-U2) |
| CA5 - documentRepo.save persiste agregado + evento no outbox | OK (CA-U1 outbox observed indirectly) |
| CA6 - uploadedAt = clock.now() | OK (CA-U1 verifica timestamp fixed) |
| CA7 - public-api exports | OK |
| CA8 - 6 tests CA-U1..U6 verdes | OK |
| CA9 - gates W3 verdes | OK |
| CA10 - ASCII puro | OK |

10/10 satisfeitos.

## Gates W3

- typecheck OK
- format:check OK
- lint OK (apos ajuste de eslint-disable em posicao correta)
- tests 742 / 726 / 0 / 16

## Veredito W1

GREEN. Pronto para W2 + W3.
