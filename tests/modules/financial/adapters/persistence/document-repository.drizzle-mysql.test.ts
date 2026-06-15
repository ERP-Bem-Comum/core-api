// Teste de integração: DocumentRepository (Drizzle + MySQL real).
//
// Consome a CONTRACT SUITE `document-repository.suite.ts` contra MySQL de verdade.
//
// GATEAMENTO (test-pyramid-engineer SKILL.md + .claude/rules/testing.md):
//   Este teste SÓ roda quando `MYSQL_INTEGRATION=1` estiver no ambiente.
//   `pnpm test` puro NÃO sobe MySQL → gate protege o pipeline offline.
//   Comando canônico: `pnpm run test:integration:financial`
//   (a ser adicionado em package.json quando CI for configurado para o módulo).
//
// Como espelha o padrão de contracts:
//   - Mesmo opt-in `MYSQL_INTEGRATION=1` (ver `package.json §test:integration`).
//   - Abre handle via `openMysqlFinancial({ applyMigrations: true })`.
//   - Passa `createDrizzleDocumentRepository(handle)` para a suite.
//   - Fecha o handle no `after()`.
//
// Referência: `tests/modules/contracts/adapters/persistence/drizzle-mysql.test.ts`.

import { describe, before, after } from 'node:test';

import { documentRepositoryContract } from './document-repository.suite.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';

// Gate de integração: sem a env var, o describe() não é registrado e o runner
// Node 24 não reporta nenhum teste — sem falso negativo nem skip explícito.
if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:drizzle-mysql] MYSQL_INTEGRATION não definido — pulando testes de integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    'mysql://app:apppw-migration-test-only@127.0.0.1:3306/core';

  describe('DocumentRepository — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({
        connectionString,
        applyMigrations: true,
        poolLimit: 3,
      });
      if (!r.ok) {
        throw new Error(
          `[financial:drizzle-mysql] Falha ao conectar ao MySQL: ${r.error}\n` +
            `  connection string: ${connectionString}`,
        );
      }
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    // A suite parametrizada cria um repo novo a cada chamada de `makeRepo()`
    // para garantir isolamento entre testes (cada teste inicia com estado limpo
    // porque opera no próprio ID gerado — sem shared state entre casos).
    documentRepositoryContract(() => createDrizzleDocumentRepository(handle));
  });
}
