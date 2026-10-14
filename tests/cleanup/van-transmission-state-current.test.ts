/**
 * VAN-TRANSMISSION-STATE — nenhum artefato normativo do CNAB volta a negar que a transmissão ocorreu.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Norma: [ADR-0075](../../handbook/architecture/adr/0075-van-transmission-exercised-supersedes-0061-pilot-pending.md).
 * TED, crédito em conta e boleto estão em produção desde 2026-09-06; o Pix entrou depois, liberado
 * pelo próprio banco.
 *
 * O caso que originou o gate: quatro artefatos afirmavam "não há ambiente de homologação para
 * remessa de pagamento" e "nunca transmita para 'testar'". Era verdade em 2026-08-10, quando o
 * ADR-0061 o registrou. Deixou de ser em 2026-09-06, e o texto sobreviveu CINCO SEMANAS ao primeiro
 * pagamento real — porque nada no repositório liga "marco atingido" ao documento que o descrevia
 * como pendente.
 *
 * Por que isso é defeito e não formalidade: a rule entra em contexto por `path_glob_match` em toda
 * sessão que toca o módulo, e o agente homônimo é invocado proativamente para todo trabalho de CNAB.
 * Os dois têm peso de ordem, não de achado. Com o texto vencido, um agente recusou executar ou
 * planejar transmissão e argumentou contra a P.O. citando o repositório — duas vezes, em 06/09 e
 * 14/10/2026 (#993).
 *
 * ⚠️ POR QUE QUATRO ALVOS, E NÃO UM. A primeira versão deste gate varria só `rules/cnab.md`, que era
 * o arquivo consertado — então ficava verde enquanto o agente, o inspetor e o tradutor seguiam com a
 * frase intacta. Régua certa não se propaga sozinha: existe num lugar e falta em N, e o grep que
 * fecha a questão é o que volta VAZIO sobre o acervo inteiro.
 *
 * ESCOPO — o gate verifica AUSÊNCIA, que é a forma robusta:
 *
 *   frase caducada reintroduzida por cópia    → ACUSA (qualquer capitalização)
 *   mesma afirmação reescrita com outras palavras → PASSA (limite declarado no ADR-0075)
 *
 * Verificar presença de identificador de ADR ou de data num `.md` seria o avesso disto, e é
 * proibido por `gate-asserts-property-not-prose.test.ts`: mede o vestígio, erra nas duas direções
 * (reescrever a doc sem tocar no sistema derruba o gate; quebrar o sistema sem tocar no texto o
 * deixa verde). A ausência sobrevive a qualquer reescrita — por isso é só ela que está aqui.
 *
 * Os ADRs ficam DE FORA dos alvos de propósito: o 0061 contém a frase como registro histórico
 * legítimo (ADR aceito não se edita) e o 0075 a cita para superseder. Varrê-los acusaria o acervo
 * por ser um acervo.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';

import { PROJECT_ROOT, readSource } from '../support/source-scan.ts';

/**
 * Os artefatos que um agente lê para DECIDIR o que pode fazer com transmissão. A rule carrega
 * sozinha por path; o agente é invocado proativamente; os dois `.ts` são o que se abre ao mexer no
 * emissor — e abrir um deles com `Read` é o que carrega a rule.
 */
const TARGETS: readonly string[] = [
  '.claude/rules/cnab.md',
  '.claude/agents/cnab240-bradesco.md',
  'src/modules/financial/adapters/cnab/remittance-inspector.ts',
  'src/modules/financial/adapters/cnab/bradesco-multipag-translator.ts',
];

/**
 * As afirmações que caducaram em 2026-09-06.
 *
 * `pattern` é case-insensitive porque a reversão provável é a cópia, e a frase aparece capitalizada
 * no início de período em todo lugar onde ela vive ou viveu. `specimen` é o texto literal de onde
 * ela estava, com a capitalização real — é o que o terceiro caso confronta, para que um padrão que
 * não casa nada seja distinguível de um repositório correto.
 */
