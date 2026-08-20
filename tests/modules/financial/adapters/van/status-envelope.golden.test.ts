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

// Bloco de PROVENIÊNCIA da recepção, `omitempty` no produtor — os quatro casos de remessa seguem
// byte a byte idênticos e o parser deles não é tocado.
//
// ⚠️ `duplicado` e `duplicadoDe` também são `omitempty`: quando falsos vêm AUSENTES, não `false`.
// Quem escrever `recepcao.duplicado === false` erra o caso comum.
type GoldenReception = Readonly<{
  sha256: string;
  chave: string;
  // Houve linha, no log DESTE ciclo, correspondente a este arquivo. A semântica mudou em
  // van-agent#12: só conta linha cujo carimbo cai na janela da execução — antes, uma linha de ciclo
  // anterior com o mesmo nome correlacionava indevidamente.
  correlacionado: boolean;
  // Se o log deste ciclo pôde ser lido. Existe porque `correlacionado: false` colapsava dois casos
  // opostos: "li e não tinha" (suspeito) e "não consegui ler" (defeito de configuração do agente).
  logDoCicloLido: boolean;
  duplicado?: boolean;
  duplicadoDe?: string;
}>;

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
    recepcao?: GoldenReception;
  }>;
}>;

type GoldenFile = Readonly<{ descricao: string; fonte: string; casos: readonly GoldenCase[] }>;

type Provenance = Readonly<{ origem: string; caminho: string; ref: string; sha256: string }>;

const GOLDEN_FILE = 'status-envelope.golden.json';

const readLocal = (name: string): string => readFileSync(join(import.meta.dirname, name), 'utf8');

// O RAW fica guardado porque a proveniência confere o hash do arquivo como ele está no disco —
// reserializar o objeto parseado compararia outra coisa.
const goldenRaw = readLocal(GOLDEN_FILE);
const golden = JSON.parse(goldenRaw) as GoldenFile;
const provenance = JSON.parse(readLocal('status-envelope.golden.provenance.json')) as Provenance;

