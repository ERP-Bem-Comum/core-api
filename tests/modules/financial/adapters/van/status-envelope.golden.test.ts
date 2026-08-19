// A metade CONSUMIDORA do contrato do `status/`. A produtora vive noutro repositório — o
// `van-agent` (issue #735), que roda na máquina Windows e publica estes envelopes.
//
// Os dois lados são cobrados contra o MESMO arquivo: `status-envelope.golden.json` aqui é cópia
// literal de `van-agent/testdata/status-envelope.golden.json`, que lá é GERADO pelo código do
// produtor (`go test ./internal/envelope -update`), nunca escrito à mão.
//
// Por que isto existe: `status-envelope.ts` foi escrito contra um contrato acordado por chamado, e
// até agora nada verificava que o produtor produz o que este parser aceita. A divergência mais cara
// deste componente é silenciosa — o agente publicaria um desfecho que o backend descarta, e a
// remessa ficaria em estado desconhecido sem ninguém errar visivelmente.
//
// ⚠️ Quando este teste quebrar, a pergunta NÃO é "como faço passar". É qual das duas metades mudou,
// e se a outra acompanhou. Editar o golden para calar o vermelho apaga exatamente o sinal.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { isOk } from '#src/shared/index.ts';
import {
  parseStatus,
  wasTransmitted,
} from '#src/modules/financial/adapters/van/status-envelope.ts';

type GoldenCase = Readonly<{
  nome: string;
  tipo: 'remittance' | 'duplicate' | 'reception';
  contaComoTransmissao: boolean;
  chave: string;
  envelope: Readonly<{
    arquivo: string;
    executadoEm: string;
    situacao: string;
    detalhe: string;
    exitCode: number | null;
    logTransferencia: readonly string[];
    // Só em envelope de recepção (PR van-agent#12). `omitempty` no produtor: os quatro casos de
    // remessa continuam byte a byte idênticos, e a adição fica contida no caso que precisava dela.
    recepcao?: Readonly<{
      sha256: string;
      chave: string;
      correlacionado: boolean;
      // Separa "não sei" de "sei que não" — e as duas pedem AÇÕES OPOSTAS na quarentena (#753).
      logDoCicloLido: boolean;
      duplicado?: boolean;
      duplicadoDe?: string;
    }>;
  }>;
}>;

type GoldenFile = Readonly<{ descricao: string; fonte: string; casos: readonly GoldenCase[] }>;

type Provenance = Readonly<{ origem: string; caminho: string; ref: string; sha256: string }>;

const GOLDEN_FILE = 'status-envelope.golden.json';

const readLocal = (name: string): string => readFileSync(join(import.meta.dirname, name), 'utf8');

const goldenRaw = readLocal(GOLDEN_FILE);
const golden = JSON.parse(goldenRaw) as GoldenFile;
const provenance = JSON.parse(readLocal('status-envelope.golden.provenance.json')) as Provenance;

describe('status/ — o contrato com o van-agent (golden compartilhado)', () => {
  // Se o golden encolher, os casos somem sem que nenhuma asserção falhe — a suíte ficaria verde
  // cobrindo menos. A contagem é o piso; casos novos são bem-vindos, remoção precisa ser deliberada.
  it('carrega os casos do contrato', () => {
    assert.ok(
      golden.casos.length >= 5,
      `o golden tem ${golden.casos.length} caso(s), esperava ao menos 5`,
    );
  });

  for (const caso of golden.casos) {
    describe(caso.nome, () => {
      const content = JSON.stringify(caso.envelope);

      it('é aceito pelo parser', () => {
        const parsed = parseStatus(caso.chave, content);
        assert.ok(
          isOk(parsed),
          `o parser recusou um envelope que o agente produz: ${JSON.stringify(parsed)}`,
        );
      });

      it('é classificado pelo tipo que o agente declara', () => {
        const parsed = parseStatus(caso.chave, content);
        assert.ok(isOk(parsed));
        assert.equal(parsed.value.kind, caso.tipo);
      });

      it('preserva os campos que o operador vê', () => {
        const parsed = parseStatus(caso.chave, content);
        assert.ok(isOk(parsed));
        assert.equal(parsed.value.fileName, caso.envelope.arquivo);
        assert.equal(parsed.value.situation, caso.envelope.situacao);
        assert.equal(parsed.value.detail, caso.envelope.detalhe);
        assert.equal(parsed.value.exitCode, caso.envelope.exitCode);
      });

      // A regra que decide se um pagamento é dado por enviado. `duplicate` é o caso perigoso: ele
      // declara `situacao: "transmitido"` e mesmo assim NÃO conta — significa que o agente
      // reconheceu o nome e não acionou o cliente, então nada saiu nesta execução.
      it('decide corretamente se conta como transmissão', () => {
        const parsed = parseStatus(caso.chave, content);
        assert.ok(isOk(parsed));
        assert.equal(
          wasTransmitted(parsed.value),
          caso.contaComoTransmissao,
          `wasTransmitted divergiu para "${caso.nome}" (tipo ${caso.tipo}, situação ${caso.envelope.situacao})`,
        );
      });
    });
  }
});

