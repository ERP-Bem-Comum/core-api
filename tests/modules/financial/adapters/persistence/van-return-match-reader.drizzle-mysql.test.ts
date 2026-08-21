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
  finDocuments,
  finPayables,
  finRemittancePayables,
  finRemittances,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const REMITTANCE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ACCOUNT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DOC_A = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DOC_B = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

// ⚠️ O TÍTULO tem id próprio, distinto da NOTA. Antes das FKs de `fin_remittance_payables` este
// arquivo usava o mesmo literal nas duas colunas — o que descrevia um grafo que a aplicação não
// produz, e que a FK `RESTRICT` para `fin_payables.id` passou a recusar com 1452.
const PAY_A = 'cccccccc-cccc-4ccc-8ccc-11111111111a';
const PAY_B = 'dddddddd-dddd-4ddd-8ddd-11111111111b';
// Título de um terceiro documento, usado só pelo caso da UNIQUE — ver a nota lá embaixo.
const DOC_C = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const PAY_C = 'ffffffff-ffff-4fff-8fff-11111111111c';

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

    // Cria a NOTA e o TÍTULO de verdade — o vínculo referencia os dois, e as FKs são `RESTRICT`.
    const seedDocumentWithPayable = async (
      documentId: string,
      payableId: string,
    ): Promise<void> => {
      await handle.db.insert(finDocuments).values({
        id: documentId,
        status: 'Open',
        createdAt: new Date('2026-08-19T00:00:00.000Z'),
      });
      await handle.db.insert(finPayables).values({
        id: payableId,
        documentId,
        kind: 'Parent',
        status: 'Open',
        value: 250000,
        dueDate: new Date('2026-09-30T00:00:00.000Z'),
        paymentMethod: 'TED',
        createdAt: new Date('2026-08-19T00:00:00.000Z'),
      });
    };

    // Limpeza na ENTRADA e por TABELA (`.claude/rules/testing.md`): as chaves aqui são literais, e
    // `your_number` tem UNIQUE — a 2ª execução colidiria no seed. Filha antes da mãe.
    //
    // ⚠️ Com as FKs `RESTRICT`, "filha antes da mãe" deixou de ser estilo e virou obrigação: o
    // vínculo sai antes de remessa/título, e `fin_payables` antes de `fin_documents`.
    beforeEach(async () => {
      await handle.db.delete(finRemittancePayables);
      await handle.db.delete(finRemittances);
      await handle.db.delete(finPayables);
      await handle.db.delete(finDocuments);

      await seedDocumentWithPayable(DOC_A, PAY_A);
      await seedDocumentWithPayable(DOC_B, PAY_B);
      await seedDocumentWithPayable(DOC_C, PAY_C);

      await handle.db.insert(finRemittances).values({
        id: REMITTANCE,
        cedenteAccountId: ACCOUNT,
        nsa: 1,
        fileName: FILE_NAME,
        contentHash: 'a'.repeat(64),
        status: 'Transmitted',
        // ⚠️ Formato do MySQL, e NÃO ISO — o oposto do que a fixture do `remittance-repository` usa
        // depois do #767, de propósito. Lá o dado entra pelo REPO, que converte ISO → coluna; aqui
        // o insert é direto no `db`, sem passar por adapter nenhum. Alimentar este insert com ISO
        // reproduziria o erro 1292 que o #767 diagnosticou, do outro lado.
        generatedAt: '2026-08-19 12:00:00.000',
      });
      await handle.db.insert(finRemittancePayables).values([
        { remittanceId: REMITTANCE, payableId: PAY_A, documentId: DOC_A, yourNumber: REF_A },
        { remittanceId: REMITTANCE, payableId: PAY_B, documentId: DOC_B, yourNumber: REF_B },
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

    // Pareado com o mesmo nome em `van-return-match-reader.in-memory.test.ts`. Lá o fake também
    // afirma o que NÃO promete (a ordem devolvida diverge da pedida, de propósito); aqui isso não é
    // asseverável sem flake — sem `ORDER BY`, o MySQL pode devolver na ordem pedida por acaso, e um
    // assert nisso reprovaria o adapter num dia e o aprovaria no outro. O que os dois compartilham,
    // e é o contrato, é a resposta ser um CONJUNTO.
    //
    // Medido em 20/08/2026 contra MySQL 8.4.10: perguntando `IN ('…002','…001')`, o banco devolveu
    // `…001, …002` — ordem do índice, não da pergunta. O plano é `type: index` sobre
    // `fin_remittance_documents_your_number_uk` com `Using index` (a UNIQUE cobre a consulta). É a
    // evidência de que a ordem pedida NÃO sobrevive à ida ao banco, e de que asseverá-la aqui
    // reprovaria o adapter hoje.
    it('a resposta é um conjunto: a ordem da pergunta não atravessa o port', async () => {
      const reader = createDrizzleVanReturnMatchReader(handle);

      const found = await reader.findByYourNumbers([REF_B, REF_A]);
      assert.ok(found.ok);
      assert.deepEqual(
        found.value.map((r) => r.yourNumber).sort(),
        [REF_A, REF_B],
        'os mesmos vínculos, seja qual for a ordem da pergunta',
      );
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
    // ⚠️ O título e a nota daqui EXISTEM (`DOC_C`/`PAY_C`), e isso é o ponto do caso, não detalhe de
    // setup. Antes das FKs, este teste usava um id inventado; com a FK `RESTRICT` ele continuaria
    // passando — mas por `ER_NO_REFERENCED_ROW_2`, e não pela UNIQUE que ele afirma medir. Seria
    // verde pelo motivo errado, e a UNIQUE poderia ser removida sem ninguém notar. Só com as duas
    // pontas válidas é que a única razão possível para a rejeição é `your_number` repetido.
    it('a UNIQUE de `your_number` existe de verdade e recusa referência repetida', async () => {
      await assert.rejects(
        handle.db.insert(finRemittancePayables).values({
          remittanceId: REMITTANCE,
          payableId: PAY_C,
          documentId: DOC_C,
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
