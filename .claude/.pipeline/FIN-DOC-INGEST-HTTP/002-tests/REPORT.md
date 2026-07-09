# W0 — RED — FIN-DOC-INGEST-HTTP

Wave W0 (fail-first). Skill: **`tdd-strategist`**. Módulo `financial`, feature 034 (fatia 2, ticket 3/3), épico #62. Testes e2e RED — nenhum `src/` de produção tocado.

## Teste RED — `ingest.http.test.ts` (via `fastify.inject`)

Setup: `buildApp` + `financialHttpPlugin(buildFinancialHttpDeps({driver:'memory'}))` + auth fake (padrão dos testes HTTP do financial). Payload PDF real via `buildNativePdf` (reuso das fixtures do NATIVE).

| CA | Assere |
| :-- | :-- |
| CA1 | POST `/documents/ingest?fileName=nota.pdf&mimeType=application/pdf` + PDF + auth write → `201 { documentId }` |
| CA2 | sem token → `401`; sem `fiscal-document:write` → `403` |
| CA3 | mimeType fora da allowlist → `400` (Zod) |
| CA4 | `mimeType=application/pdf` + body não-PDF → magic-bytes mismatch (4xx) |

## Saída literal RED

```
✖ CA1 (espera 201 → 404 rota inexistente)
✖ CA2 (espera 401 → 404: sem rota, preHandler não roda)
✖ CA3 (espera 400 → 404)
✔ CA4 (passa acidentalmente: 404 satisfaz "4xx e ≠201" — validado de verdade no W1)
ℹ pass 1 · fail 3
```

Causa raiz esperada: rota `POST /financial/documents/ingest` não existe (é o W1). Sem regressão.

## Contrato a implementar no W1

Rota + `addContentTypeParser('application/octet-stream', bodyLimit)` + magic-bytes + `sanitizeFilename` (portar de `contracts/http/plugin.ts:125-167`) + Zod query (`fileName`/`mimeType` allowlist) + `preHandler [requireAuth, authorize(write)]` + `error-mapping` dos erros do ingest → status. Próximo: **W1** (`fastify-server-expert` ↔ `zod-expert`).