describe('status/ — os invariantes do produtor que quebram o consumidor em silêncio', () => {
  const first = golden.casos[0]!;

  // Um slice nil em Go serializa como `null`, e o parser exige `Array.isArray`. É a diferença
  // entre um ciclo sem log — normal — e um envelope recusado.
  it('todo caso do golden traz logTransferencia como array', () => {
    for (const caso of golden.casos) {
      assert.ok(
        Array.isArray(caso.envelope.logTransferencia),
        `"${caso.nome}" trouxe logTransferencia que não é array`,
      );
    }
  });

  it('recusa o envelope se logTransferencia vier null', () => {
    const quebrado = JSON.stringify({ ...first.envelope, logTransferencia: null });
    const parsed = parseStatus(first.chave, quebrado);
    assert.ok(!isOk(parsed), 'logTransferencia null precisa ser recusado, não absorvido');
  });

  // `exitCode: null` é o caso do duplicado: o cliente NÃO foi executado. Trocar por 0 diria
  // "executou e deu certo" — a conclusão oposta.
  it('aceita exitCode null, que é o do duplicado', () => {
    const duplicado = golden.casos.find((c) => c.tipo === 'duplicate');
    assert.ok(duplicado, 'o golden precisa cobrir o caso de duplicado');
    assert.equal(duplicado.envelope.exitCode, null);

    const parsed = parseStatus(duplicado.chave, JSON.stringify(duplicado.envelope));
    assert.ok(isOk(parsed));
    assert.equal(parsed.value.exitCode, null);
  });

  // O agente grava UTF-8 sem BOM, mas o parser tolera o BOM de propósito: se algo no caminho
  // reencodar o objeto, falhar a leitura deixaria a remessa em estado desconhecido por um
  // caractere invisível.
  it('tolera BOM, mesmo o agente não gravando com ele', () => {
    const comBom = '﻿' + JSON.stringify(first.envelope);
    const parsed = parseStatus(first.chave, comBom);
    assert.ok(isOk(parsed));
  });

  // Situação nova exige decisão nossa. Silenciá-la como "falha" esconderia uma mudança de contrato
  // do outro lado — que é justamente o que este arquivo existe para tornar visível.
  it('recusa situação fora do vocabulário em vez de adivinhar', () => {
    const inventada = JSON.stringify({ ...first.envelope, situacao: 'quase-transmitido' });
    const parsed = parseStatus(first.chave, inventada);
    assert.ok(!isOk(parsed), 'situação desconhecida precisa ser recusada');
  });
});

// O golden é CÓPIA, e cópia sem proveniência é palpite com aparência de contrato. O cabeçalho deste
// arquivo proíbe editar o golden para calar um vermelho; sem gate, a proibição é só um comentário.
describe('status/ — a cópia do golden é verificável', () => {
  it('confere com o sha256 declarado na proveniência', () => {
    const atual = createHash('sha256').update(goldenRaw).digest('hex');
    assert.equal(
      atual,
      provenance.sha256,
      `${GOLDEN_FILE} não confere com a proveniência (origem ${provenance.origem}@${provenance.ref.slice(0, 7)}).\n` +
        'Se você EDITOU o golden: não faça isso — ele é gerado no produtor.\n' +
        'Se você COPIOU uma versão nova: atualize `ref` e `sha256` no arquivo de proveniência, no mesmo commit.',
    );
  });
});

