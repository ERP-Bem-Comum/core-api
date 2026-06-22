# FIN-CREATE-CATEG-LISTINGS — `costCenterRef` no create + refs de categorização no detail (#147)

> Épico **Lançar Documento / criação** (#64). Issue **#147** (categorização editável). Size **M**.

## Contexto

As listagens de Categoria/Centro de custo/Programa **já existem** (`GET /financial/categories|cost-centers|programs`, criadas pela 020 atrás de `reference:read`). O gap real de #147 é no **create do documento**:

- `saveDocument`/`saveDraft` **não aceitam `costCenterRef`** (centro de custo não tem ref no documento).
- O **detail DTO** (`documentToDto`) **não expõe** os refs de categorização (`categoryRef`/`programRef`/`budgetPlanRef`/`contractRef`) — então a categorização salva não reflete no drawer (liga #95).

## Escopo (in)

1. **`costCenterRef`** ponta-a-ponta:
   - `CostCenterRef` brand em `domain/shared/refs.ts` (validação de formato UUID v4, rehydrate-only — espelha os outros refs).
   - Campo `costCenterRef: CostCenterRef | null` em `DocumentCore` e `DraftDocument`.
   - `Document.create`/`saveDraft`/`submit`/`undoApproval` propagam o campo.
   - `saveDocument`/`saveDraft` commands aceitam `costCenterRef?: string | null` e validam via smart constructor.
   - Schema Drizzle `fin_documents`: coluna `cost_center_ref varchar(36)` nullable + **migration 0014** (`ALTER TABLE ADD COLUMN`, não-quebrante).
   - Repositório drizzle + in-memory: mapeiam a coluna (row↔domínio).
   - Borda HTTP: `createDocumentBodySchema` aceita `costCenterRef`; handler propaga.
2. **Detail DTO** expõe `contractRef`, `categoryRef`, `costCenterRef`, `programRef`, `budgetPlanRef` (Open/Approved e Draft) — round-trip da categorização editável.

## Critérios de aceite

- **CA1**: `POST /financial/documents` aceita e persiste `costCenterRef` (Open e Draft); ref inválida → 400.
- **CA2**: `GET /financial/documents/:id` devolve `costCenterRef` + demais refs de categorização.
- **CA3**: documentos pré-existentes (sem `cost_center_ref`) continuam lendo OK (coluna nullable).

## Fora de escopo (follow-ups registrados como issue)

- **Subcategoria** — Categoria não tem hierarquia (só `group`); não modelada.
- **Listagem de Plano Orçamentário** — sem fonte canônica (a própria #147 pede "definir a fonte"); budget plan é herdado do contrato, não há read port/tabela.
- Labels resolvidos (id→name) no detail — é escopo do #95 (read-model).

## Gate

W0 RED → W1 GREEN → W2 APPROVED → W3 (`typecheck`+`format:check`+`lint`+`test` verdes).
