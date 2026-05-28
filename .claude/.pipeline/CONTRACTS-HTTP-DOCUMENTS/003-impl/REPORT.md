# W1 (GREEN) — CONTRACTS-HTTP-DOCUMENTS (C3)

> Agente: `fastify-server-expert` (no main thread) · Driver: memory · Outcome: **GREEN** (21/21)

## O que foi implementado

### `composition.ts`
- **Storage por driver (D5):** `createInMemoryDocumentStorage()` em memory; `createS3DocumentStorage`
  (via `parseAwsS3Env(process.env)`) em mysql. `Pools` ganha `documentStorage` + `documentBucket`.
- **3 use cases de documento** instanciados: `uploadDocument`, `attachSignedDocument`, `supersedeDocument`.
- **`getAmendment` reader (D4/IDOR):** função leve `(amendmentId) => Result<Amendment|null>` para a borda
  checar ownership do aditivo — read-only, não muta.
- **Config:** `documentBucket` (default `contracts-documents`; em mysql vem de `S3_BUCKET`) +
  `documentKeyPrefix` (default `contracts`). Nunca do cliente (D4).

### `schemas.ts`
- `uploadDocumentQuerySchema` (query — `categoria` enum 8 valores, `fileName` regex anti-traversal +
  max 255, `mimeType` allowlist `['application/pdf']`, `signedElectronically` enum→boolean).
- `supersedeDocumentBodySchema`, `documentParamSchema` (id+documentId), `documentSchema` + `DocumentDto`.

### `document-dto.ts` (novo)
Mapper `ContractDocument` → DTO; `Date` → ISO; branded strings cruas (bucket/storageKey são vocabulário
público do domínio, não segredo).

### `plugin.ts`
- **`addContentTypeParser('application/octet-stream', { parseAs:'buffer', bodyLimit: 20 MiB })`** no escopo
  — corpo opaco → `Buffer`, `bodyLimit` cirúrgico (global 1 MiB intacto, CA8).
- **`magicBytesMatch`** — PDF deve começar com `%PDF`; mismatch → `document-magic-bytes-mismatch` (422).
- **3 rotas POST** `[requireAuth, authorize('contract:write')]`:
  - **E1** upload doc do contrato → 201.
  - **E2** upload + attach atômico ao aditivo (com **ownership check** via `getAmendment`: 404 inexistente,
    409 mismatch/IDOR) → 201. Destrava o homologate (C2).
  - **E3** supersede → 200.
- **Classificador erro→HTTP estendido:** NOT_FOUND += parent/document/supersede-target/signed-document/
  storage-not-found; CONFLICT += document-already-deleted/superseded; REPO_UNAVAILABLE += storage-unavailable;
  novo **502** para `storage-upload-failed`/`storage-permission-denied`.

## Decisões aplicadas (sessão de design + aprovação 2026-05-28)
- D1 raw octet-stream (relatório dos 6 especialistas) · D2 upload+attach atômico · D3 `contract:write` ·
  D4 uploadedBy=token, bucket/prefix=config · D5 storage por driver.

## Evidência GREEN

```
contracts-documents.routes.test.ts → tests 21 · pass 21 · fail 0
  inclui CA5 (fluxo real SEM seed): POST Pending → E1 upload → activate 200;
                                    POST Active → amendment → E2 upload+attach → homologate 200.
suíte completa → tests 1535 · pass 1519 · fail 0 · skipped 16 (gate integração auth, MYSQL_INTEGRATION=1)
```

Gates antecipados de W3 já verdes: `typecheck` ✓ · `lint` ✓ · `format:check` ✓ · `test` ✓.

## Notas para o W2

- **Atomicidade distribuída do E2** (uploadDocument save + attachSignedDocument save = 2 saves) — herda a
  limitação MVP já registrada em `.planning/HOMOLOGATE-DISTRIBUTED-ATOMICITY.md`. Mesma natureza.
- **OpenAPI do corpo binário:** as rotas de upload não declaram `requestBody` (corpo fora do type-provider);
  o `/docs/json` lista as rotas (CA6 ✓) mas não documenta o `format: binary` do corpo. Candidato a refino.
- **Ownership do E3** (`:documentId` pertencer ao `:id`) não implementado — não coberto por CA; `supersedeDocument`
  valida só existência. Registrar se o W2 julgar necessário.