/**
 * A PREMISSA DO CONSUMIDOR — uma chave de remessa por arquivo.
 *
 * Medido em 19/08/2026 contra o worker real: quando existem DOIS envelopes de tipo `remittance` para
 * o mesmo arquivo, vence o **primeiro na ordem lexicográfica da chave**; o `executadoEm` não é
 * consultado, e o agregado recusa a segunda mudança em qualquer direção — inclusive promoção de
 * falha para sucesso. Um envelope de sucesso pode, nesse cenário, ficar de fora em silêncio.
 *
 * Isso é inofensivo hoje **porque o produtor não gera duas chaves**: `envelope.Key` é função só do
 * nome (van-agent, travado por três camadas no PR #15 dele, `main@5b1d135`). Ou seja: a razão pela
 * qual o nosso comportamento está correto mora no repositório DELE.
 *
 * Decisão do Gabriel em 20/08/2026: não trocar a ordenação — com a irreversibilidade atual, ordenar
 * por relógio faria o desfecho MAIS ANTIGO vencer, e o que se quereria ("transmitido prevalece") é
 * mudança na regra do agregado, não na ordenação. Em vez disso, **travar a premissa aqui**.
 *
 * ⚠️ Este teste afirma a PROPRIEDADE e não pergunta ao golden qual é a chave certa. A distinção é do
 * van-agent, que encontrou no próprio repositório um teste que montava a expectativa chamando o
 * produtor — e que por isso acompanharia a mudança e continuaria verde: "um teste que pergunta ao
 * produtor qual é a resposta certa não protege o consumidor".
 */
/** Arquivos com mais de uma chave de remessa. Função pura — testável sem tocar o golden. */
const arquivosComChaveAmbigua = (
  casos: readonly Pick<GoldenCase, 'tipo' | 'chave' | 'envelope'>[],
): readonly string[] => {
  const chavesPorArquivo = new Map<string, Set<string>>();
  for (const caso of casos.filter((c) => c.tipo === 'remittance')) {
    const atual = chavesPorArquivo.get(caso.envelope.arquivo) ?? new Set<string>();
    atual.add(caso.chave);
    chavesPorArquivo.set(caso.envelope.arquivo, atual);
  }
  return [...chavesPorArquivo]
    .filter(([, chaves]) => chaves.size > 1)
    .map(([arquivo, chaves]) => `${arquivo}: ${[...chaves].sort().join(' | ')}`);
};

