# W0 — REPORT (RED) — CTR-OUTBOX-ADAPTER-DRIZZLE

> Wave: W0 RED | Data: 2026-05-21 | Gate: pnpm test:integration RED

## Arquivo criado

tests/modules/contracts/adapters/persistence/repos/outbox-repository.drizzle.test.ts

## Cenarios cobertos (12 testes)

- CA1: createDrizzleOutboxRepository e funcao (estrutural) — RED ERR_MODULE_NOT_FOUND
- CA6: runOutboxContract Drizzle/MySQL 5 contratuais — RED
- CA2a: append([e1,e2]) insere 2 rows — RED
- CA2b: append eventId duplicado retorna OutboxAppendDuplicateEventId — RED
- CA2c: append([]) no-op 0 rows no DB — RED
- CA3a: findPendingForUpdate so IS NULL ordenado occurred_at — RED
- CA3b: findPendingForUpdate(1) respeita limit — RED
- CA4: markProcessed idempotente 2 chamadas so 1 update — RED
- CA5a: moveToDeadLetter move row outbox para DLQ atomicamente — RED
- CA5b: moveToDeadLetter eventId inexistente retorna OutboxEventNotFound — RED
- CA7: FOR UPDATE SKIP LOCKED 2 connections disjuntas — RED
- auxiliar: markFailed atualiza attempts e last_error — RED

## Saida RED confirmada

Error ERR_MODULE_NOT_FOUND: Cannot find module outbox-repository.drizzle.ts
fail 1 | pass 0 | skipped 0

## Mudancas colaterais

package.json test:integration atualizado com o novo test file.

## Decisoes para W1

1. Helpers sincronos: buffer interno lastAppendedRows[] sincronizado com append
2. idGenerator injetavel em opts para testar ER_DUP_ENTRY
3. OutboxQueryError: OutboxQueryUnavailable + OutboxEventNotFound + OutboxAppendDuplicateEventId
4. ER_DUP_ENTRY detection: err.errno === 1062 ou err.code === ER_DUP_ENTRY
