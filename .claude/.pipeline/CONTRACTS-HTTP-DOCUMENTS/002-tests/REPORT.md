# W0 (RED) — CONTRACTS-HTTP-DOCUMENTS (C3)

> Skill: `tdd-strategist` · Driver: memory (sem Docker) · Outcome: **RED** (16 fail / 5 pass benignos)

## Teste escrito

`tests/modules/contracts/adapters/http/contracts-documents.routes.test.ts` — 21 casos via `app.inject`,
exercitando as 3 rotas de documento (raw octet-stream + query metadados) com RBAC `contract:write`, o
mapeamento erro→HTTP (SPEC §5) e o fluxo real ponta-a-ponta que destrava o C2 (CA5).

| Rota / grupo | Casos |
| :-- | :-- |
| E1 `POST /contracts/:id/documents` | 401, 403, 201 (contrato seed), 404 (contrato inexistente), 400 (mimeType fora da allowlist), 400 (fileName com `/`), 422 (magic-bytes ≠ mimeType) |
| E2 `POST /:id/amendments/:amendmentId/documents` (upload+attach) | 401, 403, 201 (aditivo Pending), 404 (aditivo inexistente), 409 (IDOR — aditivo de outro contrato) |
| E3 `POST /:id/documents/:documentId/supersede` | 401, 403, 200 (doc Active + substituto), 404 (doc inexistente), 404 (substituto inexistente) |
| CA5 fluxo real (sem seed) | Pending→E1→activate **200**; Active→amendment→E2→homologate **200** |
| CA6/CA8 | OpenAPI tem as 3 rotas; `POST /contracts` rejeita corpo > 1 MiB (413) |

## Setup (transporte D1 + seed)

- **Token `contract:write`:** seed RBAC do auth.
- **Upload:** `payload: <Buffer>` + `content-type: application/octet-stream`; metadados na query
  (`?categoria=&fileName=&mimeType=&signedElectronically=true`). PDF começa com `%PDF`; o caso 422 envia
  bytes não-PDF declarando `application/pdf`.
- **Pré-requisitos isolados (E1/E2/E3):** seed estendido `{ contracts, amendments, documents }` (C2 D2) com
  helper local `buildDoc(id,...)` (Document.create com id fixo). **CA5 usa uma app SEM seed** — tudo nasce
  via HTTP (prova o fluxo real).

## Decisões cravadas nos asserts (aprovadas 2026-05-28)

- **D1 transporte raw octet-stream** (sessão de design, 6 especialistas — ver
  `.planning/C3-UPLOAD-TRANSPORT-DECISION.md`); **D2 upload+attach atômico**; **D3 `contract:write`**.
- Mapeamento: 400 Zod · 404 not-found · 409 conflito/IDOR · 422 invariante/magic-bytes · 502/503 storage.

## Evidência RED

```
contracts-documents.routes.test.ts → tests 21 · pass 5 · fail 16
```

Falham por: rotas E1/E2/E3 inexistentes (404 onde se espera 401/403/201/200/422/409). Os 5 "pass" são
benignos: os 4 casos que esperam **404** (contrato/aditivo/documento/substituto inexistente) coincidem com o
404 de rota-inexistente (passarão pela razão certa pós-W1), e o **CA8 (413)** já passa de fato — o
`bodyLimit` global de 1 MiB rejeita o corpo gigante no `POST /contracts` do C2, confirmando o limite global
intacto (a rota de upload terá limite próprio maior).

## API que o W1 deve entregar

```
composition.ts: instanciar uploadDocument/attachSignedDocument/supersedeDocument; wire DocumentStorage
                por driver (createInMemoryDocumentStorage | document-storage.s3.ts) + config { bucket, storageKeyPrefix }.
schemas.ts:     query de upload (categoria enum, fileName regex anti-traversal, mimeType allowlist,
                signedElectronically coerce) + body E3 ({ supersededByDocumentId }) + params amendmentId/documentId
                + documentSchema (resposta).
document-dto.ts (novo): mapper ContractDocument → DTO.
plugin.ts:      addContentTypeParser('application/octet-stream', { parseAs:'buffer', bodyLimit:<MAX> }) no escopo;
                3 rotas [requireAuth, authorize('contract:write')]; magic-bytes check; ownership/IDOR;
                E2 = uploadDocument → attachSignedDocument (atômico); extensão do classificador erro→HTTP
                com codes de storage/documento.
```
