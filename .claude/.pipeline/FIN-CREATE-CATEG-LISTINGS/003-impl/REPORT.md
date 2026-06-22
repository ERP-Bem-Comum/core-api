# W1 — Implementação GREEN (FIN-CREATE-CATEG-LISTINGS)

Skill: `pipeline-maestro` (orquestração) + `ts-domain-modeler`/`drizzle-schema-author` (camadas).

## Mudanças (`costCenterRef` ponta-a-ponta + refs no detail)

- **domain/shared/refs.ts**: brand `CostCenterRef` + `CostCenterRef.rehydrate` (formato UUID v4, espelha os outros refs).
- **domain/document/types.ts**: campo `costCenterRef: CostCenterRef | null` em `DocumentCore` e `DraftDocument`.
- **domain/document/document.ts**: `CreateDocumentInput`/`SaveDraftInput` + `create`/`saveDraft`/`submit`/`undoApproval` propagam `costCenterRef`.
- **application/use-cases/save-document.ts** e **save-draft.ts**: command aceita `costCenterRef?: string | null`, valida via smart constructor, passa ao domínio.
- **adapters/persistence/schemas/mysql.ts**: coluna `cost_center_ref varchar(36)` nullable em `fin_documents`.
- **migrations/mysql/0014_bored_mephisto.sql**: `ALTER TABLE fin_documents ADD cost_center_ref varchar(36)` (não-quebrante).
- **mappers/document.mapper.ts**: `costCenterRef` nos 2 mappers row→domínio (Draft + Open) e 2 domínio→row; novo erro `mapper-invalid-cost-center-ref`.
- **adapters/http/schemas.ts**: `createDocumentBodySchema` aceita `costCenterRef`; `documentResponseSchema` expõe `contractRef/budgetPlanRef/categoryRef/costCenterRef/programRef`.
- **adapters/http/plugin.ts**: propaga `costCenterRef` em saveDraft/saveDocument.
- **adapters/http/dto.ts**: `documentToDto` expõe os 5 refs (Draft + Open/Approved) via `refToString`.
- In-memory repo: sem mudança (guarda o agregado domínio inteiro).

## Resultado

- `typecheck`: verde.
- Testes do ticket: 26/26 (use-case + HTTP refs + suite HTTP create sem regressão).
- Suíte financial completa: **389/389**, 0 fail.

Integração MySQL (mapper drizzle do novo campo + CA3 back-compat) é opt-in (`test:integration:financial`) — rodada consolidada no fim dos tickets de persistência.
