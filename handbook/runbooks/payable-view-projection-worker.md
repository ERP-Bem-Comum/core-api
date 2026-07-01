# Runbook — Worker `payable-view-projection`

> Projeção do read-model **`fin_payable_view`** (Camada 0 do Dashboard/Reports, épico #169) a partir
> do stream de eventos do `fin_outbox`. Entregue em #235 (núcleo) + **#307** (este worker).
> Padrões: ADR-0015 (outbox), ADR-0022 (read-model via projeção), ADR-0041 (workers especializados).

## 1. O que faz e por quê

O Dashboard/Reports não pode ler as tabelas `fin_*` do agregado direto (ADR-0014). O read-model
`fin_payable_view` é uma **projeção evento-carregada** (ADR-0022): uma linha materializada por título
(`payableId`), com `{supplierRef, contractRef, categoryRef, costCenterRef, programRef, valueCents,
dueDate, status}`, consultável pelos widgets (#237/#239/#241/#242/#243/#112/#114).

Este worker é quem **alimenta** essa projeção: lê os eventos do `fin_outbox` e os aplica no
read-model via `applyPayableEvent`.

## 2. Arquitetura (fluxo de um evento)

```
produtor (save-document / adjust / approve / pay / cancel / undo-approval)
   └─ appendFinOutboxInTx  → INSERT em fin_outbox (MESMA tx do estado; ADR-0015)
                                     │
        ┌────────────────────────────┘
        ▼
worker payable-view-projection (src/workers/payable-view-projection/)
   run.ts    → abre 1 pool (FINANCIAL_DATABASE_URL), monta reader+store+delivery, runLoop
   reader    → fin-outbox-reader.drizzle.ts (claim ordenado FOR UPDATE SKIP LOCKED)
   delivery  → delivery.ts (rowToMessage {eventType,payload} → applyPayableEvent)
   apply     → applyPayableEvent (public-api) → PayableViewStore (Drizzle)
                                     │
                                     ▼
                        UPSERT / UPDATE em fin_payable_view
```

- **1 pool** (financial): o outbox e o read-model vivem no mesmo módulo — diferente do
  `supplier-view-projection` (2 pools: lê `par_outbox`, escreve `fin_supplier_view`).
- **Payload opaco**: o `delivery` passa `{eventType, payload}` cru; o `applyPayableEvent` desserializa
  e valida (payload malformado → `DeliveryError` → retry/DLQ).

### Eventos consumidos

| Evento | Efeito no read-model |
| :-- | :-- |
| `DocumentSaved` (enriquecido) | **upsert** de uma linha por título (snapshot: refs + valor + dueDate + status). Não sobrescreve `status` de linha existente. |
| `PayableApproved` | `updateStatus(payableId, 'Approved')` |
| `PayableManuallyPaid` | `updateStatus(payableId, 'Paid')` |
| `DocumentCancelled` | `updateStatus(payableIds, 'Cancelled')` |
| `ApprovalUndone` | `updateStatus(payableIds, 'Open')` |
| demais (`ApproverEscalated`, …) | **skip** (ok, sem escrita) |

`DocumentSaved` carrega `status` como `DocumentStatus` (8 valores); o projetor mapeia
explicitamente para os 4 do read-model (`documentStatusToViewStatus`): settled→`Paid`,
em-trânsito→`Approved`, recusado→`Cancelled`, rascunho→`Open` (switch exaustivo — status novo
quebra o `typecheck`, sem reject silencioso).

## 3. ⚠️ Ordenação — FIFO por agregado (rodar SINGLE-INSTANCE)

A correção da projeção **depende de entrega FIFO por agregado**. O reader claima
`WHERE processed_at IS NULL ORDER BY processed_at, occurred_at FOR UPDATE SKIP LOCKED` — sob **uma
única instância** do worker, os eventos do mesmo documento são processados em ordem de ocorrência.
Isso garante que `DocumentSaved` (que cria a linha) é processado **antes** de `PayableApproved`/
`PayableManuallyPaid` (transições) — senão o `updateStatus` seria no-op de 0 linhas e a transição
se perderia.

**Não há guard de recência / coluna `occurred_at` no read-model** (diferente do `fin_supplier_view`):
sob FIFO, `DocumentSaved` fora de ordem não ocorre; e o guard de recência protegeria só re-upsert de
campos descritivos — **não** resolveria o caso status-antes-de-create (isso é ordenação, não
recência). YAGNI.

**Ressalva multi-instância:** escalar o worker para **>1 réplica** quebra o FIFO por agregado
(`SKIP LOCKED` particiona batches entre workers; eventos do mesmo documento podem cair em réplicas
diferentes fora de ordem). Antes de escalar (gatilho em [[async-messaging-strategy]]), adicionar
**particionamento por agregado** (rotear `aggregate_id` por hash → réplica fixa) **ou** o guard de
recência (`occurred_at` no read-model + `IF(fresher,…)` no upsert + status "pending" buffer para o
caso status-antes-de-create). **Hoje: 1 réplica só** (o compose declara 1).

> **⚠️ Modo de falha silencioso (se o FIFO for violado).** Se uma transição de status
> (`PayableApproved`/`PayableManuallyPaid`/…) for processada **antes** do `DocumentSaved` que cria a
> linha — cenário possível só sob **violação de FIFO** (multi-instância sem particionamento; clock
> skew; **reprocesso manual de DLQ fora de ordem**) — o `updateStatus` roda `UPDATE ... WHERE
> payable_id IN (...)` afetando **0 linhas**, retorna `ok`, e o evento é marcado como `processed`. A
> transição é **descartada silenciosamente** (sem erro, sem retry, sem DLQ): o dashboard mostraria o
> status desatualizado, sem sinal operacional. Sob 1 réplica + claim ordenado isso **não ocorre**.
> Ao **reprocessar a DLQ manualmente**, reenfileirar os eventos de um documento **em ordem de
> `occurred_at`** (o `DocumentSaved` primeiro). Observabilidade (`updateStatus` logar
> `affectedRows === 0`) é follow-up.

## 4. Idempotência + DLQ (at-least-once)

- **Idempotência**: operações set-based (`upsert` por `payableId`, `updateStatus`). Reprocessar o
  mesmo evento (redelivery antes do `markProcessed`) rende o mesmo estado. `DocumentSaved`
  reprocessado NÃO regride `status` (o `set` do `ON DUPLICATE KEY UPDATE` omite `status`).
- **DLQ**: falha de entrega (payload inválido / store indisponível) → `attempts++`; ao atingir
  `maxAttempts` (5), a row é movida de `fin_outbox` → `fin_outbox_dead_letter` (transação;
  `failed_at` + `last_error`). Payload corrupto (falha no `rowToMessage`) vai direto à DLQ.

## 5. Configuração

| Env | Obrigatório | Descrição |
| :-- | :-- | :-- |
| `FINANCIAL_DATABASE_URL` | sim | DSN MySQL do módulo financial (outbox + read-model). |

`runLoop` (em `run.ts`): `batchSize: 10, maxAttempts: 5, pollIntervalMs: 500, idleSleepMs: 1000`.
Migrations **não** são aplicadas pelo worker (responsabilidade do release — `0027` cria
`fin_payable_view`, `0028` cria `fin_outbox_dead_letter`).

## 6. Como rodar

```bash
# Local (foreground)
FINANCIAL_DATABASE_URL=mysql://user:pass@127.0.0.1:3306/core pnpm run worker:payable-projection

# Docker (profile workers) — 1 réplica
docker compose --profile workers up payable-projection
```

Encerramento **graceful** via SIGTERM/SIGINT (aborta o `runLoop`, fecha o pool — Node 24).

## 7. Troubleshooting

| Sintoma | Diagnóstico | Ação |
| :-- | :-- | :-- |
| Linhas não aparecem no `fin_payable_view` | worker parado / sem `FINANCIAL_DATABASE_URL` | subir o worker; conferir env. |
| Status "atrasado" no read-model | backlog no `fin_outbox` (worker lento/parado) | `SELECT COUNT(*) FROM fin_outbox WHERE processed_at IS NULL` → subir/investigar. |
| Evento na DLQ | `SELECT * FROM fin_outbox_dead_letter ORDER BY failed_at DESC` | inspecionar `last_error` + `payload`; corrigir causa; re-enfileirar manualmente se aplicável. |
| Status errado após transição | possível violação de FIFO (multi-instância?) | confirmar **1 réplica**; ver §3. |
| Payables pré-existentes ausentes | read-model só reflete eventos NOVOS | rodar o **backfill** (#236 / `FND-RM-b`). |

## 8. Relacionados

- **#235** (núcleo: `applyPayableEvent`, `PayableViewStore`, `fin_payable_view`) — PR #306.
- **#236** (backfill one-shot de payables pré-existentes) — o worker só projeta eventos novos.
- Widgets Dashboard/Reports: #237/#239/#241/#242/#243/#112/#114.
- ADR-0015 (outbox), ADR-0022 (read-model via projeção), ADR-0041 (workers especializados).
- Moldes: `supplier-view-projection` (worker), `contracts/.../outbox-repository.drizzle.ts` (reader).
