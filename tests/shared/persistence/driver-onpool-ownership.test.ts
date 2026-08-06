/**
 * DRIVER-ONPOOL-OWNERSHIP — handle sobre pool EXTERNO não é dono do pool.
 *
 * As quatro funções `open*OnPool` (contracts, partners, financial, auth) recebem um pool já criado
 * pelo `PoolRegistry` e devolvem um handle Drizzle sobre ele. O contrato é que elas **não fecham**
 * o pool: quem fecha é o `registry.closeAll()`, no composition root.
 *
 * Por que isso importa e não é detalhe de estilo: no worker-runner, UM pool é compartilhado por
 * todos os workers do grupo (as `*_DATABASE_URL` apontam para o mesmo RDS/db `core`). Se o handle
 * de um worker fechasse o pool no seu shutdown, derrubaria a conexão dos IRMÃOS que ainda estão
 * processando — um erro cujo sintoma aparece longe da causa, em outro worker.
 *
 * Esse caminho é o que roda em PRODUÇÃO: os três processos consolidados por `WORKER_GROUP` usam
 * `open*OnPool`, não `open*Mysql`. Ainda assim, até este arquivo **nenhum teste referenciava as
 * quatro funções** — foi um achado registrado durante a reconstrução das rules (spec 040), e a
 * lacuna ficou mais visível depois que os entrypoints ganharam o `drain`.
 *
 * Não exige MySQL: `createPool` do mysql2 é lazy — devolve o objeto sem abrir socket — e o
 * `drizzle()` apenas guarda a referência. O que se verifica aqui é o contrato de OWNERSHIP, que é
 * decidido em tempo de construção e independe de haver banco do outro lado.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createPool, type Pool } from 'mysql2/promise';

import { openMysqlOnPool } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { openPartnersMysqlOnPool } from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { openMysqlFinancialOnPool } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { openAuthMysqlOnPool } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

type OnPoolHandle = Readonly<{ db: unknown; schema: unknown; close: () => Promise<void> }>;

const OPENERS: readonly (readonly [string, (p: Pool) => OnPoolHandle])[] = [
  ['contracts', openMysqlOnPool as (p: Pool) => OnPoolHandle],
  ['partners', openPartnersMysqlOnPool as (p: Pool) => OnPoolHandle],
  ['financial', openMysqlFinancialOnPool as (p: Pool) => OnPoolHandle],
  ['auth', openAuthMysqlOnPool as (p: Pool) => OnPoolHandle],
];

/**
 * Pool lazy com espião em `end`.
 *
 * `createPool` do mysql2 não abre socket até a primeira query, então nenhum recurso fica pendente
 * — não há teardown a fazer. O `end` original é substituído por um contador que NÃO encerra: o que
 * se mede é a intenção do handle de fechar, e chamar o `end` real só abriria a possibilidade de o
 * teste depender de rede.
 */
const spyPool = (): Readonly<{ pool: Pool; ended: () => number }> => {
  const pool = createPool({ uri: mysqlTestConnectionString({ user: 'core', password: 'pw' }) });
  let calls = 0;
  (pool as unknown as { end: () => Promise<void> }).end = async (): Promise<void> => {
    calls += 1;
    await Promise.resolve();
  };
  return { pool, ended: () => calls };
};

describe('open*OnPool — o handle NÃO é dono do pool', () => {
  for (const [name, open] of OPENERS) {
    it(`${name}: close() não encerra o pool recebido`, async () => {
      const { pool, ended } = spyPool();
      const handle = open(pool);

      await handle.close();

      assert.equal(
        ended(),
        0,
        `${name}: close() do handle chamou pool.end() — no worker-runner isso derrubaria a ` +
          'conexão dos workers irmãos que compartilham o mesmo pool',
      );
    });

    it(`${name}: close() é idempotente (chamar N vezes segue no-op)`, async () => {
      const { pool, ended } = spyPool();
      const handle = open(pool);

      await handle.close();
      await handle.close();
      await handle.close();

      assert.equal(ended(), 0, `${name}: close() repetido tocou o pool`);
    });

    it(`${name}: devolve handle com db e schema sobre o pool recebido`, () => {
      const { pool } = spyPool();
      const handle = open(pool);

      assert.ok(handle.db !== undefined && handle.db !== null, `${name}: handle sem db`);
      assert.ok(
        handle.schema !== undefined && handle.schema !== null,
        `${name}: handle sem schema`,
      );
      assert.equal(typeof handle.close, 'function', `${name}: handle sem close`);
    });
  }

  it('dois handles sobre o MESMO pool são independentes', async () => {
    // Cenário real do worker-runner: dois workers do mesmo grupo, um pool só. O shutdown de um
    // não pode afetar o outro.
    const { pool, ended } = spyPool();
    const a = openMysqlOnPool(pool);
    const b = openPartnersMysqlOnPool(pool);

    await a.close();

    assert.equal(ended(), 0, 'o close de um handle encerrou o pool compartilhado');
    assert.ok(b.db !== undefined, 'o handle irmão perdeu o db após o close do primeiro');
  });
});
