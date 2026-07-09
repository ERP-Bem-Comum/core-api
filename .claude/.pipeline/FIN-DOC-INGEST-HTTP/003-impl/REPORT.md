# W1 — GREEN — FIN-DOC-INGEST-HTTP

Wave W1. Agente: **`fastify-server-expert`** ↔ **`zod-expert`**. Módulo `financial`, feature 034 (fatia 2, ticket 3/3), épico #62.

## Entregue

1. **Rota `POST /api/v2/financial/documents/ingest`** (`plugin.ts`) — `preHandler: [requireAuth, authorize(FINANCIAL_PERMISSION.write)]`; recebe `application/octet-stream` (metadados na query); chama `deps.ingestDocument`; responde `201 { documentId, resolvedVia }`.
2. **Upload seguro portado de contracts** (F7): `addContentTypeParser('application/octet-stream', { bodyLimit: 20 MiB })` (não vaza o global de 1 MiB); `magicBytesMatch` (`%PDF` quando `mimeType='application/pdf'`); `sanitizeFilename` (control chars/aspas → anti header-injection).
3. **Schemas Zod** (`schemas.ts`) — `ingestDocumentQuerySchema` (`fileName` 1..255 sem separadores; `mimeType` allowlist PDF/XML), `octetStreamIngestBody()`, `ingestDocumentResponseSchema`.
4. **Error-mapping** (`error-mapping.ts`) — `source-too-large`/`decompression-limit-exceeded` → **413**; `document-magic-bytes-mismatch`/`empty-input` → 400; `source-file-upload-failed` → 503; sem vazar componente interno.

## CA → resultado (e2e via `fastify.inject`)

| CA | Estado |
| :-- | :-- |
| CA1 PDF válido + auth → 201 | ✔ |
| CA2 sem token → 401 / sem write → 403 | ✔ |
| CA3 mimeType fora da allowlist → 400 | ✔ |
| CA4 magic-bytes mismatch → 4xx | ✔ |
| CA7 recurso (bomba) → 413 | ✔ |

## Gates parciais

```
node --test ingest.http.test.ts       → 5 pass / 0 fail
node --test .../adapters/http          → 217 pass / 0 fail (zero regressão)
pnpm run typecheck                     → exit 0
eslint (plugin/schemas/error-mapping)  → 0 errors
```

Próximo: **W2** (`code-reviewer` + `security-backend-expert` — borda segura, Zod bounds, RBAC, error-mapping sem vazamento) + **W3**.
