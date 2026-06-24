# FIN-DOC-COMPETENCIA-DEBITO — competência (VO) + conta-débito no create

**Feature:** [025-fin-go-live-1-nucleo](../../../specs/025-fin-go-live-1-nucleo/) · **US4** · **Size:** M (grande)
**🎯 Goal:** fechar a issue **[#197](https://github.com/ERP-Bem-Comum/core-api/issues/197)**.

## 📋 Definition of Done (CAs da #197 + clarify R-1a/R-1b)

- [ ] decisões registradas: `competencia` = VO `Competencia` (R-1a); `contaDebitoRef` → `fin_cedente_accounts` by-identity (R-1b).
- [ ] create aceita `competencia` (`YYYY-MM`) e `contaDebitoRef`; persistem em `fin_documents`.
- [ ] `contaDebitoRef` validado por existência (by-identity, `cedente-account-not-found` 422); `competencia` formato inválido → `invalid-competencia` 422.
- [ ] expostos nos DTOs de lista e detalhe; migration aditiva.
- [ ] gate W3 verde + integração Drizzle; **issue #197 fechada**.

## Escopo técnico

- **Domínio**: VO `Competencia` (✅ criado); `DocumentCore`+`DraftDocument`+`CreateDocumentInput`+`SaveDraftInput` += `competencia: Competencia | null`, `debitAccountRef: string | null`; `create` carrega.
- **Application**: `SaveDocumentDeps` += `cedenteAccountStore` (valida `contaDebitoRef` via `findById`); commands += campos.
- **Composição**: wirar `cedenteStore` (já criado) ao `saveDocument` deps.
- **Persistência**: `fin_documents.competencia` char(7) + migration (`debit_account_ref` já existe); mapper.
- **Borda**: body+response+summary schemas + handler + dto.
