/**
 * CNAB-MANUAL-INDEX — o indexador do layout Multipag Bradesco.
 *
 * O script existe porque as referências da skill citavam páginas de outra edição do manual: a
 * "Versão 6 – julho/2023" contra a Versão 08 – julho/2025 que está no repositório, com deslocamento
 * variável por seção. Um agente instruído a "citar a página do manual" produzia âncora apontando
 * para outro campo.
 *
 * O PDF é gitignored (restrição de redistribuição), então estes testes NÃO o abrem — exercitam as
 * funções puras contra páginas sintéticas. É de propósito: teste que depende de arquivo ausente no
 * runner é gate que fica vermelho por motivo que ninguém consegue corrigir.
 *
 * Os dois casos históricos que as asserções protegem, ambos cometidos na primeira versão do script:
 *
 *   1. varrer o PDF inteiro por `'XX' = Nome` capturou a tabela de códigos de movimento de
 *      COBRANÇA junto com a G059 — `'01'` voltou como "Entrada de Títulos" em vez de
 *      "Insuficiência de Fundos". É a mesma confusão que este repositório já registrou como "o
 *      handbook propagou segmento de cobrança em pagamento", e o diagnóstico de recusa sai errado
 *      por causa dela;
 *   2. buscar `G007` acusou três páginas, porque a coluna "Desc." de toda tabela de layout cita o
 *      código. Só a seção de descrição o DEFINE — e é a página dela que o agente precisa.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  handleMissingManual,
  parseIndex,
  parseOccurrences,
  renderIndex,
} from '../../scripts/financial/cnab-manual-index.ts';

/** Uma página da seção de descrição: o código abre a linha, o nome vem junto. */
const DESCRIPTION_PAGE = `
G029 Forma de Lançamento
Código adotado pela FEBRABAN para identificar a forma de lançamento.
`;

/** A tabela de layout: cita o código na coluna "Desc." sem defini-lo. */
const LAYOUT_PAGE = `
| 12-13 | 2 | Forma de Lançamento | Num | G029 |
| 14-16 | 3 | Versão do Layout do Lote | Num | G030 |
`;

/** A tabela de movimento de cobrança — mesma sintaxe da G059, seção completamente outra. */
const COLLECTION_PAGE = `
'01' = Entrada de Títulos
'02' = Pedido de Baixa
`;

const G059_PAGE = `
G059 Código das Ocorrências para Retorno/Remessa
'01' = Insuficiência de Fundos - Débito Não Efetuado
'AK' = Código da Câmara de Compensação do Banco Favorecido Inválido
`;

/** Fecha a seção do G059 — é o próximo campo definido que delimita a faixa. */
const G060_PAGE = `
G060 Código do Tipo de Movimento
`;

describe('cnab-manual-index — localizar campo no manual', () => {
  it('indexa a página onde o campo é DEFINIDO, não onde é citado', () => {
    const { fields } = parseIndex([LAYOUT_PAGE, DESCRIPTION_PAGE]);

    const g029 = fields.find((f) => f.code === 'G029');
    assert.equal(g029?.page, 2, 'a definição está na página 2; a página 1 apenas cita');
    assert.equal(g029?.name, 'Forma de Lançamento');
  });

  it('aceita o código sozinho na linha, com o nome na linha seguinte', () => {
    // O layout de duas colunas do PDF quebra a célula do código separada da do nome em parte das
    // páginas. Casar só o formato inline perdia 23 dos 115 campos, G007 e G009 entre eles.
    const { fields } = parseIndex(['G009\nDígito Verificador da Agência\n']);

    assert.equal(fields[0]?.code, 'G009');
    assert.equal(fields[0]?.name, 'Dígito Verificador da Agência');
  });

  it('registra a primeira definição, não a última', () => {
    // O campo reaparece nas seções de cada rota. A âncora útil é a da descrição normativa.
    const { fields } = parseIndex([DESCRIPTION_PAGE, DESCRIPTION_PAGE]);

    assert.equal(fields.filter((f) => f.code === 'G029').length, 1);
    assert.equal(fields[0]?.page, 1);
  });
});

describe('cnab-manual-index — ocorrências G059', () => {
  it('NÃO captura código de fora da faixa do G059', () => {
    // O caso histórico: `'01'` existe nas duas tabelas com significados opostos, e só o da G059
    // responde por que uma remessa de PAGAMENTO foi recusada.
    const pages = [COLLECTION_PAGE, G059_PAGE, G060_PAGE];
    const { occurrences } = parseIndex(pages);

    const first = occurrences.find((o) => o.code === '01');
    assert.equal(first?.name, 'Insuficiência de Fundos - Débito Não Efetuado');
    assert.equal(first?.page, 2, 'veio da página do G059, não da tabela de cobrança');
    assert.ok(
      !occurrences.some((o) => o.name.includes('Entrada de Títulos')),
      'nenhuma ocorrência da tabela de cobrança atravessou a faixa',
    );
  });

  it('para no próximo campo definido depois do G059', () => {
    const beyond = "\n'ZZ' = Ocorrência de outra seção\n";
    const { occurrences } = parseIndex([G059_PAGE, G060_PAGE, beyond]);

    assert.ok(!occurrences.some((o) => o.code === 'ZZ'));
  });

  it('sem G059 no documento, devolve lista vazia em vez de varrer tudo', () => {
    assert.deepEqual(parseOccurrences([COLLECTION_PAGE], []), []);
  });
});

describe('cnab-manual-index — o índice renderizado', () => {
  it('declara a edição do manual e manda abrir o PDF', () => {
    const out = renderIndex(parseIndex([DESCRIPTION_PAGE, G059_PAGE, G060_PAGE]), 'manual.pdf');

    assert.match(out, /Versão 08/, 'a edição errada foi a causa do defeito original');
    assert.match(out, /não reproduz o manual/, 'restrição de redistribuição — só índice');
    assert.match(out, /\| `G029` \| Forma de Lançamento \| 1 \|/);
  });
});

describe('cnab-manual-index — fonte ausente', () => {
  // `handbook/guidelines/` é gitignored, então CI, clone novo e `git archive` não têm o PDF.
  it('em --check, a ausência não é falha', () => {
    const t = { write: process.stderr.write };
    process.stderr.write = () => true;
    try {
      assert.equal(handleMissingManual('/ausente.pdf', true), 0);
    } finally {
      process.stderr.write = t.write;
    }
  });

  it('na regeneração, a ausência é falha — o script não afirma ter feito o que não fez', () => {
    // Exit code é lido por `&&`, `set -e` e CI. Um 0 aqui deixaria a cadeia seguir sobre um índice
    // que continua na edição antiga.
    const t = { write: process.stderr.write };
    process.stderr.write = () => true;
    try {
      assert.equal(handleMissingManual('/ausente.pdf', false), 1);
    } finally {
      process.stderr.write = t.write;
    }
  });
});
