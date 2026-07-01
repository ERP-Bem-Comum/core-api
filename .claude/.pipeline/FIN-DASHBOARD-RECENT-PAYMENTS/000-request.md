# FIN-DASHBOARD-RECENT-PAYMENTS — escopo

> Issue #239 (DASH-F2 · Camada 1). Módulo **financial**. Size **L** (o pedido exige enriquecer o read-model).
> Widget "Últimos pagamentos": Top-5 títulos **Pagos** por **data (paidAt) + conta (débito) + valor**.

## Achado (registrado)

O read-model `fin_payable_view` (#235) **não tem** `paidAt` nem a **conta-débito** — só `{refs, valueCents, dueDate, status}`. "Por data" = `paidAt`; "conta" = `debit_account_ref`. Decisão (P.O./Gabriel): **enriquecer o read-model** (fiel). Fontes já existem: `Payable.paidAt` (`fin_payables.paid_at`), `PayableManuallyPaid.paidAt` (evento), `document.debitAccountRef`.

## Escopo (in)

### Camada 0 — enriquecer o read-model
1. **`PayableView`** (+ `paidAt: string | null` ISO, `debitAccountRef: string | null`).
2. **Schema** `fin_payable_view` (+ `paid_at datetime NULL`, `debit_account_ref varchar(36) NULL`) + migration.
3. **`DocumentSaved`** (+ `debitAccountRef: string | null`) + `documentSavedEvents` (do documento) → projetor grava `debit_account_ref` no upsert.
4. **Projetor** `applyPayableEvent`: `PayableManuallyPaid` passa a setar `status='Paid'` **+ `paid_at`** (do evento) — via novo `PayableViewStore.markPaid(payableIds, paidAt)` (as demais transições seguem `updateStatus`).
5. **Store** (in-memory + drizzle): `upsert` grava os 2 campos novos; `markPaid`; `listRecentPaid(limit)` (status='Paid' ORDER BY paid_at DESC LIMIT n). Mapper + `PayableViewRow`.
6. **Backfill** reader: lê `paidAt` + `debitAccountRef` da fonte (`fin_payables.paid_at`, `fin_documents.debit_account_ref`).

### Camada 1 — widget
7. **Borda HTTP** `GET /financial/dashboard/recent-payments` (fastify + zod): Top-5 pagos → `{payableId, documentId, supplierRef, debitAccountRef, valueCents, paidAt}`. Permissão de leitura de dashboard (reusa `fiscal-document:read` ou `reference:read` — confirmar no W1).

## Fora de escopo
- Parcelamento (issue: "Sem parcelamento"); RBAC dedicado (issue: "Sem RBAC" → reusa permissão existente).
- Formatação PT / variação (isso é #237, já entregue).

## Critérios de aceite
- **CA1** `applyPayableEvent(DocumentSaved)` grava `debitAccountRef`; `PayableManuallyPaid` grava `status='Paid'` **+ `paidAt`** (do evento).
- **CA2** `listRecentPaid(5)` retorna só `Paid`, ordenados por `paidAt` desc, no máx 5.
- **CA3 (borda)** `GET /financial/dashboard/recent-payments` (autenticado) → 200 com Top-5 `{..., paidAt, debitAccountRef, valueCents}`; sem permissão → 403.
- **CA4 (backfill)** o backfill popula `paid_at`/`debit_account_ref` da fonte (integração gated).

## Pipeline (agentes por wave)
| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED (projetor CA1 + store CA2 + borda CA3) | skill **`tdd-strategist`** |
| W1 | enriquecimento read-model + query + borda | skill **`ts-domain-modeler`** + agentes **`drizzle-orm-expert`** (schema/store) + **`fastify-server-expert`** ↔ **`zod-expert`** (borda) |
| W2 | audit (persistência + borda) | agentes **`drizzle-orm-expert`** + **`zod-expert`** |
| W3 | gate + `test:integration:financial` | skill **`ts-quality-checker`** |

## DoD
Gate W3 verde. Read-model carrega `paid_at`+`debit_account_ref`; widget `recent-payments` expõe Top-5 pagos por data+conta+valor. Fecha #239.
