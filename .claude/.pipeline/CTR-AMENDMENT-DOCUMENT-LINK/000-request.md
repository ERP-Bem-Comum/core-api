# 000 — Request CTR-AMENDMENT-DOCUMENT-LINK

> **Refator de `attachSignedDocument` para validar `DocumentId` via `DocumentRepository.findById`. Size S.**
> Fecha o loop com o agregado `ContractDocument` entregue em tickets anteriores: hoje `attachSignedDocument` aceita qualquer UUID como `signedDocumentRef`; depois deste ticket, valida que o documento existe.

## Justificativa

`attach-signed-document.ts` aceita `signedDocumentRef: string` (UUID v4) e valida apenas o formato via `DocumentId.rehydrate`. Não verifica que **um agregado `ContractDocument` correspondente existe**. Risco: amendment fica com `signedDocumentRef` apontando para documento fantasma (auditoria pega depois).

Agora que `DocumentRepository` está vivo (`CTR-DOCUMENT-AGGREGATE-PERSISTENCE`) + use case `uploadDocument` (`CTR-USECASE-UPLOAD-DOCUMENT`), fechar esse loop é trivial: lookup via `findById` antes de atachar.

## Decisões fixadas

### 1. `Deps` ganha `documentRepo`

```ts
type Deps = Readonly<{
  amendmentRepo: AmendmentRepository;
  documentRepo: DocumentRepository;  // NOVO
}>;
```

### 2. Error union ganha 2 variantes

```ts
export type AttachSignedDocumentError =
  | AmendmentIdError
  | DocumentIdError
  | 'amendment-not-found'
  | 'signed-document-not-found'      // NOVO
  | AmendmentError
  | AmendmentRepositoryError
  | DocumentRepositoryError;          // NOVO
```

### 3. Sequência canônica atualizada

1. `AmendmentId.rehydrate(cmd.amendmentId)` — formato
2. `DocumentId.rehydrate(cmd.signedDocumentRef)` — formato
3. `amendmentRepo.findById(amendmentId)` — existência do amendment (existente)
4. **`documentRepo.findById(documentId)` — existência do documento (NOVO)** — null → `'signed-document-not-found'`
5. `Amendment.parsePendingWithoutDocument` (existente)
6. `Amendment.attachSignedDocument` (existente)
7. `amendmentRepo.save(amendment, [event])` (existente)

### 4. Tests adicionados

| ID | Cenário |
| :--- | :--- |
| CA-L1 (existente atualizado) | happy path: upload documento via use case real + attach com o ID retornado |
| CA-L2 (NOVO) | documentId formato válido mas inexistente no repo → `'signed-document-not-found'` |
| CA-L3 (NOVO) | `documentRepo.findById` falha (mock) → `'document-repository-unavailable'` propagado |

Tests existentes que usavam `DocumentId.generate()` cru precisam ser atualizados para criar documento real via `uploadDocument` (ou via `documentRepo.save` direto para isolamento).

## Escopo

### Arquivos modificar

| Arquivo | Mudança |
| :--- | :--- |
| `application/use-cases/attach-signed-document.ts` | + `documentRepo` em Deps, + validação findById, + 2 variants no error union |
| `tests/modules/contracts/application/use-cases/attach-signed-document.test.ts` | atualizar setup (incluir documentRepo), atualizar happy path para criar doc real, + 2 tests CA-L2/L3 |

### Não toca

- `ContractDocument` agregado / port `DocumentRepository` (entregues).
- `uploadDocument` use case.
- Schema / migrations.

## Critérios de aceitação

- **CA1** — `attachSignedDocument` recebe `documentRepo: DocumentRepository` em `Deps`.
- **CA2** — `attachSignedDocument` chama `documentRepo.findById(documentId)` antes de `Amendment.attachSignedDocument`. `null` retorna `'signed-document-not-found'`.
- **CA3** — Error union estendido: `'signed-document-not-found'` + `DocumentRepositoryError`.
- **CA4** — Test CA-L1 (happy) usa documento real (criado via `documentRepo.save` ou `uploadDocument`).
- **CA5** — Test CA-L2 (documento inexistente) → `'signed-document-not-found'`.
- **CA6** — Test CA-L3 (repo falha) → `'document-repository-unavailable'`.
- **CA7** — Gates W3 verdes.
- **CA8** — ASCII puro nos arquivos modificados.

## Não-objetivos

- Validar que o documento ATIVO (status='Active') — refined type `ContractDocument` já garante (lifecycle tickets entregam outras variantes).
- Validar que `document.parentId === amendmentId` E `document.parentType === 'Amendment'` — sugestão de hardening, mas fora do escopo S. Documentar como nota futura.
- Refatorar use case `homologate-amendment` (que também usa documentId) — fora do escopo.

## Risco

1. **Tests existentes quebram** se não forem atualizados para criar documento real. Mitigação: ajustar `setupWithAmendment` para incluir documentRepo + criar doc fixture.
2. **Validação leve** — só verifica existência. Não valida ownership (`parentId/parentType` matches). Documentar como hardening futuro.
