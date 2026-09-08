import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import {
  segmentBPix,
  type Payee,
  type SegmentBPixInput,
} from '#src/modules/financial/adapters/cnab/multipag-segments.ts';

/*
 * O Segmento B na modalidade Pix, por POSIÇÃO (#838, CA2).
 *
 * A régua está em `.claude/skills/cnab240-bradesco/referencias/02-layout-registros.md:194-212`,
 * medida contra o golden `GOLDEN_TEST_MULTIPAG_PIX_240` do banco. O que este arquivo prova é que o
 * mesmo bloco físico 033-226 mudou de semântica: onde a modalidade não-Pix escreve endereço e
 * valores nominais, esta escreve TXID, identificação e chave.
 *
 * ⚠️ Nenhum dado de cadastro real aqui — nem chave, nem documento, nem banco de favorecido. Os
 * repositórios são públicos, e fixture é o caminho por onde esse dado entra.
 */

// Documento com a FORMA de um CNPJ, sem ser o de ninguém: 14 posições, todas o mesmo dígito.
const PAYEE: Payee = {
  name: 'FAVORECIDO DE TESTE',
  documentType: '2',
  document: '11111111111111',
  // O bloco bancário existe no tipo e NÃO é escrito por este registro — é justamente o que a
  // modalidade Pix substitui pela chave. Preenchido com forma válida para provar a ausência.
  bankCode: '999',
  agency: '00001',
  agencyDigit: '0',
  accountNumber: '000000000001',
  accountDigit: '0',
};

const input = (over: Partial<SegmentBPixInput> = {}): SegmentBPixInput => ({
  bankCode: '237',
  batchNumber: 1,
  recordNumber: 2,
  payee: PAYEE,
  initiation: '04',
  pixKey: '00000000-0000-4000-8000-000000000000',
  ...over,
});

/** 1-indexado e inclusivo, como o layout fala. */
const at = (line: string, from: number, to: number): string => line.slice(from - 1, to);

const build = (over: Partial<SegmentBPixInput> = {}): string => {
  const r = segmentBPix(input(over));
  assert.ok(isOk(r), `segmentBPix deveria montar: ${isOk(r) ? '' : r.error}`);
  return r.value;
};

describe('segmentBPix — o Segmento B com a régua da modalidade Pix (#838)', () => {
  it('tem 240 posições, como todo registro do layout', () => {
    assert.equal(build().length, 240);
  });

  it('escreve o cabeçalho do registro — banco, lote, tipo, sequência e segmento', () => {
    const line = build();
    assert.equal(at(line, 1, 3), '237');
    assert.equal(at(line, 4, 7), '0001');
    assert.equal(at(line, 8, 8), '3', 'tipo de registro: detalhe');
    assert.equal(at(line, 9, 13), '00002');
    assert.equal(at(line, 14, 14), 'B');
  });

  it('grava a forma de iniciação ALINHADA À ESQUERDA — `04 `, nunca `004`', () => {
    // `G100` é campo Alfa de 3 posições com domínio de 2 dígitos
    // (`02-layout-registros.md:204-207`). Zero-padding produziria uma forma de iniciação que não
    // existe no domínio, e o banco a recusaria apontando a coluna sem dizer o que esperava.
    assert.equal(at(build(), 15, 17), '04 ');
    assert.equal(at(build({ initiation: '01' }), 15, 17), '01 ');
  });

  it('identifica o favorecido por inscrição, como a modalidade não-Pix', () => {
    const line = build();
    assert.equal(at(line, 18, 18), '2', 'tipo de inscrição (G005)');
    assert.equal(at(line, 19, 32), '11111111111111');
  });

  it('deixa TXID e identificação entre usuários em branco — os dois são opcionais', () => {
    // O golden traz texto livre em 068-127, o que prova que o campo ACEITA conteúdo, não que ele o
    // exija. Não há fonte para eles no lançamento, e inventar escreveria no arquivo um dado que o
    // operador não digitou e não pode conferir.
    const line = build();
    assert.equal(at(line, 33, 67), ' '.repeat(35), 'TXID');
    assert.equal(at(line, 68, 127), ' '.repeat(60), 'identificação entre usuários');
  });

  it('grava a chave em 128-226, alinhada à esquerda', () => {
    const line = build();
    assert.equal(at(line, 128, 226).trimEnd(), '00000000-0000-4000-8000-000000000000');
    assert.equal(at(line, 128, 226).length, 99);
  });

  it('zera a UG centralizadora e grava o ISPB do PSP', () => {
    const line = build();
    // Zerado, não em branco — é o que o golden do banco grava, apesar de o layout não marcar o campo
    // como obrigatório.
    assert.equal(at(line, 227, 232), '000000', 'UG SIAPE (P012)');
    assert.equal(at(line, 233, 240), '00000000', 'ISPB do PSP (P015)');
  });

  it('NÃO escreve agência, conta nem endereço do favorecido — é a CA2 da issue', () => {
    // A prova de que a régua trocou. O bloco bancário está preenchido no `Payee` com forma válida
    // (`999` / `00001` / `000000000001`), e nenhum desses valores pode aparecer na linha: se
    // aparecer, o registro foi montado pelo caminho da transferência.
    const line = build();
    const body = at(line, 33, 232);
    assert.equal(body.includes('999'), false, 'banco do favorecido não pertence a este registro');
    assert.equal(body.includes('000000000001'), false, 'conta não pertence a este registro');
  });

  // ── Guardas ───────────────────────────────────────────────────────────────────────────────────

  it('recusa chave que não cabe no campo, em vez de truncar', () => {
    // ⚠️ O caso que motiva a guarda: `text()` trunca por desenho, e as 99 primeiras posições de uma
    // chave maior são uma chave DIFERENTE. O arquivo sairia bem-formado, o inspetor aprovaria por
    // não ser defeito de forma, e o dinheiro iria para outro recebedor.
    const r = segmentBPix(input({ pixKey: 'K'.repeat(100) }));
    assert.equal(isOk(r), false);
    assert.equal(isOk(r) ? null : r.error, 'pix-key-unrepresentable');
  });

  it('aceita a chave que ocupa o campo inteiro — o limite é 99, não 98', () => {
    const line = build({ pixKey: 'K'.repeat(99) });
    assert.equal(at(line, 128, 226), 'K'.repeat(99));
  });

  it('recusa chave vazia ou só com espaços', () => {
    for (const bad of ['', '   ']) {
      const r = segmentBPix(input({ pixKey: bad }));
      assert.equal(isOk(r), false, `deveria recusar ${JSON.stringify(bad)}`);
      assert.equal(isOk(r) ? null : r.error, 'pix-key-unrepresentable');
    }
  });

  it('recusa forma de iniciação malformada — coerência interna do emissor', () => {
    // Nenhum valor externo alimenta o G100: ele vem de `pixInitiationFor`. Um formato inválido aqui
    // só é alcançável por defeito do próprio emissor, e por isso reusa `numeric-field-invalid`.
    for (const bad of ['', '4', '004', 'aa', ' 4']) {
      const r = segmentBPix(input({ initiation: bad }));
      assert.equal(isOk(r), false, `deveria recusar ${JSON.stringify(bad)}`);
      assert.equal(isOk(r) ? null : r.error, 'numeric-field-invalid');
    }
  });
});
