import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  inscriptionType,
  isCnabEmittableInscription,
  normalizeInscription,
} from '#src/modules/financial/domain/payout/inscription.ts';

/**
 * A inscrição (CPF/CNPJ) como o arquivo do banco precisa dela — fonte única (#856).
 *
 * O que estes casos protegem não é a aritmética do comprimento: é a UNICIDADE da régua. O emissor
 * afirmava `'2'` literal para o cedente enquanto o reader MEDIA o mesmo fato para o favorecido, e as
 * duas decisões conviviam sem se citar. Com uma função só, mexer nela reclassifica os dois lados do
 * arquivo de uma vez — e é isso que estes testes fixam.
 */
describe('normalizeInscription — a máscara sai, as letras ficam', () => {
  it('remove pontuação de CPF e CNPJ', () => {
    assert.equal(normalizeInscription('123.456.789-09'), '12345678909');
    assert.equal(normalizeInscription('12.345.678/0001-99'), '12345678000199');
  });

  // ⚠️ ADR-0044: a Receita emite CNPJ alfanumérico desde 07/2026 — 12 posições alfanuméricas mais 2
  // DVs numéricos. Um filtro `\D` aqui destruiria conteúdo em vez de tirar máscara, e o resultado
  // seria uma inscrição diferente com aparência perfeitamente válida.
  it('PRESERVA as letras do CNPJ alfanumérico — não é máscara, é conteúdo', () => {
    assert.equal(normalizeInscription('12ABC34501DE35'), '12ABC34501DE35');
    assert.equal(normalizeInscription('12.ABC.345/01DE-35'), '12ABC34501DE35');
  });

  // `12abc3` e `12ABC3` são a mesma inscrição; deixar as duas formas circularem produziria
  // comparações que falham por caixa.
  it('normaliza para maiúsculas, como a RFB define', () => {
    assert.equal(normalizeInscription('12abc34501de35'), '12ABC34501DE35');
  });
});

describe('inscriptionType — G005, e por que ele mede em vez de afirmar', () => {
  it('11 posições é pessoa física', () => {
    assert.equal(inscriptionType('12345678909'), '1');
  });

  it('14 posições é pessoa jurídica', () => {
    assert.equal(inscriptionType('12345678000199'), '2');
  });

  // O caso que o literal `'2'` do cedente errava: a máscara não muda quem é o titular.
  it('mede sobre a inscrição NORMALIZADA — máscara não reclassifica ninguém', () => {
    assert.equal(inscriptionType('123.456.789-09'), '1');
    assert.equal(inscriptionType('12.345.678/0001-99'), '2');
  });

  // ⚠️ A dependência entre as duas funções é real, e este caso a fixa: se a normalização voltasse a
  // filtrar `\D`, `12ABC34501DE35` encolheria para 11 dígitos e um CNPJ viraria pessoa física —
  // tipo errado num arquivo que o banco aceita sem reclamar.
  it('CNPJ alfanumérico continua sendo pessoa jurídica', () => {
    assert.equal(inscriptionType('12ABC34501DE35'), '2');
  });

  // Uma inscrição alfanumérica tem tipo `2` E é inemissível num campo `Num` — as duas perguntas são
  // independentes, e esta função responde só a primeira. Quem responde a segunda é a #863.
  it('não opina sobre emissibilidade: comprimento é a única pergunta que ele responde', () => {
    assert.equal(inscriptionType(''), '2');
    assert.equal(inscriptionType('---'), '2');
  });
});

describe('isCnabEmittableInscription — cabe num campo `Num` sem virar OUTRA inscrição?', () => {
  it('inscrição numérica cabe, com ou sem máscara', () => {
    assert.equal(isCnabEmittableInscription('12345678000199'), true);
    assert.equal(isCnabEmittableInscription('12.345.678/0001-99'), true);
    assert.equal(isCnabEmittableInscription('12345678909'), true);
  });

  // O helper posicional do emissor removeria as letras e devolveria `00000123450135` — catorze
  // dígitos, campo válido, arquivo aceito pelo banco, e uma inscrição que não é a do titular. É por
  // isso que a resposta é `false` e não uma normalização "esperta".
  it('inscrição alfanumérica NÃO cabe — remover as letras produziria outra inscrição', () => {
    assert.equal(isCnabEmittableInscription('12ABC34501DE35'), false);
  });

  it('vazio não cabe, e só-pontuação também é vazio', () => {
    for (const empty of ['', '   ', '---', './-']) {
      assert.equal(isCnabEmittableInscription(empty), false, JSON.stringify(empty));
    }
  });
});
