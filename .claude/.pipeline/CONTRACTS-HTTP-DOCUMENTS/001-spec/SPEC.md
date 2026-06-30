# SPEC — CONTRACTS-HTTP-DOCUMENTS (C3)

> Refina [`000-request.md`](../000-request.md). Decisões de transporte e fluxo resolvidas via sessão de
> design (6 especialistas) — ver [`../../.planning/C3-UPLOAD-TRANSPORT-DECISION.md`](../../.planning/C3-UPLOAD-TRANSPORT-DECISION.md).
> Aprovação humana antes do W1.

## 1. Decisões cravadas (aprovadas 2026-05-28, Gabriel)

- **D1 — Transporte de bytes: raw `application/octet-stream`** (Opção D). `addContentTypeParser` no escopo
  do plugin entrega o corpo como `Buffer`; `bodyLimit` **por rota** (não eleva o global de 1 MiB). Metadados
  (categoria, fileName, mimeType, signedElectronically, retentionUntil) viajam na **query string**,
  validados por Zod. B (multipart) e C (presigned) descartados do C3 (2 ADRs contra cada — ver o relatório).
- **D2 — Upload do aditivo = rota única atômica** (upload + attach numa chamada).
- **D3 — `authorize('contract:write')`** em todas as rotas (documentos são mutação; reusa a permissão do C2).
- **D4 — `uploadedBy` vem de `request.userId`** (token), nunca do cliente. **`bucket`/`storageKeyPrefix` de
  config** do composition, nunca do cliente.
- **D5 — Storage por driver:** `createInMemoryDocumentStorage()` em memory/test; `document-storage.s3.ts`
  (S3/MinIO, ADR-0019) em mysql. Config de bucket/prefix/endpoint via env.

## 2. Endpoints

Todos `[requireAuth, authorize('contract:write')]`, no writer.

| # | Método + path | Corpo | Use case(s) | Sucesso |
| :-- | :-- | :-- | :-- | :-- |
| E1 | `POST /contracts/:id/documents` | octet-stream (bytes) + query (metadados) | `uploadDocument` (parentType=Contract, parentId=:id) | **201** documento |
| E2 | `POST /contracts/:id/amendments/:amendmentId/documents` | octet-stream + query | `uploadDocument` (parentType=Amendment) **→ then** `attachSignedDocument` | **201** documento (+ aditivo com `signedDocumentRef`) |
| E3 | `POST /contracts/:id/documents/:documentId/supersede` | JSON `{ supersededByDocumentId }` | `supersedeDocument` (`supersededBy`=userId) | **200** documento superseded |

- **E2 atômico (D2):** upload cria o `ContractDocument` (parentType Amendment); em seguida
  `attachSignedDocument(amendmentId, documentId)` liga o `signedDocumentRef` ao aditivo. **Herda a limitação
  de atomicidade distribuída** (2 saves: documentRepo + amendmentRepo) já registrada em
  `.planning/HOMOLOGATE-DISTRIBUTED-ATOMICITY.md` — mesma natureza, mesmo backlog.
- **E3:** o documento substituto (`supersededByDocumentId`) já deve existir (via E1). Body JSON puro (Zod).

## 3. Schemas (Zod) — `schemas.ts`

- **Query de upload (E1/E2):** `z.object({ categoria: z.enum([...8 categorias...]), fileName:
  z.string().regex(/^[^/\\:*?"<>|]+$/).max(255), mimeType: z.enum([allowlist]), signedElectronically:
  z.coerce.boolean(), retentionUntil: z.string().nullable().optional() })`. (query → tudo string; usar
  `z.coerce` onde necessário.)
- **Body E1/E2:** `application/octet-stream` via `addContentTypeParser({ parseAs: 'buffer', bodyLimit: <MAX> })`
  — **fora do type-provider** (corpo opaco); handler trata `req.body as Buffer` → `new Uint8Array(...)`.
- **Body E3:** `z.object({ supersededByDocumentId: z.uuid() })`.
- **Params:** reusa `contractIdParamSchema`; E2 soma `amendmentId`; E3 soma `documentId` (uuid).
- **Resposta:** `documentSchema` (novo) + mapper `document-dto.ts` (novo) — serializa `ContractDocument`
  (id, parentType, parentId, categoria, fileName, mimeType, sizeBytes, hashSha256, bucket, storageKey,
  version, status, uploadedAt ISO). **Não** expõe segredo de storage além de bucket/key (já públicos no domínio).

## 4. MUSTs de segurança (sessão de design — security-backend)

