# FIN-PAYABLE-PROJECTION-WORKER — escopo

> Issue #307 (follow-up do #235). Módulo **financial** + composition root (`src/workers/`). Size **L**.
> Cabeia o read-model `fin_payable_view` (núcleo entregue no #235/PR #306) ao `fin_outbox` via worker de projeção.

## Contexto + achados

O núcleo do read-model (`applyPayableEvent` + `PayableViewStore` + tabela) existe (#235). Falta o **runtime** que alimenta a projeção. Dois achados de infra durante o #235:

1. O `financial` **nunca teve consumidor do próprio outbox** — `fin-outbox-helpers.ts` é **produtor-apenas**; não existe reader (`WorkerOutboxOps`) do `fin_outbox`.
2. **Não existe `fin_outbox_dead_letter`** — só `fin_outbox`. O `moveToDeadLetter` do worker exige a tabela DLQ.

## Decisão de ordenação (documentada) — FIFO por agregado, sem guard de recência

O reader claima `WHERE processed_at IS NULL ORDER BY processed_at, occurred_at ... FOR UPDATE SKIP LOCKED` (molde contracts) — **claim ordenado**. Sob **consumidor único** (1 instância do worker), eventos do mesmo agregado (documento) são processados em ordem de `occurred_at` → **FIFO por agregado**. Isso garante que `DocumentSaved` (cria a linha) é processado ANTES de `PayableApproved`/`PayableManuallyPaid` (transições), resolvendo o risco "status antes de create" apontado no W2 do #235.

**Não** se adiciona coluna `occurred_at` + guard de recência no `fin_payable_view` (diferente do `fin_supplier_view`): (a) sob FIFO, `DocumentSaved` fora de ordem não ocorre; (b) o guard de recência protegeria só re-upsert de campos descritivos — **não** resolve o caso status-antes-de-create (esse é ordenação, não recência). YAGNI. **Ressalva multi-instância** (documentada no runbook): escalar o worker p/ >1 instância exigiria particionamento por agregado (hash de `aggregate_id`) OU o guard de recência — reavaliar quando `[[async-messaging-strategy]]` disparar multi-instância.

## Escopo (in)

1. **Tabela `fin_outbox_dead_letter`** (schema + migration) — mirror de `ctr_outbox_dead_letter`.
2. **Reader do `fin_outbox`** (`WorkerOutboxOps`): `findPendingForUpdate`/`withPendingBatch`/`markProcessed`/`markFailed`/`moveToDeadLetter` — mirror de `contracts/.../outbox-repository.drizzle.ts` sobre `finOutbox`/`finOutboxDeadLetter`.
3. **Worker** `src/workers/payable-view-projection/{delivery,run}.ts` — mirror `supplier-view-projection`; consumer `financial-payable-view`; `FINANCIAL_DATABASE_URL`; graceful SIGTERM/SIGINT.
4. **Wiring public-api** — expor `applyPayableEvent`, `PayableViewStore`, `createInMemoryPayableViewStore`, `createDrizzlePayableViewStore`.
5. **Hardening m2** (do W2 do #235) — `PayableSnapshot.status: DocumentStatus` (produtor type-safe) + mapa **explícito** `DocumentStatus → PayableViewStatus` no projetor (mapeia os 8 status; sem allowlist que rejeita silenciosamente).
6. **Docs** — runbook do worker em `handbook/reference/` (env, FIFO, DLQ, multi-instância, troubleshooting).

## Fora de escopo

- Backfill de payables pré-existentes → #236.
- Widgets/endpoints Dashboard/Reports → #237/#239/#241/#112/#114.
- Guard de recência / multi-instância (documentado como ressalva; reavaliar só se escalar).

## Critérios de aceite

- **CA1 (delivery):** `createPayableProjectionDelivery(store)` + `rowToMessage` colam a row do `fin_outbox` ao `applyPayableEvent`; deliver ok → `ok`; apply err → `DeliveryError` (worker faz retry/DLQ).
- **CA2 (reader):** `findPendingForUpdate` retorna rows pendentes ordenadas por `occurred_at`; `markProcessed` idempotente (WHERE processed_at IS NULL); `moveToDeadLetter` move `fin_outbox`→`fin_outbox_dead_letter` (transação).
- **CA3 (FIFO/projeção):** dado `DocumentSaved` seguido de `PayableApproved` no outbox, quando o worker roda (1 instância), então `fin_payable_view` reflete `status='Approved'` (ordenação preservada).
- **CA4 (m2):** `PayableSnapshot.status` é `DocumentStatus`; o projetor mapeia explicitamente os 8 status (ex.: `Reconciled`/`Transmitted` → status de read-model definido, sem rejeição silenciosa).
- **CA5 (integração):** teste `payable-view-store.drizzle-mysql` + reader aplicam a migration no MySQL real (gated `MYSQL_INTEGRATION`) — valida `ON DUPLICATE KEY UPDATE`, CHECKs, claim ordenado.
- **CA6 (DLQ):** migration cria `fin_outbox_dead_letter`; `test:integration:financial` verde.

## Pipeline pré-estruturada (agentes por wave)

| Wave | Atividade | Especialista |
| :--- | :--- | :--- |
| W0 | testes RED (delivery CA1 + reader CA2 + m2 CA4) | skill **`tdd-strategist`** |
| W1 | DLQ table + reader (Drizzle) | agente **`drizzle-orm-expert`** |
| W1 | worker run/delivery (signals, runLoop, graceful) | agente **`nodejs-runtime-expert`** |
| W1 | m2 (domínio) + wiring public-api | skill **`ts-domain-modeler`** + **`ports-and-adapters`** |
| W2 | audit read-only (persistência + runtime) | agentes **`drizzle-orm-expert`** + **`nodejs-runtime-expert`** |
| W3 | gate + `test:integration:financial` | skill **`ts-quality-checker`** |

## Definition of Done

Gate W3 verde + `test:integration:financial` (MySQL real). Worker `payable-view-projection` consome `fin_outbox` → `fin_payable_view` (FIFO, DLQ, graceful). Runbook publicado. **Fecha o DoD original do #235** e destrava a Camada 1-2 (#236 + widgets).
