// SCH-01 — nenhuma coluna do schema carrega collation fora do par canônico.
//
// A classe de defeito que esta invariante vigia já custou uma migration: a `0050` morreu com
// `1267 ER_CANT_AGGREGATE_2COLLATIONS`, e virou a issue #808. O diagnóstico de lá terminou com a
// proposta de uma camada de verificação que nunca foi instalada — é esta.
//
// ⚠️ **Nem toda mistura de collations dá 1267, e a distinção é o que esta invariante vigia.** Pelo
// Refman 8.4 §12.8.4, operandos do mesmo charset em que um lado é `_bin` resolvem PARA o `_bin`, em
// silêncio — `utf8mb4_unicode_ci` contra `utf8mb4_bin` não levanta erro nenhum. O `1267` nasce do
// outro triângulo: duas collations **ambas `_ci`** do mesmo charset e mesma coercibilidade, sem
// desempate possível (`utf8mb4_0900_ai_ci` × `utf8mb4_unicode_ci`, que é o caso da #808). É
// exatamente esse triângulo que uma collation TERCEIRA no schema cria — e é por isso que a lista de
// aceitos aqui tem dois valores, não um.
//
// O tamanho da classe é o argumento, e ele não depende do número exato: a maior parte das colunas
// de texto do schema **não declara `COLLATE`** e herda a do servidor. Ou seja, a correção delas
// depende de o servidor estar configurado como `docker/mysql/conf.d/server.cnf` manda — e é isso
// que uma query responde e uma leitura de código não.
//
// ⚠️ **Divergência de medição, registrada e não resolvida.** Duas varreduras contra este schema não
// batem: 21/08 contou **114** colunas em `utf8mb4_bin`; 24/08 contou **183** (excluídas as 5 que o
// PR #834 acrescenta). A diferença é grande demais para ser diff de branch, então uma das duas tem
// recorte ou defeito de contagem — provavelmente perder o que nasceu de `ALTER … ADD` em vez de
// `CREATE TABLE`, que é subcontagem já vista duas vezes neste repositório. **Nenhuma asserção aqui
// depende desses números**, deliberadamente: contagem em gate envelhece no próximo schema, e a
// propriedade que esta invariante fixa — nada fora do par canônico — não muda com o tamanho.
//
// ⚠️ O QUE ESTA INVARIANTE **NÃO** PEGA, e é deliberado: coluna que *deveria* ser `utf8mb4_bin` e
// ficou `utf8mb4_unicode_ci` passa verde aqui — os dois valores são aceitos. Esse é o defeito
// `SCH-02` (PR #834), estrutural do schema, e o dano dele **não** é erro de JOIN, pela regra do
// parágrafo acima: é a comparação que não envolve um lado `_bin` — busca por literal, `UNIQUE`,
// índice — passar a tratar como iguais dois valores que diferem só na caixa. Num identificador isso
// é errado; numa chave de objeto de storage é ativo, porque no bucket os dois são arquivos
// distintos. As duas invariantes são complementares e nenhuma cobre a outra; concluir "collation
// está fechada" com só esta instalada seria o erro.
//
// GATE: só roda com `MYSQL_INTEGRATION=1` — consulta o BANCO, não o fonte. É a diferença desta para
// as demais invariantes de `tests/cleanup/`, que perguntam ao git.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { sql } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

/** O par canônico. Fora dele, é divergência a explicar — não a tolerar. */
const CANONICAL = ['utf8mb4_unicode_ci', 'utf8mb4_bin'];

/** Tabela descartável do contrafactual. Prefixo `zz_` para não colidir com módulo algum. */
const PROBE = 'zz_collation_probe';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[cleanup:schema-collation] MYSQL_INTEGRATION não definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('SCH-01 — collation fora do par canônico', () => {
    let handle: FinancialMysqlHandle;

    const offenders = async (): Promise<number> => {
      const rows = await handle.db.execute(sql`
        SELECT COUNT(*) AS n
          FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND collation_name IS NOT NULL
           AND collation_name NOT IN (${sql.raw(CANONICAL.map((c) => `'${c}'`).join(','))})
      `);
      // `-1` como sentinela: se a forma do retorno mudar, o assert falha em vez de ler `0` e passar.
      const first = (rows as unknown as readonly (readonly { n: number }[])[])[0]?.[0];
      return first?.n ?? -1;
    };

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 2 });
      if (!r.ok) throw new Error(`[cleanup:schema-collation] Falha ao conectar: ${r.error}`);
      handle = r.value;
      // Resíduo de execução anterior interrompida no meio do contrafactual mentiria como vermelho.
      await handle.db.execute(sql.raw(`DROP TABLE IF EXISTS ${PROBE}`));
    });

    after(async () => {
      await handle.db.execute(sql.raw(`DROP TABLE IF EXISTS ${PROBE}`));
    });

    it('nenhuma coluna do schema migrado está fora de utf8mb4_unicode_ci / utf8mb4_bin', async () => {
      assert.equal(
        await offenders(),
        0,
        'coluna com collation fora do par canônico — é a forma do 1267 que derrubou a migration 0050 (#808)',
      );
    });

    // Sem este caso, o teste acima fica verde para sempre, inclusive num schema que ele deveria
    // reprovar: `COUNT(*) = 0` é o que uma consulta quebrada também devolve. O contrafactual é o que
    // separa "não há divergência" de "não estou olhando".
    it('a consulta ACUSA quando existe divergência (guarda contra verde por vacuidade)', async () => {
      await handle.db.execute(
        sql.raw(`CREATE TABLE ${PROBE} (id varchar(36) COLLATE utf8mb4_general_ci)`),
      );
      try {
        assert.equal(
          await offenders(),
          1,
          'a consulta não enxergou uma coluna divergente plantada',
        );
      } finally {
        await handle.db.execute(sql.raw(`DROP TABLE IF EXISTS ${PROBE}`));
      }
      assert.equal(await offenders(), 0, 'a tabela do contrafactual sobreviveu ao próprio teste');
    });
  });
}
