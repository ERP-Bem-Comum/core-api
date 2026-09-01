/*
 * As referências do CNAB citam a página do manual, e a página tem de ser a DESTA edição.
 *
 * O defeito que este gate fecha (#924) viveu meses sem ninguém notar, porque nada nele é
 * sintaticamente errado: 28 citações apontavam para páginas de uma edição anterior do Multipag, e o
 * conteúdo das tabelas estava CERTO. Só o ponteiro para a fonte primária mentia — que é justamente a
 * única função que a referência tem. A issue #891 herdou "pág. 26" para o Segmento J-52, que na
 * Versão 08 é a 33; quem foi conferir abriu o Segmento C e não achou o registro.
 *
 * ⚠️ O deslocamento entre edições NÃO é constante — medido: +5 no header de arquivo, +6 no Segmento
 * C, +7 no J-52, +15 no J-52 para Pix. Corrigir por soma reintroduz o defeito noutra seção, e é por
 * isso que o gate compara contra o índice em vez de contra um offset.
 *
 * A régua é `00-indice-campos.md`, que é DERIVADO do PDF por `pnpm run cnab:index` e diz de si mesmo:
 * "Se uma citação não bater com a página daqui, ela veio de outra edição — reancorar, não ajustar".
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { PROJECT_ROOT } from '../support/source-scan.ts';

const REFS = join(PROJECT_ROOT, '.claude/skills/cnab240-bradesco/referencias');
const INDEX_FILE = '00-indice-campos.md';

/** `| \`G029\` | Forma de Lançamento | 100 |` → G029 → 100. Serve para campos E ocorrências G059. */
const readIndex = (): ReadonlyMap<string, number> => {
  const map = new Map<string, number>();
  for (const line of readFileSync(join(REFS, INDEX_FILE), 'utf8').split('\n')) {
    const m = /^\|\s*`([A-Z0-9]{2,4})`\s*\|[^|]*\|\s*(\d{1,3})\s*\|/.exec(line);
    if (m?.[1] !== undefined && m[2] !== undefined) map.set(m[1], Number(m[2]));
  }
  return map;
};

/*
 * 🔒 EXCEÇÕES JUSTIFICADAS — citações que apontam DE PROPÓSITO para outra página que não a da
 * descrição do campo. Cada uma nomeia o que a página contém, e é isso que as distingue de erro.
 *
 * ⚠️ Acrescentar entrada aqui exige abrir o PDF e confirmar. Uma exceção não conferida é
 * exatamente o defeito que este gate existe para pegar, com a assinatura de quem o aprovou.
 */
const JUSTIFIED = new Map<string, string>([
  // O `G021` é DEFINIDO na descrição de campos (p. 97), mas a regra que importa — "Pix em arquivo
  // separado dos demais serviços e modalidades" — está na tabela-delta do header, na p. 15.
  ['G021@15', 'tabela-delta do header de arquivo, onde vive a regra do arquivo separado'],
  // O `G029` é definido na p. 100 e a NOTA (2) — a que tabula forma → câmara — continua na p. 101.
  ['G029@101', 'nota (2) do G029, que continua na página seguinte à definição'],
  // A tabela `G059` COMEÇA na p. 106 e se estende por várias páginas; cada ocorrência tem a sua.
  ['G059@107', 'ocorrências AG/AM/AK/AQ, na segunda página da tabela G059'],
  ['G059@111', 'ocorrências HB/HC/HD, adiante na mesma tabela'],
  // O `P001` é definido na p. 132; a linha que o cita junto do G029 fala da nota deste último.
  ['P001@101', 'citado na linha da nota (2) do G029, cuja página é a 101'],
  // O `G009` é definido na p. 95; a linha o cita junto do G059, que tem página própria.
  ['G059@95', 'linha que cita G009 (p. 95) e menciona G059 de passagem'],
]);

const codeRe = /\b([A-Z]\d{3})\b/g;
const pageRe = /(?:p[áa]g\.|p\.)\s*(\d{1,3})/gi;

type Offender = Readonly<{
  where: string;
  code: string;
  cited: readonly number[];
  expected: number;
}>;

const offenders = (): readonly Offender[] => {
  const index = readIndex();
  const found: Offender[] = [];

  for (const file of readdirSync(REFS).filter((f) => f.endsWith('.md') && f !== INDEX_FILE)) {
    readFileSync(join(REFS, file), 'utf8')
      .split('\n')
      .forEach((line, i) => {
        const pages = [...line.matchAll(pageRe)].map((m) => Number(m[1]));
        if (pages.length === 0) return;

        for (const [, raw] of line.matchAll(codeRe)) {
          const code = raw ?? '';
          const expected = index.get(code);
          if (expected === undefined) continue;
          if (pages.includes(expected)) continue;
          if (pages.some((p) => JUSTIFIED.has(`${code}@${String(p)}`))) continue;

          found.push({ where: `${file}:${String(i + 1)}`, code, cited: pages, expected });
        }
      });
  }
  return found;
};

describe('CNAB-REFS — a página citada é a desta edição do manual (#924)', () => {
  it('o índice derivado do PDF foi lido, e não está vazio', () => {
    // Sem esta guarda, um `00-indice-campos.md` renomeado ou com formato alterado faria o gate
    // aprovar TUDO em silêncio — que é o modo de falha de todo teste que varre por comparação.
    const index = readIndex();
    assert.ok(index.size > 100, `índice com ${String(index.size)} entradas — esperado > 100`);
    assert.equal(index.get('G029'), 100, 'âncora conhecida: G029 na p. 100 da Versão 08');
    assert.equal(index.get('G059'), 106, 'âncora conhecida: G059 na p. 106 da Versão 08');
  });

  it('nenhuma referência cita página de outra edição', () => {
    const bad = offenders();
    assert.deepEqual(
      bad.map((o) => `${o.where} ${o.code}: citada ${o.cited.join('/')}, índice diz ${o.expected}`),
      [],
      'página de outra edição — reancorar contra o PDF, NUNCA ajustar por offset (o deslocamento varia por seção)',
    );
  });

  it('toda exceção justificada ainda é usada — allowlist morta anistia o arquivo inteiro', () => {
    // Uma entrada que não casa mais com nada deixou de proteger e passou a esconder: ela silencia a
    // combinação código+página para sempre, inclusive quando ela voltar a ser erro.
    const index = readIndex();
    const unused = [...JUSTIFIED.keys()].filter((key) => {
      const [code, page] = key.split('@');
      if (code === undefined || page === undefined) return true;
      if (!index.has(code)) return true;
      return !readdirSync(REFS)
        .filter((f) => f.endsWith('.md') && f !== INDEX_FILE)
        .some((f) =>
          readFileSync(join(REFS, f), 'utf8')
            .split('\n')
            .some(
              (l) =>
                new RegExp(`\\b${code}\\b`).test(l) &&
                new RegExp(`p[áa]g?\\.\\s*${page}\\b`).test(l),
            ),
        );
    });
    assert.deepEqual(unused, [], 'exceção que não casa com citação alguma — remover');
  });
});
