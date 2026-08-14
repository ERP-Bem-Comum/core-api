import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// W0 RED: a coerência de data da remessa ainda não é modelada.
import { distinctPaymentDays } from '#src/modules/financial/domain/remittance/payment-dates.ts';

const utc = (y: number, m: number, d: number, h = 0, min = 0): Date =>
  new Date(Date.UTC(y, m, d, h, min));

describe('distinctPaymentDays — uma remessa, um dia', () => {
  // Decisão da P.O. (#711): todo título do arquivo é do mesmo dia; data diferente é outra remessa.
  it('devolve um único dia quando todos os pagamentos coincidem', () => {
    const days = distinctPaymentDays([utc(2026, 7, 12), utc(2026, 7, 12), utc(2026, 7, 12)]);
    assert.deepEqual(days, ['2026-08-12']);
  });

  // O layout transporta DDMMAAAA, sem hora (`positional.ts:47`). Duas datas do mesmo dia civil
  // emitem exatamente o mesmo campo — recusar por diferença de horário rejeitaria seleção válida.
  it('ignora o horário: mesmo dia civil é a mesma data', () => {
    const days = distinctPaymentDays([
      utc(2026, 7, 12, 0, 0),
      utc(2026, 7, 12, 13, 45),
      utc(2026, 7, 12, 23, 59),
    ]);
    assert.deepEqual(days, ['2026-08-12']);
  });

  // Comparação em UTC porque é o que o adapter escreve no arquivo. Usar horário local aqui faria
  // a validação discordar da emissão perto da meia-noite — recusando o que sairia igual.
  it('compara em UTC, o mesmo critério que o arquivo usa', () => {
    // 2026-08-12T23:00Z e 2026-08-13T01:00Z são dias distintos em UTC, ainda que a poucas horas.
    const days = distinctPaymentDays([utc(2026, 7, 12, 23), utc(2026, 7, 13, 1)]);
    assert.deepEqual(days, ['2026-08-12', '2026-08-13']);
  });

  it('devolve os dias em ordem, sem repetir', () => {
    const days = distinctPaymentDays([
      utc(2026, 7, 14),
      utc(2026, 7, 12),
      utc(2026, 7, 14),
      utc(2026, 7, 13),
    ]);
    assert.deepEqual(days, ['2026-08-12', '2026-08-13', '2026-08-14']);
  });

  // Conjunto unitário é trivialmente coerente; conjunto vazio não tem data alguma a conflitar.
  it('trata seleção unitária e vazia sem inventar conflito', () => {
    assert.deepEqual(distinctPaymentDays([utc(2026, 7, 12)]), ['2026-08-12']);
    assert.deepEqual(distinctPaymentDays([]), []);
  });
});
