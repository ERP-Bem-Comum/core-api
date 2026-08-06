# Phase 0 — Research: Partners outbox de fornecedor

Consolida a investigação do padrão `ctr_outbox` (drizzle-orm-expert) + o estado do `supplier`. Formato Decision / Rationale / Alternatives. Citações canônicas (§IX) por ticket no W2.

## Padrão de outbox do `contracts` (replicar)

**Decision**: replicar 1:1 no `partners` (prefixo `par_*`):

- Schema `par_outbox`: `event_id` (char36 PK), `aggregate_id` (char36), `aggregate_type` (varchar32, CHECK `IN ('Supplier')`), `event_type` (varchar64), `schema_version` (smallint), `occurred_at`/`enqueued_at`/`processed_at` (datetime fsp3; `processed_at` NULL=pendente), `attempts` (smallint default 0, CHECK ≥0), `payload` (`varchar(8192)`, `JSON.stringify` — **sem JSON nativo**, ADR-0020). Índice `(processed_at, occurred_at)` + `(aggregate_id)`.
- `par_outbox_dead_letter` (espelha `ctr_outbox_dead_letter`).
- Append na MESMA tx do agregado: `db.transaction(tx => { persist; appendOutboxInTx(tx, events) })` (`contract-repository.drizzle.ts:315-321`).
- Port `OutboxPort.append(events)` (sem `tx` no shape público) + `WorkerOutboxOps` (`withPendingBatch`/`markProcessed`/`markFailed`/`moveToDeadLetter`). Adapters InMemory + Drizzle.
- Worker (`outbox-worker.ts`): `FOR UPDATE SKIP LOCKED`, `deliver` → `markProcessed WHERE processed_at IS NULL` (idempotente); retry com `attempts`; `maxAttempts` → dead-letter. `runLoop` com backoff. `config.ts` (env) + `run.ts` (standalone, SIGTERM). Script `worker:outbox:partners`.

**Rationale**: ADR-0015 prescreve o outbox; o `contracts` é a implementação de referência madura. Replicar reduz risco e mantém consistência. Fonte: investigação cita `schemas/mysql.ts:313-355`, `outbox-repository.drizzle.ts:58-69/114-391`, `worker/*`.

**Alternatives considered**: extrair um pacote compartilhado de outbox (DRY) — rejeitado: ADR-0014 isola por BC; seria refactor à parte. Mensageria externa (Kafka/Redis) — proibida (ADR-0015/constituição).

## Payload de integração (name + cnpj) — decisão técnica central

**Decision**: **Opção A** — montar o payload de integração no **adapter de persistência** (`save(supplier, events)`), a partir do **agregado Supplier** (que tem `name` e `cnpj`), no momento do append. Os eventos de domínio permanecem inalterados.

**Rationale**: os eventos de domínio atuais não carregam `name` (`SupplierRegistered` só `cnpj`; `SupplierEdited` nada — `events.ts:7,10`). O agregado `Supplier` (`types.ts`) tem `name`+`cnpj` em qualquer estado. O `save` recebe o agregado → o mapper monta `{ supplierRef, name, document: String(cnpj), occurredAt }`. Menor escopo, **não toca o domínio** (princípio V), separa evento-de-domínio (interno) de evento-de-integração (contrato cross-módulo).

**Alternatives considered**: **Opção B** — enriquecer os eventos de domínio (`SupplierRegistered`/`SupplierEdited` ganham `name`/`cnpj`). Semanticamente mais "self-contained" (Evans), e é o que o `contracts` faz (evento carrega o payload). Mas toca `supplier.ts` (register/edit) + `events.ts` + testes de domínio — mais invasivo. Registrado como possível ADR futuro; **não** adotado neste ticket.

## Entrega (delivery) ao consumidor

**Decision**: o worker entrega a um `EventDelivery` (logger, como o `contracts` hoje — `LoggerEventDelivery` grava JSONL). O roteamento real ao `financial` é definido na **US2 da #47** (consumer), não aqui.

**Rationale**: o #92 é o **produtor**. Definir o mecanismo de entrega in-process partners→financial é responsabilidade do consumidor (US2), que escolhe como recebe (handler via public-api, bus in-process, etc.). Espelha o estado atual do `contracts` (outbox + worker logger, consumer real futuro).

## Idempotência

**Decision**: at-least-once + `markProcessed WHERE processed_at IS NULL` no worker (idempotente na marcação). A idempotência no **consumidor** (tabela `eventos_processados`, PK `consumer_id`+`event_id`) é responsabilidade da US2 (financial) — fora deste ticket.

## Migration

`pnpm run db:generate:partners` (config `drizzle.config.partners.ts`) → `migrations/mysql/0009_*.sql`. Auditar; inserir CHARSET/COLLATE manual se necessário.

## Princípio IX — citações a registrar

| Decisão-chave                                                  | Fonte canônica                                                                            | Ticket/Wave                 |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------- |
| Outbox / at-least-once / atomicidade evento+estado             | ADR-0015; Vernon, _Implementing DDD_, cap. "Domain Events" (publicação confiável)         | W0/W2 de `PAR-OUTBOX-INFRA` |
| Evento de integração vs evento de domínio (payload no adapter) | Vernon, _Implementing DDD_ (Domain Events vs integration); ADR-0006 (public-api/contrato) | W2 de `PAR-SUPPLIER-EVENTS` |

> Citação literal ≥4 linhas via acdg-skills (ou fallback local `acdg/skills_base/`).

## Plano de teste W0 (resumo)

- **PAR-OUTBOX-INFRA**: contrato de outbox — append na tx é atômico (rollback some o evento); `withPendingBatch` entrega pendentes; `markProcessed` idempotente; `maxAttempts` → dead-letter. InMemory (pnpm test) + integração MySQL (`test:integration:partners`).
- **PAR-SUPPLIER-EVENTS**: cadastrar fornecedor → 1 evento `SupplierRegistered` no outbox com `supplierRef`/`name`/`document`; editar (qualquer campo) → 1 evento `SupplierEdited` com snapshot pós-edição; rollback da escrita → nenhum evento.
