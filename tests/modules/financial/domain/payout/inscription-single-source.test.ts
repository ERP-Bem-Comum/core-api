import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import {
  isCnabEmittableInscription,
  normalizeInscription,
} from '#src/modules/financial/domain/payout/inscription.ts';
import { inscription } from '#src/modules/financial/adapters/cnab/positional.ts';

/*
 * #863 / CA11 da #948 — o pré-voo e o emissor decidem a inscrição pela mesma régua.
 *
 * Mesma estrutura de `pix-key-single-source.test.ts`, e pelo mesmo motivo: as duas pontas são
 * EXECUTADAS e comparadas, em vez de inspecionadas por tipo. Aqui isso importa ainda mais, porque o
 * defeito original não produzia erro nenhum — produzia um arquivo aceito com a inscrição errada. Um
 * teste que só verificasse "existe uma função de guarda" passaria com a guarda desligada.
 *
 * ⚠️ O CASO CENTRAL É O PRIMEIRO. `digits('12ABC34501DE35', 14)` devolvia `'00000123450135'`: catorze
 * dígitos, sintaticamente perfeitos, e de outra pessoa. É a classe de defeito que nenhum validador
 * pega — nem o do banco, nem o `remittance-inspector`, porque não é defeito de FORMA.
 */

const ALPHANUMERIC = '12ABC34501DE35'; // CNPJ alfanumérico da RFB (ADR-0044), sintético
const NUMERIC = '00000000000191'; // inscrição sintética; repositório é público
const MASKED = '12.345.678/0001-99';

describe('#863 — a inscrição alfanumérica é recusada, nunca destruída', () => {
  it('o que o pré-voo recusa, o campo posicional também recusa', () => {
    assert.equal(isCnabEmittableInscription(ALPHANUMERIC), false);

    const r = inscription(ALPHANUMERIC, 14);
    assert.ok(isErr(r), 'o campo aceitou inscrição alfanumérica — ela sairia como OUTRA inscrição');
    assert.equal(r.error, 'inscription-alphanumeric-unsupported');
  });

  it('a regressão que este caso existe para impedir: as letras somem e o resto vira inscrição válida', () => {
    // O comportamento ANTIGO, escrito por extenso. Se alguém trocar `inscription` de volta por
    // `digits`, este caso falha apontando exatamente o que voltaria a acontecer.
    const whatDigitsWouldHaveDone = ALPHANUMERIC.replace(/\D/g, '').padStart(14, '0');

    assert.equal(whatDigitsWouldHaveDone, '00000123450135');
    assert.match(whatDigitsWouldHaveDone, /^\d{14}$/, 'e é por isso que ninguém percebia');

    const r = inscription(ALPHANUMERIC, 14);
    assert.ok(isErr(r));
  });

  it('o que o pré-voo aprova, o campo posicional escreve', () => {
    for (const raw of [NUMERIC, MASKED, '123']) {
      assert.equal(isCnabEmittableInscription(raw), true, raw);

      const r = inscription(raw, 14);
      assert.ok(isOk(r), `o campo recusou '${raw}', que o pré-voo aprova`);
      assert.equal(r.value, normalizeInscription(raw).padStart(14, '0'));
    }
  });

  // CA2 da #863: o comportamento de hoje não pode regredir. Máscara continua sendo tradução de
  // formato — é a razão de `digits()` existir, e nada nesta fatia a tira.
  it('máscara continua sendo removida, e não é confundida com conteúdo', () => {
    const r = inscription(MASKED, 14);
    assert.ok(isOk(r));
    assert.equal(r.value, '12345678000199');
  });

  // ⚠️ A carve-out do vazio. Sem ela, campo em branco sairia como
  // `inscription-alphanumeric-unsupported` e mandaria escalar ao banco um caso que é cadastro
  // faltando — dois desfechos com ações opostas colapsados num só.
  it('inscrição vazia continua sendo erro de campo numérico, não de alfanumérico', () => {
    for (const raw of ['', '   ', '///']) {
      const r = inscription(raw, 14);
      assert.ok(isErr(r), raw);
      assert.equal(r.error, 'numeric-field-invalid', raw);
    }
  });

  it('estouro continua sendo estouro', () => {
    const r = inscription('1'.repeat(15), 14);
    assert.ok(isErr(r));
    assert.equal(r.error, 'numeric-field-overflow');
  });

  // CA3 da #863: o reader preservava letras (citando o ADR-0044) e `digits()` as removia de volta —
  // duas decisões opostas sobre o mesmo dado, nenhuma citando a outra. Agora há uma normalização só.
  it('a normalização é a MESMA dos dois lados, caixa inclusive', () => {
    assert.equal(normalizeInscription('12abc34501de35'), ALPHANUMERIC);
    assert.equal(normalizeInscription('12.345.678/0001-99'), '12345678000199');
  });
});
