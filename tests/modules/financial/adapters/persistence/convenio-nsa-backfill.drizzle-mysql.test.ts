// Teste de integração: o BACKFILL da migration 0057 (#943, CA4) contra MySQL real.
//
// ⚠️ POR QUE ELE PRECISA EXISTIR, e por que o resto da suíte não o cobre: as migrations rodam no
// `before` de cada arquivo de integração, contra um banco VAZIO. Um `INSERT … SELECT` sobre tabela
// vazia insere zero linhas e passa — então a migration mais perigosa do módulo é a única que o CI
// exercita sem dados. Em produção ela roda sobre contas reais, no job `core-api-migrate`, ANTES de o
// app subir: se ela falhar ou semear errado, o deploy cai ou a sequência nasce no lugar errado.
//
// Este arquivo executa o MESMO `INSERT … SELECT` da migration sobre dados semeados, e cobra a regra
// que não pode se perder: cada convênio nasce em `MAX(next_nsa)` das contas dele.
//
// GATE: só roda com `MYSQL_INTEGRATION=1`.

import { describe, it, before, beforeEach, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { eq, like, sql } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import {
  finCedenteAccounts,
  finConvenioNsa,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

// Espaço de chave PRÓPRIO, limpo na entrada — agência e prefixo de convênio, como os arquivos irmãos.
const OWN_AGENCY = '4323';
const OWN_CONVENIO_PREFIX = '93';

let seq = 0;

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:convenio-nsa-backfill] MYSQL_INTEGRATION não definido — pulando.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('Backfill de fin_convenio_nsa — migration 0057 (#943, CA4)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 4 });
      if (!r.ok) throw new Error(`[financial:convenio-nsa-backfill] Falha ao conectar: ${r.error}`);
      handle = r.value;
    });

    beforeEach(async () => {
      await handle.db.delete(finCedenteAccounts).where(eq(finCedenteAccounts.agency, OWN_AGENCY));
      await handle.db
        .delete(finConvenioNsa)
        .where(like(finConvenioNsa.convenio, `${OWN_CONVENIO_PREFIX}%`));
    });

    after(async () => {
      await handle?.close();
    });

    // Insere direto na tabela, sem passar pelo domínio: o backfill roda sobre o que ESTÁ no banco,
    // inclusive estado que o construtor de hoje não produziria.
    const seedAccount = async (
      convenio: string,
      nextNsa: number,
      status: 'Active' | 'Closed' = 'Active',
    ): Promise<void> => {
      seq += 1;
      await handle.db.insert(finCedenteAccounts).values({
        id: CedenteAccountId.generate(),
        bankCode: '237',
        agency: OWN_AGENCY,
        accountNumber: `7100${String(seq).padStart(2, '0')}`,
        accountDigit: '3',
        convenio,
        document: '12345678000190',
        status,
        nextNsa,
      });
    };

    // O MESMO statement da migration `0057_lying_vindicator.sql`, com UMA diferença declarada: o
    // `AND convenio LIKE '93%'`.
    //
    // ⚠️ POR QUE O RECORTE EXISTE, e por que ele não enfraquece o teste: a migration roda sobre a
    // tabela INTEIRA, uma vez, contra `fin_convenio_nsa` vazia. Aqui, `fin_cedente_accounts` tem
    // também as contas dos arquivos irmãos (agências 4321/9001), cujos convênios já ganharam linha
    // pelas alocações deles — reinseri-los colidiria na PK e derrubaria o statement por um motivo
    // que não é o que este arquivo mede. O recorte isola o espaço de chave, como o `beforeEach` faz.
    //
    // O que o teste mede continua sendo o statement de produção: `MAX`, `TRIM`, `GROUP BY` e o
    // `ON DUPLICATE KEY UPDATE … GREATEST`. Se a regra mudar na migration e não aqui, este arquivo
    // passa a aprovar algo que não roda — venha alterar os dois juntos.
    const runBackfill = async (): Promise<void> => {
      await handle.db.execute(
        sql`INSERT INTO fin_convenio_nsa (convenio, next_nsa)
            SELECT TRIM(convenio), MAX(next_nsa)
            FROM fin_cedente_accounts
            WHERE TRIM(convenio) <> ''
              AND TRIM(convenio) LIKE ${`${OWN_CONVENIO_PREFIX}%`}
            GROUP BY TRIM(convenio)
            ON DUPLICATE KEY UPDATE next_nsa = GREATEST(fin_convenio_nsa.next_nsa, VALUES(next_nsa))`,
      );
    };

    const sequenceOf = async (convenio: string): Promise<number | null> => {
      const rows = await handle.db
        .select()
        .from(finConvenioNsa)
        .where(eq(finConvenioNsa.convenio, convenio))
        .limit(1);
      return rows[0]?.nextNsa ?? null;
    };

    /*
     * ⚠️ O CASO QUE A ISSUE DESCREVE COM NÚMEROS, e o que ele impede:
     *
     *   convênio X, conta A em 57 e conta B em 12. A emitiu 1–56; B reemitiu 1–11 (o defeito).
     *   Começar em 57 não colide com nada. Começar em 12 reemitiria 12–56.
     *
     * E a reemissão não é só semântica: `fin_remittance_payables.your_number` é
     * `<convênio><NSA><sequência>` com UNIQUE global, e as referências antigas continuam gravadas.
     * Um contador que retrocede bate no índice contra linhas históricas.
     */
    it('CA4: a sequência nasce no MAIOR next_nsa das contas do convênio', async () => {
      const convenio = `${OWN_CONVENIO_PREFIX}0001`;
      await seedAccount(convenio, 57);
      await seedAccount(convenio, 12);

      await runBackfill();

      assert.equal(
        await sequenceOf(convenio),
        57,
        'a sequência nasceu abaixo de um número já emitido',
      );
    });

    // Contas `Closed` ENTRAM no agrupamento: os números que elas gastaram existem no banco, e
    // ignorá-las reabriria faixa já usada. É o caso que um `WHERE status = 'Active'` quebraria.
    it('CA4: conta ENCERRADA conta para o máximo — os números que ela gastou existem', async () => {
      const convenio = `${OWN_CONVENIO_PREFIX}0002`;
      await seedAccount(convenio, 3);
      await seedAccount(convenio, 91, 'Closed');

      await runBackfill();

      assert.equal(
        await sequenceOf(convenio),
        91,
        'a conta encerrada foi ignorada e a faixa reabriu',
      );
    });

    it('CA4: convênios distintos ganham linhas independentes', async () => {
      const here = `${OWN_CONVENIO_PREFIX}0003`;
      const there = `${OWN_CONVENIO_PREFIX}0004`;
      await seedAccount(here, 8);
      await seedAccount(there, 2);

      await runBackfill();

      assert.equal(await sequenceOf(here), 8);
      assert.equal(await sequenceOf(there), 2);
    });

    // Convênio vazio fica de fora: sem convênio não há contrato a que a sequência pertença, e a PK
    // não aceita a string vazia como identidade. A conta já é recusada antes do NSA por
    // `checkCedenteConvenio` (`cedente-convenio-missing`).
    it('CA4: conta SEM convênio não cria linha — e não derruba o backfill', async () => {
      await seedAccount('', 5);
      await seedAccount('   ', 9);

      await runBackfill();

      assert.equal(await sequenceOf(''), null);
      assert.equal(await sequenceOf('   '), null);
    });

    // ⚠️ O `TRIM` dos dois lados é o que impede o backfill de ABORTAR. O convênio é texto digitado no
    // cadastro; ` 930005` e `930005` são o mesmo contrato, e sem o `TRIM` no `GROUP BY` eles viram
    // dois grupos que colidem na mesma PK depois do `TRIM` do `SELECT` — `ER_DUP_ENTRY`, migration
    // falhada, e o deploy cai ANTES de o app subir, porque o job de migration roda primeiro.
    it('CA4: convênios que só diferem por espaço são UM contrato — a migration não aborta', async () => {
      const convenio = `${OWN_CONVENIO_PREFIX}0005`;
      await seedAccount(convenio, 4);
      await seedAccount(` ${convenio}`, 19);
      await seedAccount(`${convenio} `, 7);

      await runBackfill();

      assert.equal(await sequenceOf(convenio), 19, 'o máximo ignorou as variantes com espaço');
    });

    /*
     * ⚠️ IDEMPOTÊNCIA — e ela deixou de ser luxo por causa da #996.
     *
     * A migration roda uma vez pelo journal, mas o job que a executa vive num pipeline de deploy que
     * está falhando e pode ser retentado. Um `INSERT` cru abortaria com `ER_DUP_ENTRY` na segunda
     * passada e derrubaria o deploy ANTES de o app subir — trocando um deploy que falha por um
     * deploy que falha PIOR, com o banco já alterado.
     *
     * O `GREATEST` resolve os dois lados: reexecutar não aborta, e não faz o contador RETROCEDER.
     * O segundo é o que importa de verdade — entre a primeira execução e a retentativa, contas podem
     * ter emitido, e um backfill que sobrescrevesse com o `MAX` antigo reemitiria faixa usada.
     */
    it('CA4: reexecutar o backfill não aborta e NUNCA faz o contador retroceder', async () => {
      const convenio = `${OWN_CONVENIO_PREFIX}0006`;
      await seedAccount(convenio, 30);

      await runBackfill();
      assert.equal(await sequenceOf(convenio), 30);

      // A sequência avançou entre a primeira passada e a retentativa — como aconteceria se o app
      // tivesse subido e emitido antes de alguém reexecutar o job.
      await handle.db
        .update(finConvenioNsa)
        .set({ nextNsa: 44 })
        .where(eq(finConvenioNsa.convenio, convenio));

      await runBackfill();

      assert.equal(
        await sequenceOf(convenio),
        44,
        'a reexecução sobrescreveu com o MAX antigo e reabriu faixa já emitida',
      );
    });
  });
}
