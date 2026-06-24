# W1 — Implementação (GREEN) · FIN-DOC-COMPETENCIA-DEBITO (#197)

**Agentes:** ts-domain-modeler + drizzle-schema-author + fastify-server-expert · **Resultado:** GREEN ✅ · ~19 pontos

## Mudanças

- **VO `Competencia`** (`domain/document/competencia.ts`): `{year, month}` branded, `fromString('YYYY-MM')` → `Result`, `toString`.
- **Domínio**: `DocumentCore`+`DraftDocument`+`CreateDocumentInput`+`SaveDraftInput` += `competencia`/`debitAccountRef`; `create`/`undoApproval`/`saveDraft` carregam; `DocumentError` += `invalid-competencia`.
- **Application**: `SaveDocumentDeps` += **`cedenteAccountStore`** (valida `contaDebitoRef` by-identity via `findById` → `cedente-account-not-found`); `save-document`/`save-draft` convertem competência (VO) + propagam; commands += campos.
- **Composição**: `cedenteStore` (já existente) wirado ao `deps`.
- **Persistência**: `fin_documents.competencia` varchar(7) → migration **`0023`** (`debit_account_ref` já existia); `document.mapper` (toRow ×2 + rowToDomain ×2, com conversão VO↔string).
- **Borda**: `createDocumentBodySchema` + `documentResponseSchema` + handler (×2) + `documentToDto` (×2, com `Competencia.toString`).
- **Fixtures**: 6 testes (deps += `cedenteAccountStore` fake); CT regressão.

## Decisões / recortes

- Competência = VO com validação no **domínio** (→ 422); conta-débito validada by-identity no **use-case** (R-1b).
- **Exposição na LISTAGEM (`documentSummarySchema`) deferida** — o **detalhe** (`GET /documents/:id`, usado pela tela de edição) está completo; a lista por documento é follow-up (campos resumidos). Registrar se a P.O. exigir na listagem.

Teste #197 (HTTP): **3/3** ✅. Unit: 0 fail. **Integração Drizzle: 0 fail** (competencia char(7) real).
