/**
 * Consumer da suite contratual DocumentRepository contra adapter Drizzle/MySQL.
 *
 * Guarded por MYSQL_INTEGRATION=1. Sem essa env, o describe entra em SKIP
 * silencioso. Para rodar: `pnpm test:integration`.
 *
 * Ticket: CTR-DOCUMENT-AGGREGATE-PERSISTENCE (W0).
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';

import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { DocumentRepositoryDrizzle } from '#src/modules/contracts/adapters/persistence/repos/document-repository.drizzle.ts';
import { ctrOutbox } from '#src/modules/contracts/adapters/persistence/schemas/mysql.ts';

import { runDocumentRepositoryContract } from '../document-repository.suite.ts';

const integrationOn = process.env['MYSQL_INTEGRATION'] === '1';

if (!integrationOn) {
  describe('DocumentRepositoryDrizzle (integration SKIP)', () => {
    it.skip('SKIP - MYSQL_INTEGRATION=1 desligado', () => {
      // intencionalmente vazio
    });
  });
} else {
  runDocumentRepositoryContract('Drizzle/MySQL', {
    make: async () => {
      const connStr =
        process.env['MYSQL_CONNECTION_STRING'] ??
        'mysql://core_app:apppw-migration-test-only@127.0.0.1:3306/core';
      const driver = await openMysql({
        connectionString: connStr,
        applyMigrations: false,
      });
      if (!driver.ok) throw new Error(`driver invalido: ${JSON.stringify(driver.error)}`);
      const handle = driver.value;
      const repo = DocumentRepositoryDrizzle(handle.db);

      const teardown = async (): Promise<void> => {
        await handle.db.delete(ctrOutbox);
        await handle.close();
      };

      return {
        repo,
        outboxCount: async (): Promise<number> => {
          const rows = await handle.db.select().from(ctrOutbox);
          return rows.length;
        },
        teardown,
      };
    },
  });
}
