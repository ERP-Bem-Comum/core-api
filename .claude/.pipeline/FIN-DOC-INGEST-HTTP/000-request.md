# FIN-DOC-INGEST-HTTP — escopo

> Feature **034-fin-documento-reader** (fatia 2 de feature, ticket 3/3 — o FECHO). Módulo **`financial`**. Épico **#62**. Size **M**.
> Expõe o `ingestDocument` (#2) via HTTP. Atende os requisitos de segurança de borda (F7/F8) levantados no W2 do #2. Plano: `.claude/.planning/FIN-DOC-INGEST-FATIA2.md`.

## Escopo (in)

1. **Rota `POST /api/v2/financial/documents/ingest`** (`adapters/http/plugin.ts`) — recebe o PDF/XML como `application/octet-stream` (metadados na query), chama `deps.ingestDocument`, responde `201 { documentId, resolvedVia, sourceFile }`.
2. **Upload seguro — portar o padrão do `contracts`** (`contracts/http/plugin.ts:125-167`):
   - `addContentTypeParser('application/octet-stream', { parseAs:'buffer', bodyLimit: MAX_UPLOAD_BYTES })` — limite por rota, sem vazar o global de 1 MiB (**F7 bodyLimit**).
   - **magic-bytes** `%PDF` quando `mimeType==='application/pdf'` (**F7**, defesa contra mimeType mentido).
   - **`sanitizeFilename`** — remove control chars/aspas do `fileName` (**F1 defesa em profundidade** + anti header-injection).
3. **Schema Zod** (`adapters/http/schemas.ts`) — querystring `{ fileName (1..255, sem separadores de path), mimeType (allowlist `application/pdf`/XML) }` (**F7 magic-bytes vs declaredMime**; ADR-0027). Body binário via `octetStreamUploadBody()`.
4. **RBAC** — `preHandler: [requireAuth, authorize(FINANCIAL_PERMISSION.write)]` (**F7 auth**; ADR-0024).
5. **Error-mapping** (`adapters/http/error-mapping.ts`) — `DocumentReaderError`/`SourceFileStorageError`/`SaveDraftError` do ingest → status: recurso (`source-too-large`/`decompression-limit-exceeded` → 413; `empty-input` → 400); `source-file-upload-failed` → 500; sem vazar componente interno (5xx genérico).

## Fora de escopo

- Alterar o use case `ingestDocument` (#2, fechado).
- Auto-resolver fornecedor (enriquecimento — futuro).

## Critérios de aceite (e2e via `fastify.inject` + Bruno)

- **CA1 — sucesso.** POST `/documents/ingest?fileName=nota.pdf&mimeType=application/pdf` + body PDF válido + auth → `201 { documentId, resolvedVia }`.
- **CA2 — auth.** Sem token → `401`; token sem `fiscal-document:write` → `403`.
- **CA3 — mimeType fora da allowlist** → `400` (Zod).
- **CA4 — magic-bytes.** `mimeType=application/pdf` mas body não começa com `%PDF` → erro (`document-magic-bytes-mismatch`).
- **CA5 — fileName com path-traversal/control chars** → sanitizado (não quebra; o adapter S3 já rejeita a key — #2 F1).
- **CA6 — body acima do `bodyLimit`** → `413`.
- **CA7 — erro de recurso do reader** (bomb) → `413`; nenhum rascunho criado.

## Pipeline (agentes por wave)

| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED — e2e via `fastify.inject` (CA1–CA7) | skill **`tdd-strategist`** |
| W1 | rota + parser/magic-bytes/sanitize + Zod + error-mapping | agente **`fastify-server-expert`** ↔ **`zod-expert`** |
| W2 | audit (borda segura, Zod bounds, RBAC, error-mapping sem vazamento) | skill **`code-reviewer`** + agente **`security-backend-expert`** |
| W3 | gate | skill **`ts-quality-checker`** |

## DoD

Gate W3 verde. `POST /documents/ingest` seguro (bodyLimit, magic-bytes, mime allowlist, auth, sanitize) chama o `ingestDocument` e responde 201/erros mapeados. **Fatia 2 (ingest completo) COMPLETA.**
