# W1 — implementação (ETL-FINANCIAL-WRITER)

## src/ (idempotência — identifierCode NÃO é único: 37/52)
- schemas/mysql.ts: fin_documents.legacy_id + UNIQUE (migration 0030, ALTER+UNIQUE)
- application/ports/financial-etl-store.ts + repos/financial-etl-store.drizzle.ts
- public-api/etl.ts: buildFinancialEtlPort (padrão D14 do partners)

## scripts/etl/
- legacy/rows+decode: LegacyAccountRow/LegacyPayableRow/LegacyApprovalRow
- financial/exclusions.ts: allowlist F5 (45/46, decisionRef R-1)
- financial/mapper.ts: vocab D7 tipado com literais do domínio (DocumentType/
  PaymentMethod), Bradesco→237, convenio LEGADO (D6), F3/F4→draft c/ draftFields,
  F6→retention_type, approvedAt com fallback F2
- financial/reader.ts: 5 tabelas (collaborators/users só p/ join D11)
- financial/main.ts: cedentes (idempotente por chave natural c/ resolve do id),
  aprovador via join→provisionLegacyUser, infra≠dado no remap (PortError pré-mapper),
  ClockFixed POR DOCUMENTO nos 2 use cases, re-approve em re-run parcial com version
  REAL, markDocumentLegacyId, artefatos truncados por run, stub de categorização (D9)

## Testes/CI
- mapper 15/15; suíte tests/etl unit completa verde; typecheck+lint PASS
- writer.integration.test.ts full-cycle (parceiros→contratos→financeiro) EXECUTADO
  na VM contra core_it zerado: 2/2 (balanço, byKind {1,1,1}, soma 75025 cents,
  idempotência com de-para regenerado)
- suite CI 'etl:financial' + script test:integration:etl:financial
