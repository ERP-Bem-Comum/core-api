import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import {
  hasInscription,
  isCnabEmittableInscription,
  normalizeInscription,
} from '#src/modules/financial/domain/payout/inscription.ts';
import { inscription } from '#src/modules/financial/adapters/cnab/positional.ts';
import {
  fileHeader,
  batchHeader,
  type CedenteHeaderData,
} from '#src/modules/financial/adapters/cnab/multipag-records.ts';
import { segmentB, segmentBPix } from '#src/modules/financial/adapters/cnab/multipag-segments.ts';

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
// Sintético de verdade: é o exemplo do próprio repositório (`.claude/rules/domain.md`), sem
// correspondência a inscrição emitida. O valor anterior tinha DV válido e casava com o CNPJ raiz de
// uma instituição financeira real — anti-padrão #9 do CLAUDE.md, e os repositórios são públicos.
// `isCnabEmittableInscription` só exige dígitos, então nada aqui dependia de ser um CNPJ existente.
const NUMERIC = '11222333000181';
const MASKED = '12.345.678/0001-99';

describe('#863 — a inscrição alfanumérica é recusada, nunca destruída', () => {
  it('o que o pré-voo recusa, o campo posicional também recusa', () => {
    assert.equal(isCnabEmittableInscription(ALPHANUMERIC), false);

    const r = inscription(ALPHANUMERIC, 14);
    assert.ok(isErr(r), 'o campo aceitou inscrição alfanumérica — ela sairia como OUTRA inscrição');
    assert.equal(r.error, 'inscription-alphanumeric-unsupported');
  });

  it('a regressão que este caso existe para impedir: as letras somem e o resto vira inscrição válida', () => {
    // O comportamento ANTIGO, escrito por extenso — para quem ler saber o que estava em jogo.
    //
    // ⚠️ ESTE CASO NÃO É A REDE DE REGRESSÃO, e a versão anterior deste comentário dizia que era.
    // Ele chama `inscription()` DIRETO: prova que a função recusa, não que alguém a use. Reverter
    // qualquer call site de volta para `digits()` deixaria este caso verde. Quem cobre o uso é o
    // bloco "os call sites do emissor" abaixo — a distinção entre USO e MENÇÃO, que é justamente
    // como o defeito original sobreviveu.
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

  // ⚠️ A CARVE-OUT DO VAZIO SÓ VALE SE AS DUAS PONTAS DEFINIREM "VAZIO" IGUAL — e por um tempo não
  // definiram: o emissor perguntava pela normalização, o pré-voo perguntava `trim()`. `'---'` passa
  // no `trim()` e normaliza para vazio, então o pré-voo o classificava como inscrição alfanumérica e
  // mandava escalar ao banco, enquanto o emissor o tratava como campo em branco. `hasInscription` é
  // a pergunta única, e este caso é o que impede as duas de divergirem outra vez.
  it('"vazio" é a MESMA definição nos dois lados, pontuação inclusive', () => {
    for (const raw of ['', '   ', '///', '---', '.', './-']) {
      assert.equal(hasInscription(raw), false, `'${raw}' deveria contar como inscrição ausente`);

      const r = inscription(raw, 14);
      assert.ok(isErr(r), raw);
      assert.equal(
        r.error,
        'numeric-field-invalid',
        `'${raw}' saiu como alfanumérico — isso manda escalar ao banco um cadastro incompleto`,
      );
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

/*
 * OS CALL SITES DO EMISSOR — a rede que os casos acima NÃO são.
 *
 * Os casos anteriores exercitam `inscription()` isolada. Nenhum deles chama um registro do arquivo,
 * então reverter qualquer chamada de volta para `digits()` os deixaria todos verdes: eles provam
 * que a régua EXISTE, não que o emissor a USA.
 *
 * Aqui cada registro que escreve inscrição é montado com documento alfanumérico e tem de RECUSAR.
 * É por registro, e não por uma varredura de texto no fonte, porque o que precisa ser verdade é
 * comportamento — um `grep` por `digits(` acusaria também quem só menciona o nome, e continuaria
 * verde se alguém introduzisse um terceiro helper com o mesmo defeito.
 *
 * ⚠️ E não basta o teste de ponta a ponta (`generate-remittance.test.ts`, CA3): lá a recusa é do
 * PRÉ-VOO, que barra antes de o emissor ser chamado. A camada de baixo — a que de fato produziria o
 * arquivo aceito com a inscrição de outro — só é alcançada montando os registros direto, como aqui.
 */

const CEDENTE_ALPHANUMERIC: CedenteHeaderData = {
  bankCode: '237',
  documentType: '2',
  document: ALPHANUMERIC,
  convenio: '000000', // máscara reservada — `tests/cleanup/bank-fixture-masking.test.ts`
  agency: '1234',
  agencyDigit: '5',
  accountNumber: '567890',
  accountDigit: '1',
  accountAgencyDigit: '2',
  companyName: 'ASSOCIACAO BEM COMUM',
};

const PAYEE_ALPHANUMERIC = {
  name: 'FORNECEDOR TESTE',
  documentType: '2',
  document: ALPHANUMERIC,
} as const;

const TRANSFER_PROFILE = {
  serviceType: '20',
  launchForm: '41',
  batchLayoutVersion: '045',
  paymentIndicator: '01',
} as const;

const AT = new Date(Date.UTC(2026, 8, 8, 12, 0, 0));

describe('#863 — os registros do emissor recusam inscrição alfanumérica', () => {
  it('fileHeader (019-032, cedente) recusa', () => {
    const r = fileHeader({
      cedente: CEDENTE_ALPHANUMERIC,
      bankName: 'BRADESCO',
      nsa: 1,
      generatedAt: AT,
      pixIdentification: null,
    });
    assert.ok(isErr(r), 'o header do arquivo aceitou inscrição alfanumérica do cedente');
    assert.equal(r.error, 'inscription-alphanumeric-unsupported');
  });

  it('batchHeader (019-032, cedente) recusa', () => {
    const r = batchHeader({
      cedente: CEDENTE_ALPHANUMERIC,
      batchNumber: 1,
      profile: TRANSFER_PROFILE,
    });
    assert.ok(isErr(r), 'o header de lote aceitou inscrição alfanumérica do cedente');
    assert.equal(r.error, 'inscription-alphanumeric-unsupported');
  });

  it('segmentB (018-032, favorecido) recusa', () => {
    const r = segmentB({
      bankCode: '237',
      batchNumber: 1,
      recordNumber: 2,
      payee: PAYEE_ALPHANUMERIC,
      dueDate: AT,
      titleValueCents: 10000,
    });
    assert.ok(isErr(r), 'o Segmento B aceitou inscrição alfanumérica do favorecido');
    assert.equal(r.error, 'inscription-alphanumeric-unsupported');
  });

  it('segmentBPix (018-032, favorecido) recusa', () => {
    const r = segmentBPix({
      bankCode: '237',
      batchNumber: 1,
      recordNumber: 2,
      payee: PAYEE_ALPHANUMERIC,
      initiation: '04',
      pixKey: 'chave@exemplo.test',
    });
    assert.ok(isErr(r), 'o Segmento B de Pix aceitou inscrição alfanumérica do favorecido');
    assert.equal(r.error, 'inscription-alphanumeric-unsupported');
  });
});
