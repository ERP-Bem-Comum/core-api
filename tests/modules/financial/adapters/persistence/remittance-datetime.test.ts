import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  toMysqlDateTime,
  toIsoDateTime,
} from '#src/modules/financial/adapters/persistence/repos/remittance-repository.drizzle.ts';

/**
 * Tradução de instante entre o domínio e a coluna `datetime` de `fin_remittances`.
 *
 * ORIGEM: `POST /financial/remittances` nunca funcionou contra MySQL real. O domínio guarda instante
 * como ISO 8601 UTC — `generate-remittance.ts` produz `toISOString()` — e a coluna é `datetime(3)`
 * em `mode: 'string'`, modo em que o Drizzle repassa a string CRUA ao driver. O MySQL recebe o `T` e
 * o `Z` e recusa:
 *
 *   ERROR 1292 (22007): Incorrect datetime value: '2026-08-19T10:00:00.000Z' for column 'd'
 *
 * (medido contra MySQL 8.4 real, 19/08/2026)
 *
 * ⚠️ Por que este arquivo existe, e não só a suíte de integração: a suíte só roda sob
 * `MYSQL_INTEGRATION=1`, e foi justamente ela que ficou VERDE durante todo o período do defeito —
 * porque a fixture escrevia o formato do MySQL à mão, que o use case nunca produz. Um teste
 * alimentado com dado que a aplicação não gera não prova o caminho da aplicação.
 *
 * Estes casos rodam no gate rápido e falham sem banco nenhum.
 */

describe('remittance — instante do domínio para a coluna datetime', () => {
  it('converte o ISO que o use case produz para o formato que o MySQL aceita', () => {
    // Exatamente a forma de `generatedAt.toISOString()`.
    assert.equal(toMysqlDateTime('2026-08-18T15:01:24.615Z'), '2026-08-18 15:01:24.615');
  });

  it('não deixa passar `T` nem `Z` — são o que o 1292 recusa', () => {
    const stored = toMysqlDateTime('2026-08-19T10:00:00.000Z');
    assert.ok(!stored.includes('T'), 'o T separador derruba o INSERT');
    assert.ok(!stored.includes('Z'), 'o sufixo de fuso derruba o INSERT');
  });

  it('preserva o instante em UTC, sem deslocar pelo fuso da máquina', () => {
    // `datetime` não guarda fuso. Se a conversão usasse os getters locais, o mesmo código gravaria
    // horas diferentes em máquinas diferentes — e o horário de um pagamento passaria a depender de
    // onde o processo rodou.
    assert.equal(toMysqlDateTime('2026-01-01T00:00:00.000Z'), '2026-01-01 00:00:00.000');
    assert.equal(toMysqlDateTime('2026-12-31T23:59:59.999Z'), '2026-12-31 23:59:59.999');
  });

  it('zero-padding em todos os componentes, inclusive nos milissegundos', () => {
    // `.5` em vez de `.005` deslocaria o instante em quase meio segundo, silenciosamente.
    assert.equal(toMysqlDateTime('2026-03-04T05:06:07.008Z'), '2026-03-04 05:06:07.008');
  });

  it('string que não é instante passa CRUA, para o banco recusar', () => {
    // Deliberado: inventar um valor plausível numa coluna que decide quando um pagamento saiu é pior
    // que falhar. O erro do banco aponta o dado; um default silencioso não aponta nada.
    assert.equal(toMysqlDateTime('nao-e-data'), 'nao-e-data');
  });

  it('a volta devolve ISO — o formato do domínio e do contrato HTTP', () => {
    assert.equal(toIsoDateTime('2026-08-18 15:01:24.615'), '2026-08-18T15:01:24.615Z');
  });

  it('a volta é idempotente sobre valor que já está em ISO', () => {
    // Protege contra dupla conversão quando a leitura vier de origem já normalizada.
    assert.equal(toIsoDateTime('2026-08-18T15:01:24.615Z'), '2026-08-18T15:01:24.615Z');
  });

  it('ida e volta preservam o instante', () => {
    const original = '2026-08-18T15:01:24.615Z';
    assert.equal(toIsoDateTime(toMysqlDateTime(original)), original);
  });
});
