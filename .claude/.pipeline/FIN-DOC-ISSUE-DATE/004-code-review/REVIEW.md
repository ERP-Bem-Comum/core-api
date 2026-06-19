# Code Review — FIN-DOC-ISSUE-DATE (#163) — Round 1

**Veredito:** APPROVED · **Data:** 2026-06-19

**Escopo:** `issueDate` no agregado Document + persistência (schema/migration/mapper/repos) + application + borda HTTP + testes.

## Princípio IX

`issueDate` é atributo do agregado Document (emissão ≠ vencimento) — modelagem tática DDD (Evans, *DDD*, §Entities/Value attributes): captura o fato de negócio que o grid de Contas a Pagar precisa. Filtro por intervalo é leitura read-side (CQRS) que reusa o índice `issue_date`.

## Issues

- 🔴 nenhuma. `issueDate` nullable (back-compat + opcional); imutável após create (não exposto em adjust/editMetadata; preservado via spread/cópia). Migration ALTER ADD não-quebrante. Mapper row↔domínio cobre toRow (senão a emissão nunca persistia) e toDomain. Sem `let`/throw/class novos.
- 🟡 nenhuma.
- 🔵 Decisões: (a) **nullable everywhere** (inclusive Open/Approved) — emissão é informativa e ausente em docs legados; não força quebra. (b) **imutável**: capturado no create (OCR/manual); edição de emissão fica fora do escopo (adjust/editMetadata não a tocam, só preservam). (c) índice `fin_documents_issue_date_idx` espelha `due_date_idx` p/ o filtro de range.

## O que está bom

- Espelhamento fiel de `dueDate` em ~12 arquivos; typecheck usado como checklist de call-sites (zero site esquecido).
- Filtro testado no contrato (suite roda nos 2 adapters); `issueDate` exposto verificado no read-model.
- Sem regressão (3010 pass / 0 fail); fixture de DTO incompleto corrigido (regressão zero).

**APPROVED** → W3.
