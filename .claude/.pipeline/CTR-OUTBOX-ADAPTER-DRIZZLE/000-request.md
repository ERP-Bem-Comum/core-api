# 000 — Request CTR-OUTBOX-ADAPTER-DRIZZLE

> **Ticket #3/7 da série Outbox MySQL.** Implementa o adapter Drizzle/MySQL do `OutboxPort` + funções auxiliares para o worker (consumir + DLQ routing).
> Depende de `CTR-OUTBOX-SCHEMA` ✅ + `CTR-OUTBOX-PORTS-AND-MAPPERS` ✅.
> **NÃO refatora repos** (ticket #4); **NÃO implementa worker loop** (ticket #5).
> 20º ticket Opção B.

## Escopo

### 1. Adapter `DrizzleOutboxRepository` em `adapters/persistence/repos/outbox-repository.drizzle.ts`

Função estilo "factory" recebe `MysqlHandle` (padrão dos outros repos Drizzle):

```ts
export const createDrizzleOutboxRepository = (
  handle: MysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): OutboxPort & {
  // helpers internos para uso do worker (ticket #5) — NÃO parte do port público
  findPendingForUpdate: (limit: number) => Promise<Result<readonly OutboxRow[], OutboxQueryError>>;
  markProcessed: (eventId: string, now: Date) => Promise<Result<void, OutboxQueryError>>;
  markFailed: (eventId: string, now: Date, errorTag: string, attempt: number) => Promise<Result<void, OutboxQueryError>>;
  moveToDeadLetter: (eventId: string, now: Date, errorMessage: string) => Promise<Result<void, OutboxQueryError>>;
};
```

**`OutboxQueryError`** (tagged):
- `OutboxQueryUnavailable` (`{ tag, cause: string }`)
- `OutboxEventNotFound` (`{ tag, eventId: string }`)

### 2. `append(events)` — INSERT batch (chamado dentro da tx do repo no ticket #4)

```ts
async append(events) {
  // Mapear cada evento → OutboxInsert via eventToOutboxInsert (ticket #2)
  // Batch INSERT via Drizzle: db.insert(ctrOutbox).values([row1, row2, ...])
  // Capturar ER_DUP_ENTRY → err(OutboxAppendDuplicateEventId)
  // Outros erros → err(OutboxAppendUnavailable)
}
```

### 3. `findPendingForUpdate(limit)` — leitura com lock

```sql
SELECT * FROM ctr_outbox
WHERE processed_at IS NULL
ORDER BY occurred_at
LIMIT ?
FOR UPDATE SKIP LOCKED;
```

Via Drizzle: `db.select().from(ctrOutbox).where(...).orderBy(...).limit(limit).for('update', { skipLocked: true })`.

### 4. `markProcessed(eventId, now)` — UPDATE

```sql
UPDATE ctr_outbox SET processed_at = ? WHERE event_id = ? AND processed_at IS NULL;
```

Idempotente: `WHERE processed_at IS NULL` evita dupla marcação.

### 5. `markFailed(eventId, now, errorTag, attempt)` — UPDATE attempts

```sql
UPDATE ctr_outbox SET attempts = ?, last_error = ? WHERE event_id = ?;
```

Worker (#5) decidirá quando promover para DLQ via `moveToDeadLetter`.

### 6. `moveToDeadLetter(eventId, now, errorMessage)` — INSERT na DLQ + DELETE da outbox

Dentro de **transação** (não a do `append`, é uma tx separada do worker):

```ts
await db.transaction(async (tx) => {
  // SELECT da row + INSERT na ctr_outbox_dead_letter (copiando metadata)
  // DELETE da ctr_outbox
});
```

### 7. Adapter integrado na suite contratual (`outbox.contract.ts` do ticket #2)

```
tests/modules/contracts/adapters/persistence/repos/outbox-repository.drizzle.test.ts
```

Consome `runOutboxContract('Drizzle/MySQL', { make: async () => ... })` apontando para container MySQL — herda integration-only.

Tests específicos do adapter (não cobertos pela suite contratual):
- `findPendingForUpdate(limit=10)` retorna apenas eventos com `processed_at IS NULL`, ordenados por `occurred_at`.
- `FOR UPDATE SKIP LOCKED` funciona — 2 sessões paralelas leem conjuntos disjuntos (test integration com 2 connections).
- `markProcessed` idempotente — chamada 2× retorna OK ambas, mas só atualiza primeira vez.
- `moveToDeadLetter` move atomicamente (row sai da outbox, aparece na DLQ; rollback se uma falhar).
- `append([])` é no-op (ok sem erro).

## Critérios de aceitação

- **CA1** — `createDrizzleOutboxRepository(handle)` retorna `OutboxPort` + 4 funções auxiliares (`findPendingForUpdate`, `markProcessed`, `markFailed`, `moveToDeadLetter`).
- **CA2** — `append` faz batch INSERT (1 round-trip) e captura `ER_DUP_ENTRY` → tagged.
- **CA3** — `findPendingForUpdate` emite `FOR UPDATE SKIP LOCKED` no SQL gerado (verificável via `db.toSQL()` ou EXPLAIN no test).
- **CA4** — `markProcessed` idempotente.
- **CA5** — `moveToDeadLetter` é atômico (INSERT DLQ + DELETE outbox numa tx).
- **CA6** — Suite contratual `runOutboxContract('Drizzle/MySQL', ...)` passa 100%.
- **CA7** — Test específico de concorrência: 2 connections com `findPendingForUpdate` retornam conjuntos disjuntos.
- **CA8** — Gates: typecheck/test/test:integration/lint verdes.

## Não-objetivos

- Worker loop polling → ticket #5.
- Refactor `repo.save(agg, events)` → ticket #4 (este ticket apenas expõe `append`, não chama-o de dentro do repo do agregado).
- Throttling/backoff de retries → ticket #5.

## Risco / pontos de atenção

1. **`FOR UPDATE SKIP LOCKED` no Drizzle:** verificar API exata (`.for('update', { skipLocked: true })` ou similar). Se Drizzle não expor `skipLocked`, usar `sql\`FOR UPDATE SKIP LOCKED\`` raw após o queryBuilder.
2. **`ER_DUP_ENTRY` detection:** olhar `err.code === 'ER_DUP_ENTRY'` ou `err.errno === 1062` (consistente com fix POSIX do verify-skill-refresh-b.sh — pattern de detection).
3. **Transação do worker é independente** da transação do `append` (que vem do ticket #4 via repo.save). Atomicidade do worker (move pra DLQ) é tx própria.
4. **Test de concorrência (`SKIP LOCKED`):** precisa de 2 connections do pool — `MysqlHandle` deve suportar.
5. **Mitigação Bug #47936** — Opus + checklist ativo. Ticket grande (~6 funções + tests integration) — aceitar fallback admin.
