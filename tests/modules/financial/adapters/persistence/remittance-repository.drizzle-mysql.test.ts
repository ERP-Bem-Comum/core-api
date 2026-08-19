// Teste de integração: RemittanceRepository (Drizzle + MySQL real).
//
// Prova o que o fake não pode: que o cabeçalho e os vínculos gravam na MESMA transação, que o
// anti-join de documentos presos acontece no BANCO, e que os CHECKs e UNIQUEs da migration 0044
// existem de verdade — inclusive o de NSA único por conta, que é o que impede duas remessas com o
// mesmo número (retransmissão, aos olhos do banco).
//
// GATE: só roda com `MYSQL_INTEGRATION=1`.

import { describe, it, before, beforeEach, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { eq } from 'drizzle-orm';

import { isOk } from '#src/shared/index.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleRemittanceRepository } from '#src/modules/financial/adapters/persistence/repos/remittance-repository.drizzle.ts';
import * as RemittanceId from '#src/modules/financial/domain/remittance/remittance-id.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import {
  create,
  confirmTransmitted,
  markFailed,
  discard,
} from '#src/modules/financial/domain/remittance/remittance.ts';
import {
  finOutbox,
  finRemittanceDocuments,
  finRemittances,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const account = CedenteAccountId.generate();
let nsaSeq = 0;

const build = (documentIds: readonly string[], cedente = account) => {
  nsaSeq += 1;
  const r = create({
    id: RemittanceId.generate(),
    cedenteAccountId: cedente,
    nsa: nsaSeq,
    fileName: `PAG_INT.11082026140000_${String(nsaSeq).padStart(6, '0')}.REM`,
    contentHash: 'b'.repeat(64),
    documentIds,
    generatedAt: '2026-08-11 14:00:00.000',
  });
  if (!r.ok) throw new Error(`test setup: remittance (${r.error})`);
  return r.value;
};

const doc = (): string => CedenteAccountId.generate();

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[financial:remittance-repo] MYSQL_INTEGRATION não definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('RemittanceRepository — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 4 });
      if (!r.ok) throw new Error(`[financial:remittance-repo] Falha ao conectar: ${r.error}`);
      handle = r.value;
    });

    // Limpeza na ENTRADA e por TABELA (#741 · `.claude/rules/testing.md`).
    //
    // `nsaSeq` é contador de PROCESSO e compõe `file_name`, que tem UNIQUE
    // (`fin_remittances_file_name_uq`) — e o par (conta, NSA) tem outro. A 2ª execução repete os
    // dois. Por tabela, não por PK: resíduo gravado com OUTRO id colide na mesma UNIQUE de negócio,
    // e é justamente esse que a limpeza por PK não alcança.
    //
    // Filha antes da mãe: `fin_remittance_documents` referencia `fin_remittances`.
    beforeEach(async () => {
      await handle.db.delete(finRemittanceDocuments);
      await handle.db.delete(finRemittances);
    });

    after(async () => {
      await handle?.close();
    });

    it('salva cabeçalho e vínculos, e recupera os documentos junto', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const d1 = doc();
      const d2 = doc();
      const rem = build([d1, d2]);

      assert.equal((await repo.save(rem)).ok, true);

      const back = await repo.findById(rem.id);
      assert.ok(isOk(back) && back.value !== null);
      assert.equal(back.value.status, 'Queued');
      assert.deepEqual([...back.value.documentIds].sort(), [d1, d2].sort());
    });

    it('recupera por nome de arquivo — a chave de idempotência do agente', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const rem = build([doc()]);
      await repo.save(rem);

      const back = await repo.findByFileName(rem.fileName);
      assert.ok(isOk(back) && back.value !== null);
      assert.equal(back.value.id, rem.id);
    });

    // O anti-join no banco. Sem ele, a seleção pegaria documento já enfileirado por outra instância.
    it('documento em remessa viva aparece como preso; documento livre não', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const preso = doc();
      const livre = doc();
      await repo.save(build([preso]));

      const held = await repo.findHeldDocumentIds([preso, livre]);
      assert.ok(isOk(held));
      assert.deepEqual(held.value, [preso]);
    });

    it('falha prende; descarte libera', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const d = doc();
      const rem = build([d]);
      await repo.save(rem);

      const failed = markFailed(rem, '2026-08-11 14:05:00.000', 'sem confirmacao');
      assert.ok(isOk(failed));
      await repo.save(failed.value.remittance, failed.value.events);

      const aindaPreso = await repo.findHeldDocumentIds([d]);
      assert.ok(isOk(aindaPreso) && aindaPreso.value.length === 1);

      const discarded = discard(
        failed.value.remittance,
        '2026-08-11 15:00:00.000',
        'confirmado com o banco',
      );
      assert.ok(isOk(discarded));
      await repo.save(discarded.value.remittance, discarded.value.events);

      const liberado = await repo.findHeldDocumentIds([d]);
      assert.ok(isOk(liberado));
      assert.deepEqual(liberado.value, []);
    });

    it('save é idempotente: reprocessar o mesmo status não duplica vínculo', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const d = doc();
      const rem = build([d]);
      await repo.save(rem);

      const t = confirmTransmitted(rem, '2026-08-11 14:05:00.000', 'ok');
      assert.ok(isOk(t));
      await repo.save(t.value.remittance, t.value.events);
      await repo.save(t.value.remittance, t.value.events);

      const back = await repo.findById(rem.id);
      assert.ok(isOk(back) && back.value !== null);
      assert.equal(back.value.status, 'Transmitted');
      assert.deepEqual(back.value.documentIds, [d]);
    });

    // O UNIQUE que impede duas remessas com o mesmo NSA na mesma conta — retransmissão, para o banco.
    it('recusa NSA repetido na mesma conta-cedente', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const primeira = build([doc()]);
      await repo.save(primeira);

      const colidente = {
        ...build([doc()]),
        nsa: primeira.nsa,
        cedenteAccountId: primeira.cedenteAccountId,
      };
      const r = await repo.save(colidente);
      assert.equal(r.ok, false, 'UNIQUE (cedente_account_id, nsa) deveria barrar');
    });

    it('recusa nome de arquivo repetido', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const primeira = build([doc()]);
      await repo.save(primeira);

      const colidente = { ...build([doc()]), fileName: primeira.fileName };
      const r = await repo.save(colidente);
      assert.equal(r.ok, false, 'UNIQUE (file_name) deveria barrar');
    });

    // ADR-0015: o evento existe se e somente se o estado foi persistido. É o que o fake não pode
    // provar — só o banco real mostra que as duas escritas caem na MESMA transação.
    describe('outbox transacional', () => {
      const outboxRowsOf = async (remittanceId: string) =>
        handle.db
          .select({
            eventType: finOutbox.eventType,
            aggregateType: finOutbox.aggregateType,
            payload: finOutbox.payload,
          })
          .from(finOutbox)
          .where(eq(finOutbox.aggregateId, remittanceId));

      it('grava RemittanceTransmitted no fin_outbox junto do desfecho', async () => {
        const repo = createDrizzleRemittanceRepository(handle);
        const rem = build([doc()]);
        await repo.save(rem);

        const t = confirmTransmitted(rem, '2026-08-11 14:05:00.000', 'consta em BACKUP');
        assert.ok(isOk(t));
        assert.equal((await repo.save(t.value.remittance, t.value.events)).ok, true);

        const rows = await outboxRowsOf(rem.id);
        assert.equal(rows.length, 1);
        assert.equal(rows[0]?.eventType, 'RemittanceTransmitted');
        assert.equal(rows[0]?.aggregateType, 'Remittance');
        assert.match(rows[0]?.payload ?? '', /consta em BACKUP/);
      });

      // A propriedade que a varredura de 5 em 5 minutos exige: sem ela o outbox cresceria sem teto.
      it('reprocessar o mesmo status não duplica o evento', async () => {
        const repo = createDrizzleRemittanceRepository(handle);
        const rem = build([doc()]);
        await repo.save(rem);

        const t = confirmTransmitted(rem, '2026-08-11 14:05:00.000', 'ok');
        assert.ok(isOk(t));
        await repo.save(t.value.remittance, t.value.events);

        // Segunda leitura do MESMO envelope: o agregado devolve `events: []`.
        const again = confirmTransmitted(t.value.remittance, '2026-08-11 14:10:00.000', 'ok');
        assert.ok(isOk(again));
        await repo.save(again.value.remittance, again.value.events);

        assert.equal((await outboxRowsOf(rem.id)).length, 1, 'um desfecho, um evento');
      });

      // Se o INSERT do outbox estivesse FORA da transação, o evento sobreviveria ao rollback e
      // anunciaria um desfecho que o banco não tem.
      it('save que falha não deixa evento órfão', async () => {
        const repo = createDrizzleRemittanceRepository(handle);
        const primeira = build([doc()]);
        await repo.save(primeira);

        // Colide no UNIQUE de nome: o INSERT lança e a transação inteira reverte.
        const colidente = { ...build([doc()]), fileName: primeira.fileName };
        const t = confirmTransmitted(colidente, '2026-08-11 14:05:00.000', 'ok');
        assert.ok(isOk(t));
        const r = await repo.save(t.value.remittance, t.value.events);
        assert.equal(r.ok, false, 'a colisão deveria falhar o save');

        assert.deepEqual(
          await outboxRowsOf(colidente.id),
          [],
          'evento não pode sobreviver ao rollback do estado',
        );
      });
    });
  });
}
