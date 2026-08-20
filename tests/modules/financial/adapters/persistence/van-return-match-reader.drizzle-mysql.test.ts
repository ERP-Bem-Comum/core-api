// Teste de integração: VanReturnMatchReader (Drizzle + MySQL real) — #690.
//
// Prova o que o fake não pode:
//
//   - que o JOIN com `fin_remittances` traz o nome do arquivo de remessa, que é o que permite dizer
//     ao operador de QUAL envio o retorno veio;
//   - que a UNIQUE `fin_remittance_documents_your_number_uk` existe de verdade — é ela que torna o
//     casamento uma decisão em vez de heurística, e sem ela o mesmo retorno apontaria para dois
//     títulos sem ninguém perceber;
//   - que chave desconhecida simplesmente NÃO VEM na resposta, em vez de virar erro.
//
// GATE: só roda com `MYSQL_INTEGRATION=1`.

import { describe, it, before, beforeEach, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleVanReturnMatchReader } from '#src/modules/financial/adapters/persistence/repos/van-return-match-reader.drizzle.ts';
import {
  finRemittanceDocuments,
  finRemittances,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const REMITTANCE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ACCOUNT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DOC_A = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DOC_B = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

// Convênio `000000` é um dos dois reservados pelo gate de máscara — nenhum dado real de cadastro.
const FILE_NAME = 'PAG_000000.19082026120000_000001.REM';
const REF_A = '000000000001000001';
const REF_B = '000000000001000002';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[financial:van-return-match] MYSQL_INTEGRATION não definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('VanReturnMatchReader — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 4 });
      if (!r.ok) throw new Error(`[financial:van-return-match] Falha ao conectar: ${r.error}`);
      handle = r.value;
    });

    // Limpeza na ENTRADA e por TABELA (`.claude/rules/testing.md`): as chaves aqui são literais, e
    // `your_number` tem UNIQUE — a 2ª execução colidiria no seed. Filha antes da mãe.
    beforeEach(async () => {
      await handle.db.delete(finRemittanceDocuments);
      await handle.db.delete(finRemittances);

      await handle.db.insert(finRemittances).values({
        id: REMITTANCE,
        cedenteAccountId: ACCOUNT,
        nsa: 1,
        fileName: FILE_NAME,
        contentHash: 'a'.repeat(64),
        status: 'Transmitted',
        generatedAt: '2026-08-19 12:00:00.000',
      });
      await handle.db.insert(finRemittanceDocuments).values([
        { remittanceId: REMITTANCE, documentId: DOC_A, yourNumber: REF_A },
        { remittanceId: REMITTANCE, documentId: DOC_B, yourNumber: REF_B },
      ]);
    });

    after(async () => {
      await handle?.close();
    });

    it('encontra os vínculos pelas chaves pedidas, com o nome do arquivo pelo JOIN', async () => {
      const reader = createDrizzleVanReturnMatchReader(handle);

      const found = await reader.findByYourNumbers([REF_A, REF_B]);
      assert.ok(found.ok);
      assert.equal(found.value.length, 2);

      const a = found.value.find((r) => r.yourNumber === REF_A);
      assert.equal(a?.documentId, DOC_A);
      assert.equal(a?.remittanceId, REMITTANCE);
      assert.equal(a?.fileName, FILE_NAME, 'o JOIN é o que permite dizer de qual envio veio');
    });

    it('chave desconhecida não vem na resposta — ausência é informação, não erro', async () => {
      const reader = createDrizzleVanReturnMatchReader(handle);

      const found = await reader.findByYourNumbers([REF_A, 'REFERENCIA-DE-OUTRO-CONVENIO']);
      assert.ok(found.ok, 'a caixa é compartilhada: referência alheia é NORMAL');
      assert.deepEqual(
        found.value.map((r) => r.yourNumber),
        [REF_A],
      );
    });

    it('lista vazia devolve vazio sem tocar o banco', async () => {
      const reader = createDrizzleVanReturnMatchReader(handle);
      const found = await reader.findByYourNumbers([]);
      assert.ok(found.ok);
      assert.deepEqual(found.value, []);
    });

    // A rede que torna o casamento uma decisão. Sem esta UNIQUE, o mesmo retorno casaria com dois
    // títulos e ninguém perceberia — a leitura devolveria duas linhas e a primeira venceria.
    it('a UNIQUE de `your_number` existe de verdade e recusa referência repetida', async () => {
      await assert.rejects(
        handle.db.insert(finRemittanceDocuments).values({
          remittanceId: REMITTANCE,
          documentId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          yourNumber: REF_A,
        }),
      );
    });

    it('busca em lote acima do teto de chunk continua completa', async () => {
      const reader = createDrizzleVanReturnMatchReader(handle);

      // 600 chaves > CHUNK (500): o fatiamento não pode perder as duas que existem.
      const muitas = [
        ...Array.from({ length: 599 }, (_, i) => `INEXISTENTE-${String(i).padStart(6, '0')}`),
        REF_A,
      ];

      const found = await reader.findByYourNumbers(muitas);
      assert.ok(found.ok);
      assert.deepEqual(
        found.value.map((r) => r.yourNumber),
        [REF_A],
      );
    });
  });
}
