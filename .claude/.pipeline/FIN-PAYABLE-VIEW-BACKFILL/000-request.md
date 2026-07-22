# FIN-PAYABLE-VIEW-BACKFILL — escopo

> Issue #236 (FND-RM-b · Camada 0). Módulo **financial** + composition root (`src/jobs/`). Size **M**.
> Job one-shot idempotente que popula `fin_payable_view` do histórico existente. Molde: `supplier-view-backfill`.

## Contexto + design

O worker `payable-view-projection` (#307) já projeta o histórico **que está no `fin_outbox`** (o
financial nunca teve consumer → todos os eventos estão `processed_at IS NULL` → o worker processa
desde o começo). O **backfill cobre o GAP**: payables **sem evento no outbox** — criados antes do
`fin_outbox` existir (#127) ou cujos eventos foram podados. Reconcilia contra a **fonte-de-verdade**
`fin_payables ⋈ fin_documents`.

**Idempotente + seguro com o worker:** o `PayableViewStore.upsert` **preserva `status`** de linha
existente (status é dono dos eventos de transição). Então o backfill **preenche lacunas** (payables
ausentes do read-model, com o status atual da fonte) **sem clobberar** linhas já geridas pelo worker.
Rerodar o backfill não duplica (upsert por `payableId`).

## Escopo (in)

1. **Core** `src/jobs/financial/payable-view-backfill/backfill.ts`: `backfillPayableViews(records: readonly PayableView[], store): Promise<Result<BackfillResult, never>>` — upsert em lote + `{applied, failed}`. Puro (testável in-memory). Mirror `backfillSupplierViews`.
2. **Job** `src/jobs/financial/payable-view-backfill/run.ts`: SELECT `fin_payables ⋈ fin_documents` (campos: id/documentId/kind/retentionType/value/dueDate/status + refs do documento) → mapeia p/ `PayableView` (status via `documentStatusToViewStatus`, dueDate `Date`→ISO) → `backfillPayableViews`. `FINANCIAL_DATABASE_URL`. Exit codes sysexits.
3. **Script** `job:payable-view-backfill` no `package.json` (mirror supplier).

## Fora de escopo

- Widgets/endpoints Dashboard/Reports (#237/#239/#241/#112/#114).
- Recomputar status a partir da fonte (o worker é dono do status; backfill só preenche lacunas).

## Critérios de aceite

- **CA1** `backfillPayableViews([r1,r2], store)` → `{applied: 2, failed: 0}`; as 2 linhas ficam no store.
- **CA2 (idempotência)** rerodar com os mesmos records → sem duplicata (upsert por payableId); linhas existentes não são clobberadas em `status`.
- **CA3 (vazio)** `backfillPayableViews([], store)` → `{applied: 0, failed: 0}`, sem escrita.
- **CA4 (integração, gated `MYSQL_INTEGRATION`)** o job lê `fin_payables ⋈ fin_documents` e popula `fin_payable_view` (status mapeado; refs corretos).

## Pipeline pré-estruturada (agentes por wave)

| Wave | Atividade | Especialista |
| :--- | :--- | :--- |
| W0 | testes RED (backfill CA1/CA2/CA3) | skill **`tdd-strategist`** |
| W1 | backfill core + job (SELECT+map) | skill **`nodejs-fs-scripter`**/**`ports-and-adapters`** + agente **`drizzle-orm-expert`** (SELECT) |
| W2 | audit read-only (SELECT/mapeamento/idempotência) | agente **`drizzle-orm-expert`** |
| W3 | gate + `test:integration:financial` | skill **`ts-quality-checker`** |

## Definition of Done

Gate W3 verde. Job popula `fin_payable_view` do histórico (lacunas não cobertas pelo worker),
idempotente, sem clobberar status gerido pelo worker. Completa a Camada 0 (FND-RM) — read-model
reflete todo o histórico. Destrava os widgets (#237/#239/#241/#112/#114).
