/**
 * BANK-FIXTURE-MASKING — o convênio não entra versionado, nem como fixture, nem em comentário.
 *
 * Por que existe, e a data importa: em 19/08/2026 o número de convênio REAL estava neste
 * repositório como fixture de teste — 16 ocorrências em 5 arquivos, num repo PÚBLICO. O convênio
 * identifica o contrato junto ao banco ([ADR-0061](../../handbook/architecture/adr/0061-van-bucket-contract-supersedes-0060-pendencies.md)),
 * e a higiene do épico #756 já proibia dado real de cadastro em arquivo versionado.
 *
 * A proibição existia; o que faltava era ela estar onde o harness carrega. O `van-agent` — mesmo
 * time, mesmo contrato — nunca teve o problema, e não por cuidado: o CLAUDE.md de lá LISTA "número
 * de convênio" entre o que não entra em código, teste ou commit, e carrega no início de toda
 * sessão. A diferença entre os dois repositórios foi a regra estar escrita, não a atenção de quem
 * escreveu a fixture.
 *
 * ⚠️ VARRE COMENTÁRIO DE PROPÓSITO — `filesContaining`, não `filesUsing`. A ocorrência que originou
 * este gate estava num COMENTÁRIO explicando o formato ("o banco já nos envia arquivos como…"), e
 * um gate que ignorasse comentário passaria verde sobre exatamente o caso que o motivou.
 *
 * ⚠️ A MENSAGEM DE FALHA NÃO REPETE O VALOR. Este repositório é público e o CI dele também: um
 * assert que ecoasse o número transformaria o log de build no vazamento que o gate existe para
 * impedir. Aponta arquivo e linha; quem for corrigir abre o arquivo.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';

import { PROJECT_ROOT, walkFiles, readSource } from '../support/source-scan.ts';

/**
 * Os convênios RESERVADOS para fixture. A propriedade cobrada não é "usa a máscara X", é **o valor
 * ser obviamente sintético** — um humano lendo o arquivo precisa ver de imediato que aquilo não
 * veio de um contrato.
 *
 * - `000000` — o nosso, alinhado com o `van-agent`: os dois lados do contrato mascaram o mesmo
 *   campo do mesmo jeito. Divergir recria a assimetria que denunciou o problema.
 * - `999999` — o **de outro convênio**, e ele é necessário: a caixa é compartilhada por convênio
 *   (ADR-0061), então existe teste cuja premissa é "este arquivo não é nosso"
 *   (`confirm-remittance.test.ts:164`). Sem um segundo valor reservado, esse caso legítimo só
 *   poderia ser escrito com um número inventado — que é exatamente como um número real entra.
 */
const MASKS: readonly string[] = ['000000', '999999'];

/** Só para mensagem: a máscara a sugerir quando alguém erra. */
const DEFAULT_MASK = '000000';

/** `PAG_` seguido de quatro ou mais dígitos: a forma do nome de arquivo da VAN. */
const CONVENIO_IN_FILE_NAME = /PAG_(\d{4,})/g;

type Hit = Readonly<{ file: string; line: number }>;

/** Ocorrências com dígitos fora dos reservados. Devolve posição, nunca o valor. */
const unmaskedHits = (relPath: string): readonly Hit[] => {
  const out: Hit[] = [];
  readSource(relPath)
    .split('\n')
    .forEach((line, i) => {
      for (const m of line.matchAll(CONVENIO_IN_FILE_NAME)) {
        if (m[1] !== undefined && !MASKS.includes(m[1])) out.push({ file: relPath, line: i + 1 });
      }
    });
  return out;
};

const SCANNED = ['src', 'tests'] as const;

/**
 * O próprio gate fica de fora: ele precisa escrever um convênio fora da máscara para PROVAR que o
 * detector morde, e se auto-varresse reprovaria a si mesmo. É a armadilha nº 6 catalogada em
 * `source-scan.ts:9-14` — o arquivo que documenta a norma sendo acusado por ela.
 */
const SELF = 'tests/cleanup/bank-fixture-masking.test.ts';

const scan = (): readonly Hit[] =>
  SCANNED.flatMap((dir) =>
    walkFiles(join(PROJECT_ROOT, dir), { ext: '.ts' })
      .filter((f) => f !== SELF)
      .flatMap((f) => unmaskedHits(f)),
  );

describe('BANK-FIXTURE-MASKING — o convênio não entra versionado', () => {
  it('nenhum nome de arquivo da VAN carrega convênio fora da máscara', () => {
    const hits = scan();
    assert.deepEqual(
      hits.map((h) => `${h.file}:${h.line}`),
      [],
      'Convênio fora dos valores reservados, em arquivo versionado.\n' +
        `Use \`PAG_${DEFAULT_MASK}\` — a mesma máscara do van-agent — ou \`PAG_999999\` quando o caso\n` +
        'for "arquivo de OUTRO convênio". O número real identifica o contrato junto ao banco, e\n' +
        'este repositório é público. Locais (valor omitido de propósito):\n' +
        hits.map((h) => `  ${h.file}:${h.line}`).join('\n'),
    );
  });

  // Guarda contra verde por vacuidade: se o padrão parar de casar qualquer coisa — refactor no nome
  // do arquivo, mudança de prefixo —, o gate passaria a aprovar tudo sem avisar.
  it('o padrão ainda encontra a forma que vigia (guarda contra verde vazio)', () => {
    assert.ok(
      CONVENIO_IN_FILE_NAME.test(`PAG_${DEFAULT_MASK}.11082026142605_000007.REM`),
      'o padrão não casa mais a forma do nome de arquivo da VAN',
    );
    CONVENIO_IN_FILE_NAME.lastIndex = 0;
  });

  // O detector precisa REPROVAR o que não é reservado — senão o verde acima não significa nada.
  it('o detector acusa um convênio fora dos reservados', () => {
    const sintetico = 'PAG_123456.11082026142605_000007.REM';
    const casou = [...sintetico.matchAll(CONVENIO_IN_FILE_NAME)].some(
      (m) => m[1] !== undefined && !MASKS.includes(m[1]),
    );
    assert.ok(casou, 'o detector deixou passar um convênio fora dos reservados');
  });

  // Os DOIS reservados precisam passar — inclusive o de outro convênio, que tem caso de uso real.
  it('o detector aceita os dois valores reservados', () => {
    for (const mask of MASKS) {
      const mascarado = `PAG_${mask}.11082026142605_000007.REM`;
      const casou = [...mascarado.matchAll(CONVENIO_IN_FILE_NAME)].some(
        (m) => m[1] !== undefined && !MASKS.includes(m[1]),
      );
      assert.ok(!casou, `o detector reprovou o valor reservado ${mask}`);
    }
  });
});