- **`bodyLimit` por rota** no `addContentTypeParser` (ex.: 20 MiB) — nunca elevar o global.
- **Magic bytes:** validar os primeiros bytes do buffer contra o `mimeType` declarado (ex.: `%PDF`); 400 se divergir.
- **`mimeType` allowlist** (`z.enum`), **`fileName`** sem separadores de path (regex) antes do VO `createStorageKey`.
- **Ownership/IDOR:** o `:amendmentId` (E2) e o `:documentId` (E3) devem pertencer ao contrato `:id` do path
  (BOLA) — validar antes de mutar.
- **Não logar bytes** (Pino não alcança o Buffer; logar só `{ fileName, mimeType, sizeBytes }`).
- **Rate-limit específico** de upload (mais restritivo que reads).
- `uploadedBy`=token; `bucket`/`prefix`=config (D4).

## 5. Mapeamento erro → HTTP

| Erro (`Result`) | HTTP |
| :-- | :-: |
| Zod (query/body/param) inválido | 400 |
| `parent-not-found`, `signed-document-not-found`, `document-not-found`, `supersede-target-not-found`, `amendment-not-found` | 404 |
| `document-already-deleted`, `document-already-superseded`, `amendment-*` de estado, ownership-mismatch | 409 |
| `ContractDocumentError`, `AmendmentError`, IDs residuais, magic-bytes/integridade | 422 |
| `DocumentStorageError` = `storage-unavailable`/`storage-upload-failed`/`storage-permission-denied` | **502/503** |
| `storage-integrity-mismatch` | 422 |
| repo `*-unavailable` | 503 |

Reusar o classificador da família C2 (`writeErrorStatus`), estendendo os Sets com os codes de documento/storage.

## 6. Composition (`composition.ts`)

- Instanciar `uploadDocument` (deps: clock, storage, documentRepo, contractRepo, amendmentRepo),
  `attachSignedDocument` (amendmentRepo, documentRepo), `supersedeDocument` (clock, documentRepo).
- Wire do `DocumentStorage` por driver (D5) + config `{ bucket, storageKeyPrefix }`.
- **Após o C3:** o seed test-only do C2 (D3 do C2) deixa de ser o único caminho — activate/homologate
  passam a ser alcançáveis via fluxo HTTP real (CA5). O seed permanece válido (compat, CA7).

## 7. Critérios de aceitação

- **CA1 (authz):** todas as rotas — sem token 401; sem `contract:write` 403.
- **CA2 (E1 upload contrato):** octet-stream + query válidos + contrato existente → 201 documento; contrato
  inexistente → 404; query inválida (mimeType fora da allowlist, fileName com `/`) → 400; magic-bytes ≠
  mimeType → 422; falha de storage → 502/503.
- **CA3 (E2 upload+attach aditivo):** aditivo existente (Pending) → 201 + aditivo com `signedDocumentRef`;
  aditivo inexistente → 404; aditivo não-Pending → 409; `amendmentId` de outro contrato → 409 (IDOR).
- **CA4 (E3 supersede):** doc Active + substituto existente → 200; doc inexistente → 404; substituto
  inexistente → 404; doc já superseded/deleted → 409.
- **CA5 (fluxo real destravado, sem seed):** E1 signed_contract → `activateContract` (C2) retorna 200;
  E2 (upload signed_amendment + attach) → `homologateAmendment` (C2) retorna 200.
- **CA6 (Zod & OpenAPI):** rotas no `/docs/json`; upload documentado com corpo `format: binary`.
- **CA7 (regressão):** C0/C1/C2 intactos; o seed test-only do C2 segue funcional.
- **CA8 (bodyLimit cirúrgico):** o limite ampliado do upload **não** vaza para as outras rotas (uma rota
  não-upload segue rejeitando corpo > 1 MiB).

## 8. Arquivos previstos (W1)

- `schemas.ts` — query de upload, body E3, params, `documentSchema`.
- `document-dto.ts` (novo) — mapper `ContractDocument` → DTO.
- `plugin.ts` — `addContentTypeParser('application/octet-stream', …)` no escopo; 3 rotas; extensão do
  classificador erro→HTTP com codes de storage/documento; magic-bytes + ownership.
- `composition.ts` — 3 use cases + wire `DocumentStorage` por driver + config bucket/prefix.
- `contracts-documents.routes.test.ts` (W0).

## 9. Fora de escopo

`deleteDocument` (RN-11) — ticket próprio. Presigned URL (Opção C) — evolução futura com ADR próprio
(ver relatório). Export CSV → C4. E2E docker → C5. Render PDF → diferido.
