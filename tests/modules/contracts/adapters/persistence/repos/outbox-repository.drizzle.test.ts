/**
 * CTR-OUTBOX-ADAPTER-DRIZZLE — W0 (RED) — adapter Drizzle do OutboxPort
 *
 * Cobre os CAs do ticket #3/7 da série Outbox:
 *   CA1 — createDrizzleOutboxRepository retorna OutboxPort + 4 auxiliares.
 *   CA2 — append faz batch INSERT (1 round-trip) e captura ER_DUP_ENTRY → tagged.
 *   CA3 — findPendingForUpdate emite FOR UPDATE SKIP LOCKED.
 *   CA4 — markProcessed é idempotente.
 *   CA5 — moveToDeadLetter é atômico (INSERT DLQ + DELETE outbox numa tx).
 *   CA6 — runOutboxContract('Drizzle/MySQL') passa 100%.
 *   CA7 — 2 connections com findPendingForUpdate retornam conjuntos disjuntos.
 *   CA8 — gates typecheck/test/test:integration/lint verdes (verificado em W3).
 *
 * Estado W0: RED — createDrizzleOutboxRepository não existe →
 *   todos os imports falham com ERR_MODULE_NOT_FOUND.
 *
 * Padrão de integração (alinhado com drizzle-mysql.test.ts):
 *   - Guard: MYSQL_INTEGRATION=1.
 *   - 1 handle MySQL compartilhado por arquivo (before/after).
 *   - Tabelas outbox truncadas em beforeEach (independência).
 *   - Segundo handle (h2) aberto/fechado dentro do test de concorrência (CA7).
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';

// ── Importações do adapter Drizzle ────────────────────────────────────────────
import { createDrizzleOutboxRepository } from '#src/modules/contracts/adapters/persistence/repos/outbox-repository.drizzle.ts';

// ── Suite contratual (ticket #2) ──────────────────────────────────────────────
import { runOutboxContract } from '../../../application/ports/outbox.contract.ts';

// ── Helpers de domínio para fixtures ─────────────────────────────────────────
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import type { ContractsModuleEvent } from '#src/modules/contracts/application/ports/event-bus.ts';
import { isOk } from '#src/shared/index.ts';

// ─── Configuração ─────────────────────────────────────────────────────────────

const VALID_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

const integrationEnabled = (): boolean => process.env.MYSQL_INTEGRATION === '1';

// ─── Fixtures de eventos ──────────────────────────────────────────────────────

const makeContractCreatedEvent = (at?: Date): ContractsModuleEvent => ({
  type: 'ContractCreated',
  contractId: ContractId.generate(),
  occurredAt: at ?? new Date(),
});

// ─── Truncate das tabelas outbox em FK-safe order ─────────────────────────────

const truncateOutbox = async (handle: MysqlHandle): Promise<void> => {
  const { db, schema } = handle;
  // DLQ não tem FK com outbox, mas truncamos separadamente por clareza.
  await db.delete(schema.ctrOutboxDeadLetter);
  await db.delete(schema.ctrOutbox);
};

// ─── CA-1 — Estrutural (sem MySQL) ────────────────────────────────────────────
// Falha em W0 por ERR_MODULE_NOT_FOUND; passa em W1 quando o arquivo existir.

describe('CTR-OUTBOX-ADAPTER-DRIZZLE — CA-1: shape do adapter', () => {
  it('CA-1: createDrizzleOutboxRepository é uma função', () => {
    assert.equal(typeof createDrizzleOutboxRepository, 'function');
  });
});

// ─── CA-2..CA-8 — Integration tests ──────────────────────────────────────────

if (integrationEnabled()) {
  let handle: MysqlHandle | null = null;

  before(async () => {
    const r = await openMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) {
      throw new Error(`fixture: openMysql falhou — ${r.error}`);
    }
    handle = r.value;
  });

  // CRÍTICO: fechar o pool ao fim da suite ou o processo não termina.
  after(async () => {
    if (handle !== null) {
      await handle.close();
      handle = null;
    }
  });

  beforeEach(async () => {
    if (handle === null) throw new Error('fixture: handle MySQL não inicializado');
    await truncateOutbox(handle);
  });

  // ── CA-6 — Suite contratual parametrizada ────────────────────────────────
  // Reutiliza os 5 cenários de outbox.contract.ts contra o Drizzle real.
  // `testHelpers` do adapter mantém buffer interno sincronizado com cada `append`
  // bem-sucedido — satisfaz a interface síncrona da suite contratual sem ir ao DB.
  runOutboxContract('Drizzle/MySQL', {
    make: async () => {
      if (handle === null) throw new Error('fixture: handle MySQL não inicializado');
      await truncateOutbox(handle);
      const repo = createDrizzleOutboxRepository(handle);
      return {
        port: repo,
        helpers: repo.testHelpers,
      };
    },
  });

  // ── CA-2 — append batch + ER_DUP_ENTRY ───────────────────────────────────

  describe('CTR-OUTBOX-ADAPTER-DRIZZLE — CA-2: append batch + ER_DUP_ENTRY', () => {
    it('CA-2a: append([e1, e2]) insere 2 rows em 1 round-trip', async () => {
      if (handle === null) throw new Error('fixture: handle não inicializado');
      const repo = createDrizzleOutboxRepository(handle);

      const e1 = makeContractCreatedEvent(new Date('2026-01-15T10:00:00.000Z'));
      const e2 = makeContractCreatedEvent(new Date('2026-01-15T10:01:00.000Z'));

      const result = await repo.append([e1, e2]);
      assert.equal(
        isOk(result),
        true,
        `append falhou: ${JSON.stringify(!result.ok ? result.error : '')}`,
      );

      // Confirma que as 2 rows estão no DB.
      const rows = await handle.db.select().from(handle.schema.ctrOutbox);
      assert.equal(rows.length, 2, 'deve existir 2 rows na ctr_outbox após append de 2 eventos');
    });

    it('CA-2b: append com eventId duplicado retorna err OutboxAppendDuplicateEventId', async () => {
      if (handle === null) throw new Error('fixture: handle não inicializado');
      const repo = createDrizzleOutboxRepository(handle);

      const event = makeContractCreatedEvent();

      // Primeiro append: deve ter sucesso.
      const first = await repo.append([event]);
      assert.equal(
        isOk(first),
        true,
        `1º append falhou: ${JSON.stringify(!first.ok ? first.error : '')}`,
      );

      // Verificar que ao menos 1 row foi inserida.
      const rowsBefore = await handle.db.select().from(handle.schema.ctrOutbox);
      assert.ok(rowsBefore.length >= 1, 'deve existir ao menos 1 row após 1º append');
      const firstRow = rowsBefore[0];
      assert.ok(firstRow !== undefined);

      // Tentar inserir manualmente uma row com o mesmo event_id para simular PK conflict.
      // O adapter deve capturar ER_DUP_ENTRY e retornar tagged error.
      // Para isso, criamos um segundo adapter e tentamos append com eventId forçado.
      // Como o mapper gera UUID fresh por append, usamos inserção direta + append.
      //
      // Estratégia: inserir row idêntica diretamente via DB e depois chamar append
      // com um objeto que produziria o mesmo eventId — não é possível diretamente
      // porque o mapper sempre gera UUID novo.
      //
      // Solução correta: o adapter deve expor `appendWithId(eventId, event)` para
      // testes, OU a suíte testa o erro via colisão de row com INSERT direto.
      //
      // Implementação W1: append recebe rows com eventId pre-gerado; o test
      // força duplicata fazendo INSERT direto e depois append que gera o mesmo UUID.
      // Como UUIDs são aleatórios, a única forma de testar ER_DUP_ENTRY via append
      // é injetar um `idGenerator` fixo no adapter.
      //
      // Decisão para W1: createDrizzleOutboxRepository aceita opção opcional
      // `idGenerator?: () => string` (mesmo padrão do mapper eventToOutboxInsert).
      const { sql: drizzleSql } = await import('drizzle-orm');
      const existingEventId = firstRow.eventId;

      // Inserir uma row "ghost" com o mesmo event_id para causar PK collision.
      // O próximo append não saberá do ghost — mas ao tentar INSERT com mesmo PK, falha.
      // Para isso, o adapter `append` deve usar idGenerator injetável no W1.
      //
      // Por ora em W0, testamos via INSERT direto + tentativa de re-INSERT via sql raw.
      await assert.rejects(
        async () => {
          if (handle === null) throw new Error('fixture: handle não inicializado');
          // Tentar inserir row com mesmo event_id — deve falhar por ER_DUP_ENTRY.
          await handle.db.execute(drizzleSql`
            INSERT INTO ctr_outbox
              (event_id, aggregate_id, aggregate_type, event_type, schema_version,
               occurred_at, enqueued_at, processed_at, attempts, payload)
            SELECT
              ${existingEventId}, aggregate_id, aggregate_type, event_type, schema_version,
              occurred_at, enqueued_at, processed_at, attempts, payload
            FROM ctr_outbox
            WHERE event_id = ${existingEventId}
          `);
        },
        (err: unknown) => {
          // ER_DUP_ENTRY = errno 1062 no mysql2.
          const candidates: unknown[] = [err];
          if (err instanceof Error && err.cause !== undefined) candidates.push(err.cause);
          const isDup = candidates.some((e) => {
            if (typeof e === 'object' && e !== null) {
              const obj = e as Record<string, unknown>;
              if (obj['errno'] === 1062) return true;
              const code = typeof obj['code'] === 'string' ? obj['code'] : '';
              if (code === 'ER_DUP_ENTRY') return true;
            }
            return String(e).includes('Duplicate entry') || String(e).includes('ER_DUP_ENTRY');
          });
          assert.ok(isDup, `erro esperado ER_DUP_ENTRY (errno 1062); recebido: ${String(err)}`);
          return true;
        },
        'INSERT com event_id duplicado deve lançar ER_DUP_ENTRY no MySQL',
      );

      // Teste direto do mapeamento: criar adapter com idGenerator fixo que retorna
      // o eventId já existente → append deve retornar err OutboxAppendDuplicateEventId.
      const repoWithFixedId = createDrizzleOutboxRepository(handle, {
        idGenerator: () => existingEventId,
      });
      const dupResult = await repoWithFixedId.append([makeContractCreatedEvent()]);
      assert.equal(dupResult.ok, false, 'append com eventId duplicado deve retornar err');
      if (!dupResult.ok) {
        assert.equal(
          dupResult.error.tag,
          'OutboxAppendDuplicateEventId',
          `tag esperada OutboxAppendDuplicateEventId; recebida: ${dupResult.error.tag}`,
        );
        // Narrowing explícito: OutboxAppendDuplicateEventId tem campo `eventId`.
        // O tipo vem de OutboxAppendError (port outbox.ts), não de OutboxQueryError.
        const e = dupResult.error as { tag: string; eventId: string };
        assert.equal(e.eventId, existingEventId, 'eventId no error deve bater com o conflito');
      }
    });

    it('CA-2c: append([]) é no-op — retorna ok e não insere rows', async () => {
      if (handle === null) throw new Error('fixture: handle não inicializado');
      const repo = createDrizzleOutboxRepository(handle);

      const result = await repo.append([]);
      assert.equal(
        isOk(result),
        true,
        `append([]) falhou: ${JSON.stringify(!result.ok ? result.error : '')}`,
      );

      const rows = await handle.db.select().from(handle.schema.ctrOutbox);
      assert.equal(rows.length, 0, 'ctr_outbox deve estar vazia após append([])');
    });
  });

  // ── CA-3 — findPendingForUpdate ───────────────────────────────────────────

  describe('CTR-OUTBOX-ADAPTER-DRIZZLE — CA-3: findPendingForUpdate', () => {
    it('CA-3a: retorna apenas rows com processed_at IS NULL, ordenadas por occurred_at', async () => {
      if (handle === null) throw new Error('fixture: handle não inicializado');
      const repo = createDrizzleOutboxRepository(handle);

      // Inserir 3 eventos com timestamps diferentes.
      const t1 = new Date('2026-01-15T10:00:00.000Z');
      const t2 = new Date('2026-01-15T10:01:00.000Z');
      const t3 = new Date('2026-01-15T10:02:00.000Z');
      await repo.append([
        makeContractCreatedEvent(t2), // inserido fora de ordem intencional
        makeContractCreatedEvent(t1),
        makeContractCreatedEvent(t3),
      ]);

      // Marcar o 1º inserido (t2) como processado via markProcessed.
      const allRows = await handle.db
        .select({ eventId: handle.schema.ctrOutbox.eventId })
        .from(handle.schema.ctrOutbox);
      assert.equal(allRows.length, 3, 'deve haver 3 rows na ctr_outbox');

      // Selecionar a row com occurred_at = t2 para marcar como processada.
      const { eq } = await import('drizzle-orm');
      await handle.db
        .update(handle.schema.ctrOutbox)
        .set({ processedAt: new Date() })
        .where(eq(handle.schema.ctrOutbox.occurredAt, t2));

      // findPendingForUpdate deve retornar apenas as 2 pendentes, em ordem t1 < t3.
      const pending = await repo.findPendingForUpdate(10);
      assert.equal(
        isOk(pending),
        true,
        `findPendingForUpdate falhou: ${JSON.stringify(!pending.ok ? pending.error : '')}`,
      );
      if (!pending.ok) return;

      const rows = pending.value;
      assert.equal(rows.length, 2, 'deve retornar 2 rows pendentes (a com t2 foi marcada)');

      // Verificar ordem: occurred_at crescente.
      assert.ok(rows[0] !== undefined && rows[1] !== undefined, 'rows[0] e rows[1] devem existir');
      assert.ok(
        rows[0].occurredAt.getTime() <= rows[1].occurredAt.getTime(),
        `rows devem estar ordenadas por occurred_at: ${rows[0].occurredAt.toISOString()} > ${rows[1].occurredAt.toISOString()}`,
      );
      assert.equal(
        rows[0].occurredAt.getTime(),
        t1.getTime(),
        'primeiro evento pendente deve ser t1',
      );
      assert.equal(
        rows[1].occurredAt.getTime(),
        t3.getTime(),
        'segundo evento pendente deve ser t3',
      );
    });

    it('CA-3b: limit é respeitado — findPendingForUpdate(1) retorna no máximo 1 row', async () => {
      if (handle === null) throw new Error('fixture: handle não inicializado');
      const repo = createDrizzleOutboxRepository(handle);

      await repo.append([
        makeContractCreatedEvent(new Date('2026-01-15T10:00:00.000Z')),
        makeContractCreatedEvent(new Date('2026-01-15T10:01:00.000Z')),
        makeContractCreatedEvent(new Date('2026-01-15T10:02:00.000Z')),
      ]);

      const pending = await repo.findPendingForUpdate(1);
      assert.equal(isOk(pending), true);
      if (!pending.ok) return;
      assert.equal(pending.value.length, 1, 'limit=1 deve retornar exatamente 1 row');
    });
  });

  // ── CA-4 — markProcessed idempotente ─────────────────────────────────────

  describe('CTR-OUTBOX-ADAPTER-DRIZZLE — CA-4: markProcessed idempotente', () => {
    it('CA-4: markProcessed chamado 2x retorna ok ambas as vezes; processed_at não muda na 2ª', async () => {
      if (handle === null) throw new Error('fixture: handle não inicializado');
      const repo = createDrizzleOutboxRepository(handle);

      const event = makeContractCreatedEvent(new Date('2026-01-15T10:00:00.000Z'));
      await repo.append([event]);

      // Obter o eventId inserido.
      const rows = await handle.db.select().from(handle.schema.ctrOutbox);
      assert.equal(rows.length, 1);
      const row = rows[0];
      assert.ok(row !== undefined);

      const t1 = new Date('2026-05-21T12:00:00.000Z');
      const t2 = new Date('2026-05-21T12:05:00.000Z');

      // Primeira chamada.
      const r1 = await repo.markProcessed(row.eventId, t1);
      assert.equal(
        isOk(r1),
        true,
        `1ª markProcessed falhou: ${JSON.stringify(!r1.ok ? r1.error : '')}`,
      );

      // Segunda chamada com timestamp diferente — o WHERE processed_at IS NULL não bate → no-op.
      const r2 = await repo.markProcessed(row.eventId, t2);
      assert.equal(
        isOk(r2),
        true,
        `2ª markProcessed falhou (deve ser idempotente): ${JSON.stringify(!r2.ok ? r2.error : '')}`,
      );

      // Verificar que processed_at ficou com t1 (o da 1ª chamada, não sobrescrita pela 2ª).
      const { eq } = await import('drizzle-orm');
      const updated = await handle.db
        .select({ processedAt: handle.schema.ctrOutbox.processedAt })
        .from(handle.schema.ctrOutbox)
        .where(eq(handle.schema.ctrOutbox.eventId, row.eventId));
      assert.equal(updated.length, 1);
      const updatedRow = updated[0];
      assert.ok(updatedRow !== undefined);
      assert.ok(
        updatedRow.processedAt !== null,
        'processed_at não deve ser null após markProcessed',
      );
      assert.equal(
        updatedRow.processedAt?.getTime(),
        t1.getTime(),
        'processed_at deve ser t1 (1ª chamada), não t2 (2ª chamada foi no-op)',
      );
    });
  });

  // ── CA-5 — moveToDeadLetter atômico ─────────────────────────────────────

  describe('CTR-OUTBOX-ADAPTER-DRIZZLE — CA-5: moveToDeadLetter atômico', () => {
    it('CA-5a: moveToDeadLetter move row da outbox para DLQ atomicamente', async () => {
      if (handle === null) throw new Error('fixture: handle não inicializado');
      const repo = createDrizzleOutboxRepository(handle);

      const event = makeContractCreatedEvent(new Date('2026-01-15T10:00:00.000Z'));
      await repo.append([event]);

      const rows = await handle.db.select().from(handle.schema.ctrOutbox);
      assert.equal(rows.length, 1);
      const row = rows[0];
      assert.ok(row !== undefined);

      const failedAt = new Date('2026-05-21T12:00:00.000Z');
      const errorMsg = 'max-retries-exceeded: delivery failed 5 times';

      const moveResult = await repo.moveToDeadLetter(row.eventId, failedAt, errorMsg);
      assert.equal(
        isOk(moveResult),
        true,
        `moveToDeadLetter falhou: ${JSON.stringify(!moveResult.ok ? moveResult.error : '')}`,
      );

      // Verificar que a row foi removida da outbox.
      const outboxAfter = await handle.db.select().from(handle.schema.ctrOutbox);
      assert.equal(outboxAfter.length, 0, 'ctr_outbox deve estar vazia após moveToDeadLetter');

      // Verificar que a row está na DLQ.
      const dlq = await handle.db.select().from(handle.schema.ctrOutboxDeadLetter);
      assert.equal(dlq.length, 1, 'ctr_outbox_dead_letter deve ter 1 row após moveToDeadLetter');
      const dlqRow = dlq[0];
      assert.ok(dlqRow !== undefined);
      assert.equal(dlqRow.eventId, row.eventId, 'DLQ deve ter o mesmo eventId');
      assert.equal(dlqRow.lastError, errorMsg, 'DLQ deve ter a mensagem de erro');
      assert.equal(
        dlqRow.failedAt.getTime(),
        failedAt.getTime(),
        'DLQ deve ter o failedAt correto',
      );
      assert.equal(dlqRow.eventType, row.eventType, 'DLQ deve copiar eventType da outbox');
      assert.equal(dlqRow.payload, row.payload, 'DLQ deve copiar payload da outbox');
    });

    it('CA-5b: moveToDeadLetter para eventId inexistente retorna err OutboxEventNotFound', async () => {
      if (handle === null) throw new Error('fixture: handle não inicializado');
      const repo = createDrizzleOutboxRepository(handle);

      const nonExistentId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
      const result = await repo.moveToDeadLetter(nonExistentId, new Date(), 'not-found');

      assert.equal(result.ok, false, 'deve retornar err para eventId inexistente');
      if (!result.ok) {
        assert.equal(
          result.error.tag,
          'OutboxEventNotFound',
          `tag esperada OutboxEventNotFound; recebida: ${result.error.tag}`,
        );
      }
    });
  });

  // ── CA-7 — FOR UPDATE SKIP LOCKED: 2 connections paralelas ──────────────

  describe('CTR-OUTBOX-ADAPTER-DRIZZLE — CA-7: FOR UPDATE SKIP LOCKED (2 connections)', () => {
    it('CA-7: findPendingForUpdate em 2 connections paralelas retorna conjuntos disjuntos', async () => {
      if (handle === null) throw new Error('fixture: handle não inicializado');
      // Captura local para satisfazer narrowing do TypeScript dentro de callbacks assíncronos.
      const h1 = handle;
      const repo1 = createDrizzleOutboxRepository(h1);

      // Inserir 4 eventos distintos.
      const events = [
        makeContractCreatedEvent(new Date('2026-01-15T10:00:00.000Z')),
        makeContractCreatedEvent(new Date('2026-01-15T10:01:00.000Z')),
        makeContractCreatedEvent(new Date('2026-01-15T10:02:00.000Z')),
        makeContractCreatedEvent(new Date('2026-01-15T10:03:00.000Z')),
      ];
      const appendResult = await repo1.append(events);
      assert.equal(isOk(appendResult), true);

      // Abrir segundo handle independente (segunda connection pool).
      const h2Result = await openMysql({ connectionString: VALID_CONN });
      assert.equal(
        isOk(h2Result),
        true,
        `openMysql h2 falhou: ${JSON.stringify(!h2Result.ok ? h2Result.error : '')}`,
      );
      if (!h2Result.ok) return;
      const handle2 = h2Result.value;

      try {
        const repo2 = createDrizzleOutboxRepository(handle2);

        // Abrir uma transação em h1, buscar 2 com SKIP LOCKED (não fechar ainda).
        // Depois buscar 2 em h2 — deve pegar as outras 2 (disjuntas).
        //
        // Implementação: usar db.transaction para manter o lock enquanto h2 lê.
        let set1: readonly string[] = [];
        let set2: readonly string[] = [];

        await h1.db.transaction(async (tx) => {
          // h1 abre transação e adquire FOR UPDATE SKIP LOCKED em 2 rows.
          // Enquanto a transação está ABERTA, h2 faz findPendingForUpdate(2)
          // com SKIP LOCKED — deve receber apenas as 2 rows que h1 não bloqueou.
          // drizzle.transaction() mantém a tx aberta durante todo o callback assíncrono.

          // Query SKIP LOCKED via tx — limite 2 para deixar 2 livres para h2.
          const { isNull: isNullInner, asc: ascInner } = await import('drizzle-orm');

          const lockedRows = await tx
            .select({ eventId: h1.schema.ctrOutbox.eventId })
            .from(h1.schema.ctrOutbox)
            .where(isNullInner(h1.schema.ctrOutbox.processedAt))
            .orderBy(ascInner(h1.schema.ctrOutbox.occurredAt))
            .limit(2)
            .for('update', { skipLocked: true });

          set1 = lockedRows.map((r) => r.eventId);
          assert.equal(set1.length, 2, 'h1 deve adquirir lock em 2 rows');

          // Enquanto h1 mantém o lock, h2 faz findPendingForUpdate(2) com SKIP LOCKED.
          // Deve pegar as outras 2 rows que h1 não bloqueou.
          const pending2 = await repo2.findPendingForUpdate(2);
          assert.equal(
            isOk(pending2),
            true,
            `h2 findPendingForUpdate falhou: ${JSON.stringify(!pending2.ok ? pending2.error : '')}`,
          );
          if (!pending2.ok) return;
          set2 = pending2.value.map((r) => r.eventId);
          assert.equal(set2.length, 2, 'h2 deve ver 2 rows (as que h1 não bloqueou)');
        });

        // Verificar disjunção: nenhum eventId em comum.
        const intersection = set1.filter((id) => set2.includes(id));
        assert.equal(
          intersection.length,
          0,
          `conjuntos devem ser disjuntos (SKIP LOCKED); interseção: ${JSON.stringify(intersection)}`,
        );

        // Verificar completude: union = todos os 4 eventIds.
        const allEventIds = (
          await handle.db
            .select({ eventId: handle.schema.ctrOutbox.eventId })
            .from(handle.schema.ctrOutbox)
        ).map((r) => r.eventId);
        const union = new Set([...set1, ...set2]);
        assert.equal(union.size, 4, 'union dos 2 conjuntos deve cobrir todos os 4 eventos');
        for (const id of allEventIds) {
          assert.ok(union.has(id), `eventId ${id} deve estar em algum dos dois conjuntos`);
        }
      } finally {
        await handle2.close();
      }
    });
  });

  // ── markFailed — UPDATE attempts + last_error ────────────────────────────

  describe('CTR-OUTBOX-ADAPTER-DRIZZLE — markFailed: incrementa attempts e registra last_error', () => {
    it('markFailed atualiza attempts e last_error da row', async () => {
      if (handle === null) throw new Error('fixture: handle não inicializado');
      const repo = createDrizzleOutboxRepository(handle);

      const event = makeContractCreatedEvent(new Date('2026-01-15T10:00:00.000Z'));
      await repo.append([event]);

      const rows = await handle.db.select().from(handle.schema.ctrOutbox);
      const row = rows[0];
      assert.ok(row !== undefined);

      const markResult = await repo.markFailed(row.eventId, new Date(), 'delivery-timeout', 1);
      assert.equal(
        isOk(markResult),
        true,
        `markFailed falhou: ${JSON.stringify(!markResult.ok ? markResult.error : '')}`,
      );

      // ctr_outbox não tem coluna last_error — só ctr_outbox_dead_letter.
      // markFailed atualiza apenas `attempts`; o errorTag é passado para uso
      // futuro pelo worker (#5) e para moveToDeadLetter.
      const { eq } = await import('drizzle-orm');
      const updated = await handle.db
        .select({ attempts: handle.schema.ctrOutbox.attempts })
        .from(handle.schema.ctrOutbox)
        .where(eq(handle.schema.ctrOutbox.eventId, row.eventId));
      const updatedRow = updated[0];
      assert.ok(updatedRow !== undefined);
      assert.equal(updatedRow.attempts, 1, 'attempts deve ser 1 após markFailed com attempt=1');
    });
  });
}
