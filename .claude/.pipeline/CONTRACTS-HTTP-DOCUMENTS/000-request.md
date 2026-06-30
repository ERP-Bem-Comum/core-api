# CONTRACTS-HTTP-DOCUMENTS (C3) — upload e gestão de documentos

## Origem

[`EPIC-CONTRACTS-HTTP`](../../.planning/EPIC-CONTRACTS-HTTP.md) §10 C3.
Quarta fatia da borda HTTP de contratos: expõe upload e versionamento de documentos, com **storage real**
(ADR-0019, port `DocumentStorage` → adapter S3/MinIO; InMemory nos testes). Destrava os **fluxos reais** de
`activate` e `homologate` (C2) — que hoje dependem de doc/aditivo seedado (D3 do C2). Depende de C0 + C2.

## O que este ticket entrega (provável — detalhar na SPEC)

### Rotas (plugin + schemas), `[requireAuth, authorize('contract:write')]`, no writer

1. `POST /contracts/:id/documents` — upload de documento vinculado ao **contrato** (`uploadDocument`,
   `parentType:'Contract'`; categorias `signed_contract`, etc.). → **201** com o documento.
2. `POST /contracts/:id/amendments/:amendmentId/documents` — upload de documento vinculado ao **aditivo**
   (`parentType:'Amendment'`) **+ attach** (`attachSignedDocument` liga `signedDocumentRef` ao aditivo,
   pré-requisito de `homologate`/RN-12). → **201**. (Avaliar na SPEC: upload+attach atômico numa rota, ou
   duas rotas.)
3. `POST /contracts/:id/documents/:documentId/supersede` — substitui um documento Active por nova versão
   (`supersedeDocument`, RN-AS-02). → **200**.

### Composition

- Expor `uploadDocument`, `attachSignedDocument`, `supersedeDocument` (writer; reusa `documentRepo`,
  `contractRepo`, `amendmentRepo` já abertos no C2).
- Wire do port **`DocumentStorage`**: adapter `document-storage.s3.ts` (S3/MinIO) em mysql; adapter
  `document-storage.in-memory.ts` em memory/test. `bucket`/`storageKeyPrefix` vêm de **config**, nunca do cliente.
- Após o C3, o **seed test-only de documentos/aditivos (D3 do C2) deixa de ser o caminho** — activate/
  homologate passam a ser alcançáveis via fluxo HTTP real (upload → attach → homologate).

## Decisões pendentes (resolver na SPEC, possível AskUserQuestion)

1. **Transporte dos bytes (alto impacto):**
   - **multipart/form-data** via `@fastify/multipart` — idiomático, streaming, mas **adiciona dependência**
     (ADR-0011 supply-chain: `approve-builds`, lockfile) e complica o Zod contract-first/OpenAPI (multipart
     não valida via Zod como JSON).
   - **base64 no JSON** — sem nova dep, Zod valida o body, OpenAPI limpo; custo +33% payload e tudo em
     memória (ajustar `bodyLimit`, hoje 1 MiB). Adequado a PDFs de contrato pequenos/médios.
2. **`uploadedBy`** vem de `request.userId` (token), não do body.
3. **`bucket`/`storageKeyPrefix`** de config do composition (segurança — cliente não escolhe bucket/caminho).
4. **Permissão:** reusar `authorize('contract:write')` ou criar `document:write`? (default: reusar write.)
5. **Validação de `mimeType`/`sizeBytes`/categorias** na borda (allowlist) vs domínio.
6. **upload+attach do aditivo:** rota única atômica vs duas chamadas.

## Critérios de aceitação (a consolidar na SPEC)

- **CA1 (authz):** sem token → 401; sem `contract:write` → 403 (todas as rotas).
- **CA2 (upload contrato):** body válido + contrato existente → 201 documento; contrato inexistente →
  404 (`parent-not-found`); body inválido → 400; falha de storage → 5xx mapeado (502/503).
- **CA3 (upload+attach aditivo):** aditivo existente → 201 + aditivo com `signedDocumentRef`;
  aditivo inexistente → 404; aditivo não-Pending → 409.
- **CA4 (supersede):** doc Active → 200 nova versão; doc inexistente → 404; já superseded/deleted → 409.
- **CA5 (fluxo real destravado):** upload signed_contract → activate retorna 200 **sem seed**; upload
  signed_amendment + attach → homologate retorna 200 **sem seed**.
- **CA6 (Zod & OpenAPI):** rotas no `/docs/json`.
- **CA7 (regressão):** C0/C1/C2 intactos; o seed test-only do C2 segue funcionando (compat).

## Fora de escopo

- `deleteDocument` (exclusão lógica RN-11) — não listado no C3 da spec-mãe; ticket próprio.
- Export CSV → C4. Smoke E2E docker → C5. Render PDF → diferido.