const RETIRED_CLAIMS: readonly {
  readonly id: string;
  readonly pattern: RegExp;
  readonly specimen: string;
  readonly why: string;
}[] = [
  {
    id: 'sem-homologacao',
    pattern: /n[ãa]o h[áa] ambiente de homologa[çc][ãa]o/i,
    specimen:
      '- **Não há ambiente de homologação para remessa de pagamento.** A única conexão é produção,',
    why: 'a pendência 2 do ADR-0061 foi respondida por duas vias, ambas com teto declarado no ADR-0075 §3 — a simulação no x99 e o laudo escrito do banco',
  },
  {
    id: 'nunca-transmita',
    pattern: /nunca transmita/i,
    specimen:
      'Validar a **forma** é o mais longe que dá para ir sem mover dinheiro. Nunca transmita para "testar".',
    why: 'a proibição não caiu, mas a razão mudou: gravar no prefixo de saída É enfileirar pagamento (ADR-0060). Enunciá-la pela ausência de homologação faz o agente concluir que o piloto não aconteceu',
  },
  {
    id: 'nunca-exercitada',
    pattern: /transmiss[ãa]o nunca foi exercitada/i,
    specimen:
      '⚠️ **A transmissão nunca foi exercitada.** Todos os eventos até hoje são de **recepção**.',
    why: 'está em produção desde 2026-09-06 (TED, crédito em conta, boleto) e o Pix entrou depois, com arquivos lidos pelo banco do cedente',
  },
];

/** Os alvos que o git conhece. Gate estrutural pergunta ao git, nunca ao disco. */
const trackedTargets = (): readonly string[] => {
  const out = execFileSync('git', ['ls-files', '-z', '--', ...TARGETS], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });
  const tracked = new Set(out.split('\0').filter((p) => p.length > 0));
  return TARGETS.filter((t) => tracked.has(t));
};

describe('VAN-TRANSMISSION-STATE — o acervo normativo do CNAB reflete a transmissão em produção', () => {
  it('nenhum dos artefatos que decidem sobre transmissão afirma o que caducou', () => {
    const offenders = trackedTargets().flatMap((target) => {
      const content = readSource(target);
      return RETIRED_CLAIMS.filter(({ pattern }) => pattern.test(content)).map(
        ({ id, why }) => `${target} → [${id}] ${why}`,
      );
    });

    assert.deepEqual(
      offenders,
      [],
      'Artefato normativo voltou a afirmar o que deixou de ser verdade em 2026-09-06. Estes ' +
        'arquivos têm peso de ordem — a rule carrega por path, o agente é invocado proativamente ' +
        '— e com isto escrito o agente recusa operação legítima e argumenta contra a P.O. citando ' +
        `o repositório (#993). Ver ADR-0075:\n${offenders.join('\n')}`,
    );
  });

  it('todos os alvos declarados existem no git (guarda contra verde por alvo renomeado)', () => {
    assert.deepEqual(
      TARGETS.filter((t) => !trackedTargets().includes(t)),
      [],
      'Alvo declarado não está versionado neste caminho. Um gate que varre arquivo inexistente ' +
        'fica verde sem ter o que confrontar: se o arquivo foi movido ou dividido, atualize ' +
        '`TARGETS` — não apague a entrada.',
    );
  });

  it('cada detector reconhece a forma que vigia (contraprova invertida, uma por claim)', () => {
    const blind = RETIRED_CLAIMS.filter(({ pattern, specimen }) => !pattern.test(specimen)).map(
      ({ id }) => id,
    );

    assert.deepEqual(
      blind,
      [],
      'Detector que não reconhece o próprio exemplar. Cada `specimen` é cópia literal de onde a ' +
        'frase vive ou viveu, com a capitalização real — se o padrão não casa com ele, o primeiro ' +
        'caso passaria verde num repositório errado. É a diferença entre varredura vazia e acervo ' +
        `correto:\n${blind.join('\n')}`,
    );
  });
});
