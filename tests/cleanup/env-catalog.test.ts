/**
 * ENV-CATALOG — toda variável de ambiente que existe está documentada, e toda documentada existe.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Norma: `src/deploy/env-catalog.ts` descreve cada variável uma vez; `src/deploy/workloads.ts`
 * declara quais unidades a exigem. Este gate fecha as duas direções, e é a condição para o
 * `.env.example` e a documentação poderem ser GERADOS em vez de escritos à mão (#1059).
 *
 * O caso que originou o gate: o `.env.example` não declarava `VAN_S3_REGION` nem `VAN_S3_BUCKET`,
 * então `cp .env.example .env && pnpm run dev` não subia nem o processo `http` — `buildVanStorage`
 * faz `throw` (`composition.ts:782`) e é chamado de forma eager na composição do `financial`
 * (`:949`). Nada acusava, porque nenhum gate olhava o template.
 *
 * ⚠️ O QUE FALTAVA, E É A RAZÃO DESTE ARQUIVO. O gate `workloads-manifest.test.ts` é de MÃO ÚNICA:
 * o caso dele "toda variável declarada aparece no fonte" cobre manifesto → código, e o "toda
 * leitura de ambiente vive em config" restringe ONDE se lê. Nenhum dos dois cobre a volta
 * **código → manifesto**: uma env nova, lida num `*-config.ts` legítimo e não declarada, passava
 * verde. É essa volta que o segundo caso aqui fecha.
 *
 * ESCOPO — três propriedades, nenhuma delas uma contagem:
 *
 *   variável no manifesto sem entrada no catálogo        → ACUSA
 *   variável lida em src/ sem entrada no catálogo        → ACUSA
 *   entrada no catálogo que nenhuma unidade declara      → ACUSA, salvo `notComposed` justificado
 *
 * A terceira é o que impede a isenção de virar porta aberta: não declarar é permitido **desde que
 * o motivo esteja escrito na própria entrada**, e o motivo é verificável lendo o código citado.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';

import { CATALOGUED_ENVS, envDoc } from '#src/deploy/env-catalog.ts';
import { WORKLOADS } from '#src/deploy/workloads.ts';

import { PROJECT_ROOT, readSource, isCommentLine } from '../support/source-scan.ts';

/** Os arquivos cujo conteúdo é o próprio registro — saem da varredura de leitura. */
const SELF: readonly string[] = ['src/deploy/workloads.ts', 'src/deploy/env-catalog.ts'];

/**
 * As quatro formas de ler uma env pelo NOME.
 *
 * @remarks
 * O `workloads-manifest.test.ts` detecta a FORMA de acesso (`process.env` ou `env[`) para decidir
 * QUEM lê; aqui o que importa é O QUÊ, então os padrões capturam o identificador. Um nome com
 * menos de três caracteres não é casado de propósito: `env.ID` seria ruído, e nenhuma variável do
 * produto tem nome tão curto.
 */
