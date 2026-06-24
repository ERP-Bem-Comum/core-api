# FIN-PAYABLE-TITLES-ENRICH — enriquece GET /payable-titles

**Feature:** [025-fin-go-live-1-nucleo](../../../specs/025-fin-go-live-1-nucleo/) · **US6** · **Size:** S
**🎯 Goal:** fechar a issue **[#229](https://github.com/ERP-Bem-Comum/core-api/issues/229)**.

## Contexto

O grid "Por título" (#201/#222) consome `GET /api/v2/financial/payable-titles`, mas faltam campos para paridade com o grid por documento. Todas as colunas existem em `fin_documents` — falta expô-las no read path (SELECT/mapper/schema/DTO).

## 📋 Definition of Done (pedido da #229 — fonte da verdade)

- [ ] `issueDate` (emissão, do documento) — `string | null` (date-only).
- [ ] `paymentMethod` (forma de pagamento) — `string | null`.
- [ ] `version` (optimistic lock do documento) — `number` (habilita ações em massa por título).
- [ ] `grossValueCents` e `netValueCents` (Bruto/Líquido separados) — `string | null`.
- [ ] `dueDate` como **date-only** (`YYYY-MM-DD`) em vez de ISO datetime.
- [ ] gate **W3** verde; **issue #229 fechada**.

## Escopo técnico

- `domain/payable/query.ts` `PayableListItem` += 5 campos.
- `mappers/payable-list.mapper.ts` `PayableListRow` + `rowToPayableListItem` += campos.
- `repos/payable-list-view.drizzle.ts` SELECT += `finDocuments.issueDate/paymentMethod/version/grossValue/netValue`.
- `repos/payable-list-view.in-memory.ts` — `source()` passa a entregar `LoadedDocument` (com `version`); `toItem` += campos.
- `http/composition.ts:292` — mapeia `{ ...aggregate, version }`.
- `http/schemas.ts` `payableSummarySchema` + `http/plugin.ts` `payableListItemToDto` += campos.