describe('status/ — o contrato com o van-agent (golden compartilhado)', () => {
  // Se o golden encolher, os casos somem sem que nenhuma asserção falhe — a suíte ficaria verde
  // cobrindo menos. A contagem é o piso; casos novos são bem-vindos, remoção precisa ser deliberada.
  it('carrega os casos do contrato', () => {
    assert.ok(
      golden.casos.length >= 8,
      `o golden tem ${golden.casos.length} caso(s), esperava ao menos 8`,
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

// O bloco de PROVENIÊNCIA da recepção — o que a #753 vai consumir para decidir o que entra e o que
// vai para quarentena. Nada aqui é lido por `parseStatus` hoje: são asserções sobre o CONTRATO, para
// que uma mudança do outro lado apareça como vermelho nomeado antes de o consumidor existir.
//
// A razão de cobrar agora, e não junto com o consumidor: este contrato já mudou duas vezes em dois
// dias, e nas duas o campo mudou de SIGNIFICADO sem mudar de nome. Cobrar o formato pega renomeação;
// só cobrar as combinações pega mudança de sentido.
describe('status/ — proveniência da recepção (#753)', () => {
  const recepcoes = golden.casos.filter((c) => c.tipo === 'reception');

  it('todo caso de recepção declara o bloco de proveniência', () => {
    assert.ok(recepcoes.length > 0, 'o golden precisa cobrir recepção');
    for (const caso of recepcoes) {
      const r = caso.envelope.recepcao;
      assert.ok(r !== undefined, `"${caso.nome}" veio sem bloco de proveniência`);
      // O hash é do CONTEÚDO — é o que permite decidir sem reabrir o objeto, e é a chave de
      // idempotência do agente. Hex minúsculo de 64 posições.
      assert.match(r.sha256, /^[0-9a-f]{64}$/, caso.nome);
      // A chave aponta para onde o objeto foi depositado. Se um dia deixar de ser o prefixo de
      // retorno, o consumidor estaria lendo de outro lugar sem saber.
      assert.ok(r.chave.startsWith('retorno/'), `"${caso.nome}" depositou fora de retorno/`);
      assert.equal(typeof r.correlacionado, 'boolean', caso.nome);
      assert.equal(typeof r.logDoCicloLido, 'boolean', caso.nome);
    }
  });

  // A PROPRIEDADE central, e a razão de o golden ter 8 casos e não 7: `correlacionado: false`
  // significava duas coisas opostas, e o CA5 da #753 só vale sobre UMA delas.
  //
  //   correlacionado=false + logDoCicloLido=true  ⇒ li o log e não tinha a linha ⇒ QUARENTENA
  //   correlacionado=false + logDoCicloLido=false ⇒ não li o log ⇒ defeito de CONFIGURAÇÃO
  //
  // Colapsar as duas quarentenaria todo retorno do primeiro ciclo de cada dia — o log é diário, e
  // antes de o cliente escrever o de hoje a busca casa o de ontem. Se este teste quebrar porque uma
  // combinação sumiu, o CA5 voltou a ser inseguro.
  it('as três combinações de proveniência existem e são distintas', () => {
    const combinacoes = new Set(
      recepcoes.map(
        (c) =>
          `${String(c.envelope.recepcao?.correlacionado)}/${String(c.envelope.recepcao?.logDoCicloLido)}`,
      ),
    );

    assert.ok(combinacoes.has('true/true'), 'falta o caminho feliz (correlacionado, log lido)');
    assert.ok(combinacoes.has('false/true'), 'falta o caso do CA5 — suspeito genuíno');
    assert.ok(combinacoes.has('false/false'), 'falta o caso "não sei" — defeito de configuração');
  });

  // `logDoCicloLido: false` com `correlacionado: true` seria o agente afirmando ter correlacionado
  // sem ter lido o log — contradição que tornaria o campo inútil para decidir qualquer coisa.
  it('nunca afirma correlação sem ter lido o log do ciclo', () => {
    for (const caso of recepcoes) {
      const r = caso.envelope.recepcao;
      if (r?.correlacionado === true) {
        assert.equal(r.logDoCicloLido, true, `"${caso.nome}" correlacionou sem ler o log`);
      }
    }
  });

  // As duas não-correlações mandam o operador a lugares DIFERENTES: uma manda conferir o arquivo,
  // a outra a instalação. Redação idêntica apagaria a distinção justamente para quem age sobre ela.
  it('as duas não-correlações têm redações distintas — as ações divergem', () => {
    const naoCorrelacionadas = recepcoes.filter(
      (c) => c.envelope.recepcao?.correlacionado === false,
    );
    const detalhes = new Set(naoCorrelacionadas.map((c) => c.envelope.detalhe));

    assert.equal(naoCorrelacionadas.length, 2, 'esperava as duas não-correlações');
    assert.equal(
      detalhes.size,
      2,
      'as duas não-correlações compartilham redação — a distinção sumiu',
    );
  });

  // `omitempty`: quando falso, o campo vem AUSENTE, não `false`. O consumidor precisa tratar
  // `undefined` e `false` no mesmo ramo, e este teste existe para que o caso ausente esteja no
  // golden — sem ele, alguém escreveria `=== false` e passaria.
  it('duplicado vem AUSENTE quando falso, nunca `false`', () => {
    for (const caso of recepcoes) {
      const r = caso.envelope.recepcao;
      assert.ok(
        r?.duplicado !== false,
        `"${caso.nome}" trouxe duplicado:false — devia ser ausente`,
      );
    }
    assert.ok(
      recepcoes.some((c) => c.envelope.recepcao?.duplicado === undefined),
      'o golden precisa cobrir a recepção NÃO duplicada, com o campo ausente',
    );
  });

  // O caso mais perigoso da #753: `duplicado: true` significa que o objeto em `chave` é o ANTERIOR,
  // e que NADA foi depositado nesta execução. Processá-lo como recepção nova processa o mesmo
  // retorno duas vezes. O `exitCode: null` é a evidência de que o cliente não foi acionado.
  it('a recepção duplicada aponta o objeto anterior e não aciona o cliente', () => {
    const duplicada = recepcoes.find((c) => c.envelope.recepcao?.duplicado === true);
    assert.ok(duplicada, 'o golden precisa cobrir a recepção duplicada');
    assert.equal(duplicada.envelope.exitCode, null, 'duplicado sem execução tem exitCode null');
    assert.ok(
      duplicada.envelope.recepcao?.duplicadoDe !== undefined,
      'duplicado precisa dizer de qual recepção anterior',
    );
  });

  // Recepção fala do RETORNO, nunca de remessa: nenhuma remessa muda de estado porque um arquivo
  // chegou do banco. É o que `confirmRemittance` já assume ao mandar `reception` para `ignored`.
  it('nenhuma recepção conta como transmissão', () => {
    for (const caso of recepcoes) {
      assert.equal(caso.contaComoTransmissao, false, caso.nome);
      const parsed = parseStatus(caso.chave, JSON.stringify(caso.envelope));
      assert.ok(isOk(parsed));
      assert.equal(wasTransmitted(parsed.value), false, caso.nome);
    }
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
 * nome (van-agent, travado por três camadas no PR #15 dele). Ou seja: a razão pela qual o nosso
 * comportamento está correto mora no repositório DELE.
 *
 * Decisão do Gabriel: não trocar a ordenação — com a irreversibilidade atual, ordenar por relógio
 * faria o desfecho MAIS ANTIGO vencer, e o que se quereria ("transmitido prevalece") é mudança na
 * regra do agregado, não na ordenação. Em vez disso, **travar a premissa aqui**.
 *
 * ⚠️ Este teste afirma a PROPRIEDADE e não pergunta ao golden qual é a chave certa — um teste que
 * pergunta ao produtor qual é a resposta certa acompanha a mudança dele e não protege o consumidor.
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
