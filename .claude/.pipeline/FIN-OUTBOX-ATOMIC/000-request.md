# FIN-OUTBOX-ATOMIC — Request (#127)

**Size:** L · **Fase:** B (Correção de base) · **Feature SDD:** `specs/024-fin-transactional-outbox/`

## Problema

O Financeiro persiste estado (`repo.save`) e enfileira evento (`outbox.append`) em DUAS operações separadas; crash entre elas perde o evento (dual-write). E **não há outbox persistente** — `composition.ts:340` usa `createInMemoryOutbox()` mesmo no driver mysql. Viola ADR-0015.

## Decisões (spec + clarify)

- **Construir `fin_outbox`** (migration, espelha `ctr_outbox`): `event_id` char(36) PK (idempotência), `payload` varchar(8192) não-JSON (ADR-0020), índice `(processed_at, occurred_at)`.
- **Atomicidade**: gravar estado + INSERT no `fin_outbox` na MESMA `db.transaction`, passando os eventos PARA DENTRO do repo (helper `appendFinOutboxInTx`), espelhando contracts.
- **Escopo (clarify, discussão de 3 especialistas)**: 7 use-cases de documento (DocumentRepository.save) **E** conciliação (ReconciliationRepository.confirm/confirmManualEntry/undo). Atomicidade é propriedade do emissor (Vernon:7562/Newman:2966).

## Critérios de aceite

- **CA1**: falha no INSERT do outbox → estado não persiste; retorna slug de erro de persistência (sem vazar Error).
- **CA2**: estado + evento na MESMA `db.transaction` (documento E conciliação) — integração drizzle-mysql injeta falha e confirma `COUNT(agregado)` e `COUNT(fin_outbox)` == baseline.
- **CA3**: falha de constraint no outbox reverte a tx; estado anterior preservado.
- **CA4**: idempotência por PK `event_id`.
- **CA5**: gate W3 verde + `test:integration:financial` (Docker).

## Não-objetivos

Worker de entrega + DLQ `fin_outbox_failed` (concern do consumidor). Sem novo ADR (conformidade ADR-0015).

## Referências

Issue #127 · Plano: `specs/024-fin-transactional-outbox/plan.md` · `research.md` (Vernon:7562/Newman:2966/ADR-0015 + posições drizzle/mysql).
