# W1 — Implementação (GREEN) · FIN-DOC-ACCESSKEY (#115)

**Agentes:** ts-domain-modeler + zod-expert + drizzle-schema-author · **Resultado:** GREEN ✅

## Mudanças (~12 pontos, espelhando issueDate/#163)

**Domínio**: `DocumentCore`+`DraftDocument`+`CreateDocumentInput`+`SaveDraftInput` += `accessKey`; `create` valida formato `^\d{44}$` (`invalid-access-key`) + obrigatoriedade DANFE (`access-key-required-for-danfe`); construtores `create`/`undoApproval`/`saveDraft` carregam `accessKey`; `DocumentError` += 2 slugs; `error-mapping` += mensagens PT-BR (422).

**Application**: `SaveDocumentCommand` + `SaveDraftCommand` += `accessKey`, propagado ao domínio.

**Borda**: `createDocumentBodySchema` += `accessKey` (normaliza `\D`→'' via transform; o domínio valida 422); `documentResponseSchema` += `accessKey`; handler propaga nos 2 caminhos (saveDocument/saveDraft); `documentToDto` (draft+open) += `accessKey`.

**Persistência**: `fin_documents.access_key` varchar(44) nullable → migration **`0022_white_cable.sql`**; `document.mapper` `documentToRow` (draft+core) + `rowToDomain` (draft+core) += `accessKey`.

## Decisões / achados

- Validação no **domínio** (retorna `err` → 422, como a issue pede) + normalização na **borda** (Zod transform). Borda Zod sozinha daria 400.
- Regressão CT-006 (`children.test.ts`): DANFE agora exige chave — fixture atualizado.

Teste #115 (HTTP): **3/3** ✅. Suíte unit: 0 fail. **Integração Drizzle: 0 fail** (access_key real).
