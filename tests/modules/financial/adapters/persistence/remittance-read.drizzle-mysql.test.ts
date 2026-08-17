// Teste de integração: leitura paginada de remessas (#728) — Drizzle + MySQL real.
//
// Prova o que o fake não pode: que `listPaged` ordena por `generatedAt` DESC no BANCO, devolve o
// total real, e carrega os documentIds da página numa query batch (sem N+1) — e que `findById`
// recupera o detalhe com os vínculos. Read-only: nenhuma escrita nova de domínio, só semeia via
// `save` (o mesmo caminho do generate) e lê.
//
// GATE: só roda com `MYSQL_INTEGRATION=1`.

import { describe, it, before, beforeEach, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { isOk } from '#src/shared/index.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleRemittanceRepository } from '#src/modules/financial/adapters/persistence/repos/remittance-repository.drizzle.ts';
import * as RemittanceId from '#src/modules/financial/domain/remittance/remittance-id.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create } from '#src/modules/financial/domain/remittance/remittance.ts';
import {
  finRemittances,
  finRemittanceDocuments,
  finOutbox,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const account = CedenteAccountId.generate();
let nsaSeq = 0;

const build = (generatedAt: string, documentIds: readonly string[], cedente = account) => {
  nsaSeq += 1;
  const r = create({
    id: RemittanceId.generate(),
    cedenteAccountId: cedente,
    nsa: nsaSeq,
    fileName: `PAG_INT_728.11082026140000_${String(nsaSeq).padStart(6, '0')}.REM`,
    contentHash: 'c'.repeat(64),
    documentIds,
    generatedAt,
  });
  if (!r.ok) throw new Error(`test setup: remittance (${r.error})`);
  return r.value;
};

const doc = (): string => CedenteAccountId.generate();

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[financial:remittance-read] MYSQL_INTEGRATION não definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('RemittanceRepository.listPaged / findById — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 4 });
      if (!r.ok) throw new Error(`[financial:remittance-read] Falha ao conectar: ${r.error}`);
      handle = r.value;
    });

    // Limpa na ENTRADA, por tabela (testing.md §Contrato de isolamento).
    beforeEach(async () => {
      await handle.db.delete(finRemittanceDocuments);
      await handle.db.delete(finRemittances);
      await handle.db.delete(finOutbox);
    });

    after(async () => {
      await handle?.close();
    });

    it('lista por generatedAt DESC, com total e documentIds/count da página', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const dOld = doc();
      const dMid1 = doc();
      const dMid2 = doc();
      const dNew = doc();

      const oldest = build('2026-08-11 14:00:00.000', [dOld]);
      const middle = build('2026-08-12 14:00:00.000', [dMid1, dMid2]);
      const newest = build('2026-08-13 14:00:00.000', [dNew]);

      // Semeia fora da ordem cronológica de propósito: a ordenação é do BANCO, não da inserção.
      assert.equal((await repo.save(middle)).ok, true);
      assert.equal((await repo.save(newest)).ok, true);
      assert.equal((await repo.save(oldest)).ok, true);

      const page = await repo.listPaged({ limit: 25, offset: 0 });
      assert.ok(isOk(page));
      assert.equal(page.value.total, 3);
      assert.deepEqual(
        page.value.items.map((r) => r.id),
        [newest.id, middle.id, oldest.id],
      );
      // documentIds da página carregados em batch, agrupados por remessa.
      const mid = page.value.items.find((r) => r.id === middle.id);
      assert.ok(mid !== undefined);
      assert.deepEqual([...mid.documentIds].sort(), [dMid1, dMid2].sort());
    });

    it('respeita limit/offset preservando a ordem DESC entre páginas', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const a = build('2026-08-11 14:00:00.000', [doc()]);
      const b = build('2026-08-12 14:00:00.000', [doc()]);
      const c = build('2026-08-13 14:00:00.000', [doc()]);
      await repo.save(a);
      await repo.save(b);
      await repo.save(c);

      const page1 = await repo.listPaged({ limit: 2, offset: 0 });
      assert.ok(isOk(page1));
      assert.equal(page1.value.total, 3);
      assert.deepEqual(
        page1.value.items.map((r) => r.id),
        [c.id, b.id],
      );

      const page2 = await repo.listPaged({ limit: 2, offset: 2 });
      assert.ok(isOk(page2));
      assert.deepEqual(
        page2.value.items.map((r) => r.id),
        [a.id],
      );
    });

    it('findById recupera o detalhe com os documentIds presos', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const d1 = doc();
      const d2 = doc();
      const rem = build('2026-08-11 14:00:00.000', [d1, d2]);
      await repo.save(rem);

      const back = await repo.findById(rem.id);
      assert.ok(isOk(back) && back.value !== null);
      assert.equal(back.value.status, 'Queued');
      assert.deepEqual([...back.value.documentIds].sort(), [d1, d2].sort());
    });

    it('lista vazia devolve total 0 e nenhum item', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const page = await repo.listPaged({ limit: 25, offset: 0 });
      assert.ok(isOk(page));
      assert.equal(page.value.total, 0);
      assert.deepEqual(page.value.items, []);
    });
  });
}
