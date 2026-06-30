# W1 — Implementação · FIN-DOCUMENT-TYPE-METADATA

**Skills/agentes:** ts-domain-modeler (catálogo, sessão principal) + fastify-server-expert (endpoint).
**Estado:** **GREEN**.

## Implementado

### Domínio (catálogo estático + fonte única)
- `domain/document/document-type-metadata.ts`: `DocumentTypeMetadata { type, allowedRetentions, accessKeyRequired, suggestedPaymentMethod }` + `metadataFor(type)` + `allMetadata()` (puros). `allowedRetentionsFor(type)` é a **fonte única** das retenções por tipo. `allMetadata` usa `exhaustiveStringUnion<DocumentType>` → cobertura dos **7 tipos garantida em compile-time** (CA5). `suggestedPaymentMethod` só onde óbvio (Boleto→Boleto, Imposto→GuiaRecolhimento; demais null).
- **Refatoração (fonte única):** `document.ts` removeu o `ALLOWED_RETENTIONS` local e passou a consumir `allowedRetentionsFor` — **CA7 (não-divergência catálogo × agregado) garantido por construção** (uma fonte, divergência impossível). Import `RetentionType` órfão removido.

### Borda (read-only, sem port — catálogo é puro)
- `GET /financial/document-types/metadata` (`adapters/http/plugin.ts`): molde read-only das categories, permissão `reference:read`; handler chama `allMetadata()` **direto do domínio** (sem `deps`/composition — catálogo estático, sem I/O).
- `schemas.ts`: `documentTypeMetadataResponseSchema` + `...ListResponseSchema` (reusa `documentTypeSchema`/`retentionTypeSchema`/`paymentMethodSchema`; `.meta` por campo). `dto.ts`: `documentTypeMetadataToDto` (identidade tipada, spread readonly→array).

## Testes
- `document-type-metadata.test.ts` (domínio): CA1–CA5 + Fatura/Recibo — **7/7**.
- `document-type-metadata.http.test.ts` (rota CA6): 200 com `reference:read` (NFS-e 4 retenções, DANFE accessKey, Boleto suggested) + 403 sem permissão — **2/2**.
- Regressão do agregado (`document.test`, `save-document.test`) intocada após a refatoração.

## Gates (sessão principal)
- `tsc`: 0 erros · `prettier --check .`: OK · `eslint .`: exit 0.
- `pnpm test`: **3314 / 3296 pass / 0 fail / 18 skip** — zero regressão.
