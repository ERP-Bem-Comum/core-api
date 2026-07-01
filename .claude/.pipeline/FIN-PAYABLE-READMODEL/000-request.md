# FIN-PAYABLE-READMODEL — escopo

> Issue #235 (FND-RM-a · Camada 0 · **GATE de toda a Camada 1-2** do Dashboard/Reports, épico #169). Módulo **financial**. Size **L**.
> Read-model próprio de payables, alimentado por **projeção sobre o stream de eventos** (ADR-0022), consumidor idempotente + migration. Molde: `fin_supplier_view` / `supplier-view-projection`.

## Contexto + achado

Dashboard/Reports precisam de um read-model de payables com `{supplierRef, contractRef, categoryRef, costCenterRef, programRef, valueCents, dueDate, status}` por título, sem ler `fin_*` direto (ADR-0014). O R-4 do spike #233 deixou a topologia para este ticket; a governança resolve:

**ADR-0022 (`0022-...:37-38`) — decisivo:** *"Read-models são PROJEÇÕES sobre o stream de eventos, alimentadas pelo caminho de event-delivery já existente (worker → EventDelivery → handler projetor). Nunca derivadas por query direta. […] o 'metadata' rico é derivado do payload tipado do evento."*

→ Projeção **evento-carregada** (read-through via public-api é o alternativo **rejeitado** pela ADR). **Achado:** os eventos do `financial` são **magros** (`DocumentSaved = { documentId, payableIds }`) — **precisam ser enriquecidos** para carregar o snapshot projetável.

## Decisão de design (registrada)

1. **Enriquecer `DocumentSaved`** com um snapshot projetável por título + refs do documento (uma vez):
   `payables: readonly { payableId, kind, retentionType, valueCents, dueDate, status }[]` + `supplierRef, contractRef, categoryRef, costCenterRef, programRef, competencia`. Aditivo (consumidores atuais ignoram os novos campos → backward-compat). Cabe no `VARCHAR(8192)` do outbox (parent + ≤4 filhos + refs ≈ 1 KB).
2. **Eventos de status já carregam `payableId`** (`PayableApproved`/`PayableManuallyPaid`) ou `payableIds` (`DocumentCancelled`); `ApprovalUndone` carrega `documentId` — enriquecer com `payableIds` para a projeção reverter status. A projeção atualiza só o `status` da(s) linha(s).
3. **Read-model `fin_payable_view`** (tabela nova `fin_*`) — colunas decompostas e tipadas (sem JSON — ADR-0020); PK `payable_id`; índices por `(status)`, `(cost_center_ref)`, `(category_ref)`, `(program_ref)`, `(supplier_ref)`, `(due_date)` para os widgets.
4. **`applyPayableEvent`** (domínio/public-api do `financial`) — projetor **idempotente por `eventId`** (mesma disciplina do `applySupplierEvent`): reprocessar não duplica linha.
5. **Consumidor** `src/workers/payable-view-projection/{run,delivery}.ts` — molde de `supplier-view-projection`, consumindo o outbox do `financial`. Vive no composition root (ADR-0006).
6. **Backfill** (contratos pré-existentes) = **#236** (FND-RM-b), fora deste ticket.

## Escopo (in)

- **Domínio:** enriquecer `document/events.ts` (`DocumentSaved` + `ApprovalUndone`); novo `payable-view/` (tipo do read-model + `applyPayableEvent` idempotente + erros).
- **Produtores:** `save-document.ts` (+ re-create da cascata), `adjust`, `submit-draft.ts`, `cancel`, `undo-approval` — passam o snapshot enriquecido ao emitir os eventos (deriva do agregado já em mãos; sem nova query).
- **Persistência:** `schemas/mysql.ts` + `fin_payable_view` → `pnpm run db:generate`; store `payable-view-store.{in-memory,drizzle}.ts` + mapper.
- **Consumidor:** worker `payable-view-projection` + wiring; expor `applyPayableEvent`/`PayableViewStore` no `public-api`.

## Fora de escopo

- **Backfill** de payables pré-existentes → #236.
- Widgets/endpoints de Dashboard/Reports (Camada 1-2) → #237/#239/#241/#112/#114 etc.
- Recebíveis (#179, módulo inexistente).

## Critérios de aceite

- **CA1** `DocumentSaved` enriquecido carrega, por título, `{payableId, valueCents, dueDate, status}` + refs do documento (teste de domínio/produtor).
- **CA2** `applyPayableEvent(DocumentSaved)` cria uma linha em `fin_payable_view` por título, com refs/valor/dueDate/`status='Open'`.
- **CA3** `applyPayableEvent(PayableApproved)` atualiza `status='Approved'` da linha; `PayableManuallyPaid` → `'Paid'`; `DocumentCancelled` → `'Cancelled'`; `ApprovalUndone` → volta a `'Open'`.
- **CA4** **idempotência:** reaplicar o mesmo `eventId` não duplica nem re-muta (chave por `eventId`).
- **CA5** consumidor `payable-view-projection` entrega o evento do outbox ao `applyPayableEvent` (delivery ok → `markProcessed`; erro → DLQ), espelhando `supplier-view-projection`.
- **CA6** backward-compat: os campos novos de `DocumentSaved` são aditivos — timeline e demais consumidores atuais seguem verdes.

## Pipeline pré-estruturada (agentes por wave)

| Wave | Atividade | Especialista |
| :--- | :--- | :--- |
| W0 | testes RED (evento enriquecido CA1 + projeção CA2/CA3 + idempotência CA4 + delivery CA5) | skill **`tdd-strategist`** |
| W1 | enriquecer eventos + `payable-view` + store + tabela/migration + consumidor | skill **`ts-domain-modeler`** + **`drizzle-schema-author`** + agente **`nodejs-runtime-expert`** (worker) |
| W2 | audit read-only | skill **`code-reviewer`** |
| W3 | gate (`typecheck`+`format`+`lint`+`test`) + `test:integration` (Drizzle real da projeção) | skill **`ts-quality-checker`** |

## Definition of Done

Gate W3 verde + integração da projeção no MySQL real. `fin_payable_view` reflete criação e transições de status por evento, idempotente. Destrava a Camada 1-2 (#236 backfill + widgets). Regressão zero nos produtores/consumidores atuais. Avança #235.
