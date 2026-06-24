# FIN-DOC-ACCESSKEY — chave de acesso DANFE no create

**Feature:** [025-fin-go-live-1-nucleo](../../../specs/025-fin-go-live-1-nucleo/) · **US4** · **Size:** M
**🎯 Goal:** fechar a issue **[#115](https://github.com/ERP-Bem-Comum/core-api/issues/115)**.

## 📋 Definition of Done (CAs da #115)

- [ ] `accessKey` (`^\d{44}$`, normalizada) no `createDocumentBodySchema` — **opcional**, **obrigatória quando `type === 'DANFE'`** (e não-rascunho).
- [ ] erro de formato/obrigatoriedade → slug i18n (`invalid-access-key` / `access-key-required-for-danfe`, 422).
- [ ] persistida em `fin_documents.access_key` e exposta no `GET /documents/:id`.
- [ ] gate **W3** verde; **issue #115 fechada**.

## Não-objetivos

- Não valida DV/estrutura interna da chave (UF/AAMM/modelo) — só formato 44 dígitos.
- Não altera os demais tipos de documento.

## Escopo técnico (espelha `issueDate`/#163)

- **Borda**: `createDocumentBodySchema` += `accessKey` (normaliza + `^\d{44}$`) + refine DANFE; `documentResponseSchema` += `accessKey`; handler propaga.
- **Domínio**: `CreateDocumentInput` + `DocumentCore` + `DraftDocument` += `accessKey: string | null`; `create` monta com `accessKey`.
- **Application**: `SaveDocumentCommand` += `accessKey`.
- **Persistência**: `fin_documents.access_key` varchar(44) nullable + migration; `document.mapper` (toRow/toDomain).
- **DTO**: `documentToDto` += `accessKey`.
