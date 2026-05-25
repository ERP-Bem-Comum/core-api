# Code Review - Ticket CTR-DOCUMENT-AGGREGATE-PERSISTENCE - Round 1

**Veredito:** APPROVED

## Issues

Nenhuma critica/importante/sugestao bloqueante.

## O que esta bom

1. **Schema `ctr_documents` bem modelado** — 16 colunas + 5 CHECK constraints (parentType, status, categoria, size, version) + 3 indexes para lookup principal/dedup/temporal.
2. **Hardening manual aplicado** — ENGINE/CHARSET/COLLATE no CREATE TABLE; UUIDs + hash em utf8mb4_bin. Consistente com CTR-DB-SCHEMA-HARDENING.
3. **`db.transaction` + `appendOutboxInTx`** no save — atomicidade ACID entre agregado e outbox. Padrao CTR-OUTBOX-INTEGRATION-IN-REPOS.
4. **Mapper round-trip robusto** — `documentFromRow` rehidrata via smart constructors (BucketName, StorageKey, UserRef, ContractId/AmendmentId conforme parentType). Rejeita estado invalido vindo do banco.
5. **`outbox.mapper.ts` cobre todos os 7 event types** — handlers para serialize + deserialize do ContractDocumentAttached. 15 campos serializaveis com Dates → ISO, brandeds → string.
6. **`ContractsModuleEvent` unificado** — descoberta importante: 2 definicoes paralelas do union nos arquivos `application/ports/event-bus.ts` (sem Document) e `public-api/events.ts` (com Document). Corrigido. Agora UMA fonte de verdade.
7. **Schema reserva 3 valores em `status`** (Active/LogicallyDeleted/Superseded) — antecipacao para lifecycle tickets, evita migration adicional quando esses entrarem.
8. **`'Document'` adicionado em `ctr_outbox.aggregate_type` CHECK** — outbox row carrega documentId como aggregate, permitindo auditoria por documento.
9. **Suite contratual paramétrica** rodando contra InMemory (5 pass) + Drizzle (1 SKIP guarded).
10. **InMemory + Drizzle compartilham comportamento** validado pela mesma suite — garante "porta abstrata = comportamento equivalente".

## CAs

7/7 satisfeitos.

## Proximo passo

APPROVED -> W3.
