import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import {
  PAYABLE_PIX_KEY_TYPES,
  PIX_KEY_MAX_WIDTH,
  isPayablePixKeyType,
  pixKeyFitsField,
} from '#src/modules/financial/domain/payout/pix-key.ts';
import { pixInitiationFor } from '#src/modules/financial/adapters/cnab/pix-initiation.ts';
import { segmentBPix } from '#src/modules/financial/adapters/cnab/multipag-segments.ts';

/*
 * CA3 da #948 — a rede que impede o pré-voo e o emissor de voltarem a discordar sobre o Pix.
 *
 * A #837 fechou esta classe de defeito uma vez, para a EXISTÊNCIA do emissor. O Pix a reabriu pelas
 * CONDIÇÕES dele: duas recusas do montador que o pré-voo não consultava, e que chegam DEPOIS do
 * `allocateNsa` — cada tentativa queimando um número da série.
 *
 * ⚠️ ESTE TESTE MEDE OS DOIS LADOS DE FATO, e é o que o separa de um teste de tipos. Metade das
 * garantias aqui já é do compilador — o `Record<PayablePixKeyType, string>` de `pix-initiation.ts`
 * não compila com um tipo faltando, e `PIX_KEY_WIDTH` é literalmente `PIX_KEY_MAX_WIDTH`. Mas
 * compilador só cobra o que está LIGADO: no dia em que alguém reescrever o mapa com chaves soltas ou
 * voltar a escrever `99` no montador, a compilação segue verde e a divergência volta em silêncio.
 * Por isso cada caso abaixo EXECUTA as duas pontas e compara desfechos, em vez de inspecionar tipos.
 */

const PAYEE = { name: 'FORNECEDOR TESTE', documentType: '2', document: '98765432000198' } as const;

const buildSegmentB = (key: string, initiation: string) =>
  segmentBPix({
    bankCode: '237',
    batchNumber: 1,
    recordNumber: 2,
    payee: PAYEE,
    initiation,
    pixKey: key,
  });

describe('#948 CA3 — o pré-voo e o emissor decidem o Pix pela mesma régua', () => {
  it('todo tipo que o pré-voo aprova, o emissor sabe traduzir', () => {
    for (const keyType of PAYABLE_PIX_KEY_TYPES) {
      assert.equal(isPayablePixKeyType(keyType), true, `${keyType} deveria ser pagável`);

      const initiation = pixInitiationFor(keyType);
      assert.ok(
        isOk(initiation),
        `o pré-voo aprova '${keyType}' e o emissor recusa — é a divergência que a #948 fecha`,
      );
      assert.match(initiation.value, /^\d{2}$/, `o G100 de '${keyType}' deve ter dois dígitos`);
    }
  });

  it('todo tipo que o pré-voo recusa, o emissor também recusa', () => {
    for (const keyType of ['', 'algo-que-o-G100-nao-tem', 'toString', 'constructor', '05']) {
      assert.equal(isPayablePixKeyType(keyType), false, `${keyType} não deveria ser pagável`);
      assert.ok(
        isErr(pixInitiationFor(keyType)),
        `o pré-voo recusa '${keyType}' e o emissor aceita — o arquivo sairia com iniciação inventada`,
      );
    }
  });

  // ⚠️ `'toString'` e `'constructor'` acima não são zelo decorativo: um `Record` consultado direto
  // devolveria uma FUNÇÃO para essas chaves, que não é `undefined` e passaria pela guarda do emissor
  // como se fosse código `G100` válido. É a razão de o mapa ser `Map` e não objeto, e o caso fica
  // fixado aqui porque o defeito só aparece se alguém trocar a estrutura de volta.

  it('a chave que o pré-voo aprova pelo comprimento, o emissor monta', () => {
    for (const size of [1, 36, PIX_KEY_MAX_WIDTH]) {
      const key = 'k'.repeat(size);
      assert.equal(pixKeyFitsField(key), true, `chave de ${String(size)} deveria caber`);
      assert.ok(
        isOk(buildSegmentB(key, '04')),
        `o emissor recusou chave de ${String(size)} posições`,
      );
    }
  });

  it('a chave que o pré-voo recusa pelo comprimento, o emissor também recusa', () => {
    const key = 'k'.repeat(PIX_KEY_MAX_WIDTH + 1);

    assert.equal(pixKeyFitsField(key), false);

    const r = buildSegmentB(key, '04');
    assert.ok(
      isErr(r),
      'o emissor aceitou chave que não cabe — ela seria TRUNCADA, virando outra chave',
    );
    assert.equal(r.error, 'pix-key-unrepresentable');
  });

  // O `trim` tem de ser o MESMO dos dois lados. Se o pré-voo medisse a chave crua e o emissor a
  // medisse aparada (ou o contrário), uma chave de 99 posições com espaços em volta seria aprovada
  // por um e recusada pelo outro — divergência de UMA posição, invisível em revisão.
  it('as duas pontas medem a chave depois do mesmo trim', () => {
    const key = `  ${'k'.repeat(PIX_KEY_MAX_WIDTH)}  `;

    assert.equal(pixKeyFitsField(key), true);
    assert.ok(isOk(buildSegmentB(key, '04')));
  });
});