describe('status/ — a premissa que sustenta a ordenação do desfecho', () => {
  it('o golden nunca traz duas chaves de remessa para o mesmo arquivo', () => {
    const comMaisDeUma = arquivosComChaveAmbigua(golden.casos);

    assert.deepEqual(
      comMaisDeUma,
      [],
      'O produtor passou a publicar MAIS DE UMA chave de remessa para o mesmo arquivo.\n' +
        'A ordenação do desfecho aqui é lexicográfica pela chave e o `executadoEm` não é consultado —\n' +
        'com duas chaves, qual desfecho vence passa a depender do NOME do objeto, por acidente.\n' +
        'Isto não se resolve atualizando o golden: exige decidir a precedência (provavelmente\n' +
        '"transmitido prevalece") e mudar a regra do agregado junto. Falar com o van-agent antes.\n' +
        comMaisDeUma.map((l) => `  ${l}`).join('\n'),
    );
  });

  // Guarda contra verde por vacuidade: sem nenhum caso de remessa, o agrupamento acima aprova tudo.
  it('há casos de remessa a agrupar (guarda contra verde vazio)', () => {
    assert.ok(
      golden.casos.some((c) => c.tipo === 'remittance'),
      'o golden precisa cobrir remessa — sem isso a premissa acima não verifica nada',
    );
  });

  // O detector precisa MORDER, e não dá para provar isso adulterando o golden: o gate de
  // proveniência recusaria a edição antes. Por isso o detector é função pura, provocada aqui com
  // dados sintéticos — o cenário exato que o van-agent garante não produzir.
  const envelopeDe = (arquivo: string) => ({
    arquivo,
    executadoEm: '2026-08-19T12:00:00Z',
    situacao: 'transmitido',
    detalhe: '',
    exitCode: 0,
    logTransferencia: [] as readonly string[],
  });

  it('o detector acusa duas chaves de remessa para o mesmo arquivo', () => {
    const sintetico = [
      { tipo: 'remittance' as const, chave: 'status/A.REM.json', envelope: envelopeDe('X.REM') },
      { tipo: 'remittance' as const, chave: 'status/Z.REM.json', envelope: envelopeDe('X.REM') },
    ];
    assert.deepEqual(arquivosComChaveAmbigua(sintetico), [
      'X.REM: status/A.REM.json | status/Z.REM.json',
    ]);
  });

  // E precisa APROVAR o que é legítimo: duplicado e recepção têm chave própria de propósito, e
  // acusá-los transformaria o contrato correto em vermelho permanente.
  it('o detector ignora duplicado e recepção, que têm chave própria por desenho', () => {
    const sintetico = [
      { tipo: 'remittance' as const, chave: 'status/X.REM.json', envelope: envelopeDe('X.REM') },
      {
        tipo: 'duplicate' as const,
        chave: 'status/X.REM.duplicado-20260819T120000Z.json',
        envelope: envelopeDe('X.REM'),
      },
      {
        tipo: 'reception' as const,
        chave: 'status/recepcao-20260819T120000Z-X.RET.json',
        envelope: envelopeDe('X.REM'),
      },
    ];
    assert.deepEqual(arquivosComChaveAmbigua(sintetico), []);
  });
});

// As quatro combinações de `correlacionado` × `logDoCicloLido` não são detalhe do produtor: elas
// decidem ações OPOSTAS na quarentena do retorno (#753). Asseguramos a PROPRIEDADE — que o golden
// cubra cada decisão possível —, nunca a contagem de casos, que quebraria a cada caso novo legítimo.
describe('status/ — a recepção cobre as decisões que a quarentena precisa tomar', () => {
  const recepcoes = golden.casos.filter((c) => c.tipo === 'reception');

  const combinacao = (c: GoldenCase): string =>
    `${String(c.envelope.recepcao?.correlacionado)}/${String(c.envelope.recepcao?.logDoCicloLido)}`;

  it('todo envelope de recepção carrega o objeto `recepcao`', () => {
    assert.ok(recepcoes.length > 0, 'o golden precisa cobrir recepção');
    for (const caso of recepcoes) {
      assert.ok(caso.envelope.recepcao, `"${caso.nome}" é recepção e não trouxe o objeto recepcao`);
    }
  });

  it('cobre "correlacionado, com log lido" — o caso normal', () => {
    assert.ok(recepcoes.some((c) => combinacao(c) === 'true/true'));
  });

  // Log lido e a linha não estava lá: a origem não foi registrada. É o ÚNICO que vai para quarentena.
  it('cobre "não correlacionado, com log lido" — o único que quarentena', () => {
    assert.ok(recepcoes.some((c) => combinacao(c) === 'false/true'));
  });

  // Log não lido: o agente NÃO SABE. É sinal sobre a configuração do glob, não sobre o arquivo —
  // quarentenar aqui represaria pagamento confirmado por causa de log mal configurado. E o gatilho é
  // banal: o log é diário, então no primeiro ciclo do dia o padrão casa o log de ontem.
  it('cobre "sem o log do ciclo" — processa e alarma, não quarentena', () => {
    assert.ok(recepcoes.some((c) => combinacao(c) === 'false/false'));
  });

  // Correlacionar exige ter lido o log. A combinação inversa é impossível por construção, e se
  // aparecer significa que a semântica mudou do outro lado sem ninguém avisar.
  it('nunca produz "correlacionado sem ter lido o log"', () => {
    const impossivel = recepcoes.filter((c) => combinacao(c) === 'true/false');
    assert.deepEqual(
      impossivel.map((c) => c.nome),
      [],
      'correlacionado=true com logDoCicloLido=false não pode existir — o agente não pode casar linha de um log que não leu',
    );
  });
});
