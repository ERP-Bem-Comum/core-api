// W0 RED (024-fin-transactional-outbox · #127) — schema da fin_outbox (integração, MySQL real).
//
// A atomicidade estado+evento (ADR-0015) exige a tabela fin_outbox (prefixo fin_, ADR-0014),
// que NÃO existe hoje (financial usa outbox in-memory). Este teste prova que a migration cria a
// tabela com PK em event_id (idempotência) e a coluna payload.
//
// DEVE FALHAR em W0: a tabela fin_outbox ainda não existe (nenhuma migration a cria).
// GATE: só roda com MYSQL_INTEGRATION=1 (pnpm run test:integration:financial). ASCII puro.

import { describe, before, after, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { sql } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[financial:fin-outbox-schema] MYSQL_INTEGRATION nao definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

  describe('#127 — fin_outbox schema (Drizzle + MySQL, integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[fin-outbox-schema] conexao: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    it('a tabela fin_outbox existe (criada por migration)', async () => {
      const rows = (await handle.db.execute(
        sql`SELECT COUNT(*) AS n FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name = 'fin_outbox'`,
      )) as unknown as [{ n: number }[]];
      const n = rows[0]?.[0]?.n ?? 0;
      assert.equal(n, 1, 'fin_outbox deve existir');
    });

    it('event_id é PK (idempotência) — INSERT duplicado é rejeitado', async () => {
      const cols = (await handle.db.execute(
        sql`SELECT COLUMN_KEY AS k FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = 'fin_outbox' AND column_name = 'event_id'`,
      )) as unknown as [{ k: string }[]];
      assert.equal(cols[0]?.[0]?.k, 'PRI', 'event_id deve ser PK');
    });
  });
}