const NAME_PATTERNS: readonly RegExp[] = [
  /process\.env\.([A-Z][A-Z0-9_]{2,})/g,
  /process\.env\[\s*['"]([A-Z][A-Z0-9_]{2,})['"]\s*\]/g,
  /\benv\.([A-Z][A-Z0-9_]{2,})/g,
  /\benv\[\s*['"]([A-Z][A-Z0-9_]{2,})['"]\s*\]/g,
];

/** Os `.ts` de `src/` que o git conhece, menos os dois arquivos de registro. */
const trackedTs = (): readonly string[] =>
  execFileSync('git', ['ls-files', 'src'], { cwd: PROJECT_ROOT, encoding: 'utf-8' })
    .split('\n')
    .filter((f) => f.endsWith('.ts') && !SELF.includes(f));

/** Nomes de variável lidos por um trecho de código, ignorando comentário. */
const namesReadIn = (text: string): readonly string[] => {
  const live = text
    .split('\n')
    .filter((l) => !isCommentLine(l))
    .join('\n');
  return NAME_PATTERNS.flatMap((re) => [...live.matchAll(re)].map((m) => m[1] ?? '')).filter(
    (n) => n !== '',
  );
};

/** Variável → arquivos de `src/` que a leem. */
const readersByEnv = (): ReadonlyMap<string, readonly string[]> => {
  const acc = new Map<string, string[]>();
  for (const file of trackedTs()) {
    for (const name of namesReadIn(readSource(file))) {
      const list = acc.get(name) ?? [];
      if (!list.includes(file)) list.push(file);
      acc.set(name, list);
    }
  }
  return acc;
};

/** Toda variável que alguma unidade declara, em qualquer das três listas ou nas constraints. */
const declaredInManifest = (): ReadonlySet<string> =>
  new Set(
    WORKLOADS.flatMap((w) => [
      ...w.env,
      ...w.envWithDefault,
      ...w.envProductionOnly,
      ...w.constraints.flatMap((c) => c.envs),
    ]),
  );

describe('ENV-CATALOG — o catálogo cobre o manifesto e o código', () => {
  it('toda variável declarada no manifesto tem entrada no catálogo', () => {
    const catalogued = new Set(CATALOGUED_ENVS);
    const undocumented = [...declaredInManifest()].filter((e) => !catalogued.has(e)).sort();

    assert.deepEqual(
      undocumented,
      [],
      'Variável que uma unidade exige e que ninguém descreveu. Sem entrada no catálogo ela sai do ' +
        '`.env.example` gerado, e um clone novo não sobe sem saber por quê — foi assim com as ' +
        `\`VAN_S3_*\` (#1059). Acrescente a entrada em \`src/deploy/env-catalog.ts\`:\n${undocumented.join('\n')}`,
    );
  });

  it('toda variável lida em src/ tem entrada no catálogo — a volta que o manifesto não cobre', () => {
    const catalogued = new Set(CATALOGUED_ENVS);
    const readers = readersByEnv();
    const undocumented = [...readers.keys()]
      .filter((e) => !catalogued.has(e))
      .sort()
      .map((e) => `${e} — lida em ${(readers.get(e) ?? []).join(', ')}`);

    assert.deepEqual(
      undocumented,
      [],
      'Variável lida pelo código e ausente do catálogo. Esta é a direção que ' +
        '`workloads-manifest.test.ts` NÃO cobre: lá o caso é manifesto → código, e uma env nova ' +
        'passava verde. Descreva-a no catálogo e, se alguma unidade a exigir, declare-a no ' +
        `manifesto:\n${undocumented.join('\n')}`,
    );
  });

  it('entrada que nenhuma unidade declara traz `notComposed` dizendo por quê', () => {
    const declared = declaredInManifest();
    const unexplained = CATALOGUED_ENVS.filter(
      (e) => !declared.has(e) && envDoc(e)?.notComposed === undefined,
    ).sort();

    assert.deepEqual(
      unexplained,
      [],
      'Entrada no catálogo que nenhuma unidade do manifesto declara e que não explica o motivo. ' +
        'Ou alguma unidade a exige — e então declare lá —, ou existe código que a lê sem estar no ' +
        'caminho de boot, e aí o `notComposed` registra qual é, para a lacuna ficar visível em vez ' +
        `de esquecida:\n${unexplained.join('\n')}`,
    );
  });

  it('a varredura enxerga leitura de ambiente (guarda contra verde por vacuidade)', () => {
    const readers = readersByEnv();
    assert.ok(
      readers.size > 40,
      `esperado 40+ variáveis lidas em src/, encontrado ${readers.size} — se a varredura casa ` +
        'pouco, os dois primeiros casos passam num repositório errado',
    );
  });

  it('o detector reconhece as quatro formas de leitura (contraprova invertida)', () => {
    const specimens: readonly { readonly form: string; readonly code: string }[] = [
      { form: 'process.env.NOME', code: 'const a = process.env.CORE_API_SPECIMEN;' },
      { form: "process.env['NOME']", code: "const b = process.env['CORE_API_SPECIMEN'];" },
      { form: 'env.NOME', code: 'const c = env.CORE_API_SPECIMEN;' },
      { form: "env['NOME']", code: "const d = env['CORE_API_SPECIMEN'];" },
    ];

    const blind = specimens
      .filter(({ code }) => !namesReadIn(code).includes('CORE_API_SPECIMEN'))
      .map(({ form }) => form);

    assert.deepEqual(
      blind,
      [],
      `Forma de leitura que o detector não reconhece — o gate ficaria cego a ela:\n${blind.join('\n')}`,
    );
  });

  it('o detector ignora linha comentada (contraprova: menção não é uso)', () => {
    const mentioned = '// antes lia process.env.CORE_API_SPECIMEN, hoje não';
    assert.deepEqual(
      namesReadIn(mentioned),
      [],
      'O detector casou um nome dentro de comentário. Varredura que confunde menção com uso ' +
        'acusa quem só documenta — e a doc do próprio catálogo cita nomes por toda parte.',
    );
  });
});
