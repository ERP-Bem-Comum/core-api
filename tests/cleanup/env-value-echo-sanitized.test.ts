/**
 * ENV-VALUE-ECHO-SANITIZED — valor vindo do ambiente não entra cru numa mensagem (CWE-117).
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * ## Por que este gate existe, e por que a regra escrita não bastou
 *
 * As guardas de configuração escrevem o diagnóstico em **stderr, uma linha por erro**, no boot,
 * antes de existir logger. Um valor de env com quebra de linha interpolado cru **forja uma linha
 * inteira**: quem lê o boot vê uma mensagem que nenhuma guarda emitiu.
 *
 * A régua já existia desde o #456 — `echoableDriverValue`, na guarda dos 7 drivers, com teste
 * próprio (caso 16). Ela estava em **um** lugar. Em 31/08/2026 uma varredura encontrou o mesmo
 * defeito em **cinco**: `describeVanS3ConfigError`, `describeAwsS3EnvError`, dois pontos de
 * `workers/runner/specs.ts` e `shared/http/email-link-base-urls.ts`. Quatro deles nasceram DEPOIS
 * da régua, escritos por quem a tinha a um `grep` de distância.
 *
 * O defeito nunca foi ignorância — foi **ausência de propagação**. Regra escrita não alcança código
 * que ainda não existe; um gate alcança. É a lacuna que este arquivo fecha.
 *
 * ## O que ele cobra, e por que em duas formas
 *
 * Os dois padrões reais de eco no repositório:
 *
 *   A. **Campo `raw` de erro de configuração** — `VanS3ConfigError`/`AwsS3EnvError` carregam o valor
 *      recusado, e as funções `describe*Error` o interpolam. Estrutural: o campo tem nome fixo.
 *   B. **Variável lida do ambiente, dentro de construção de erro** — `err(…)`, `errors.push(…)`,
 *      `new Error(…)`. É o caso do `email-link-base-urls`, que não tem tipo com `raw`.
 *
 * ⚠️ **Cobra estrutura, nunca redação.** Um gate que exigisse frase (`/valor atual/`) erraria nas
 * duas direções — reescrever a mensagem deixaria vermelho, e a violação escrita com outras palavras
 * passaria. É a variante mais cara desta doença, e o repositório já a pagou uma vez em
 * `docs-update.test.ts`.
 *
 * ⚠️ **A regra B é deliberadamente estreita.** Ela olha só a linha que CONSTRÓI o erro, e não toda
 * interpolação de variável-de-env: `normalizePrefix` (`van-s3-config.ts`) monta `${raw}/` para
 * produzir um VALOR, não uma mensagem, e um gate que a acusasse estaria errado. A fronteira é
 * "constrói erro", que é estrutural — não "parece mensagem", que seria adivinhação.
 *
 * ## Os dois sanitizadores, e por que são dois
 *
 * `echoEnvValue` (`src/shared/runtime/env-echo.ts`) resolve log forging: sanitiza e trunca por
 * grafema, preservando o valor legível para quem vai corrigi-lo.
 *
 * `echoableDriverValue` (`src/shared/persistence/module-driver-config.ts`) resolve outro risco —
 * CWE-532, credencial em log. Ali o valor PODE ser o segredo (uma connection string colada na
 * variável de driver), e sanitizar não ajudaria: a regra é ecoar só o que tem FORMA de driver.
 * Aceitar os dois é reconhecer que o campo decide qual proteção cabe; exigir sempre o primeiro
 * enfraqueceria a guarda dos drivers, que é a mais rígida das duas.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';

import { PROJECT_ROOT, readSource, walkFiles, isCommentLine } from '../support/source-scan.ts';

const SRC = join(PROJECT_ROOT, 'src');

/** Os dois sanitizadores aceitos. Ver o docblock: cada um responde a um risco distinto. */
const SANITIZERS = /\b(?:echoEnvValue|echoableDriverValue)\s*\(/;

/** Uma interpolação de template literal, do `${` ao `}` mais próximo. */
const INTERPOLATION = /\$\{([^}]*)\}/g;

/**
 * Acesso ao CAMPO `raw` de um erro — `error.raw`, `cfg.error.raw`. O ponto não é decoração: a
 * primeira versão deste gate usava `\braw\b` e acusou dois inocentes, ambos com uma variável LOCAL
 * chamada `raw` que nada tem de ambiente:
 *
 *   - `refresh-token-minter.fake.ts:18` — `hash: (raw) => \`${raw}-hash\``, o token do fake;
 *   - `van-s3-config.ts:116` — `\`${raw}/\``, montando o PREFIXO, que é valor e não mensagem.
 *
 * O campo de um erro de configuração chega sempre por acesso a propriedade; a variável solta, nunca.
 * Distinguir os dois é a diferença entre um gate que vigia e um que o time aprende a ignorar.
 *
 * `sql.raw(` (Drizzle) fica de fora explicitamente — aparece 4× em `adapters/persistence/` e é
 * chamada de função, sem relação alguma com ambiente.
 */
const RAW_FIELD = /\.\s*raw\b/;
const SQL_RAW = /\bsql\s*\.\s*raw\b/;

/** Onde um erro é CONSTRUÍDO — a fronteira da regra B. */
const ERROR_CONSTRUCTION = /\berr\s*\(|errors\s*\.\s*push\s*\(|new\s+Error\s*\(/;

/**
 * Nomes de variáveis derivadas do ambiente, no arquivo. Cobre as três formas do repositório:
 * `const x = env['A']`, `const x = process.env['A']` e `const x = readVar(env, 'A')`.
 */
const ENV_BINDING =
  /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:(?:process\s*\.\s*)?env\s*\[|readVar\s*\()/g;

type Offense = Readonly<{ file: string; line: number; rule: 'A' | 'B'; text: string }>;

/** Linhas de código do arquivo (comentário fora — quem documenta a norma não a viola). */
const codeLines = (file: string): readonly (readonly [number, string])[] =>
  readSource(file)
    .split('\n')
    .map((text, i) => [i + 1, text] as const)
    .filter(([, text]) => !isCommentLine(text));

const envBindings = (file: string): ReadonlySet<string> => {
  const names = new Set<string>();
  for (const m of readSource(file).matchAll(ENV_BINDING)) {
    const name = m[1];
    if (name !== undefined) names.add(name);
  }
  return names;
};

const offensesIn = (file: string): readonly Offense[] => {
  const out: Offense[] = [];
  const bindings = envBindings(file);

  for (const [line, text] of codeLines(file)) {
    if (SANITIZERS.test(text)) continue;

    for (const m of text.matchAll(INTERPOLATION)) {
      const inner = m[1] ?? '';

      // A — campo `raw` de erro de configuração.
      if (RAW_FIELD.test(inner) && !SQL_RAW.test(inner)) {
        out.push({ file, line, rule: 'A', text: text.trim() });
        continue;
      }

      // B — variável de ambiente, e só quando a linha constrói um erro.
      if (!ERROR_CONSTRUCTION.test(text)) continue;
      const usesEnvBinding = [...bindings].some((n) => new RegExp(`\\b${n}\\b`).test(inner));
      if (usesEnvBinding) out.push({ file, line, rule: 'B', text: text.trim() });
    }
  }
  return out;
};

const format = (o: Offense): string => `  ${o.file}:${o.line} [regra ${o.rule}] ${o.text}`;

describe('ENV-VALUE-ECHO-SANITIZED — valor de env não é ecoado cru em mensagem (CWE-117)', () => {
  const files = walkFiles(SRC, { ext: '.ts' });

  it('nenhuma mensagem interpola valor de ambiente sem sanitizar', () => {
    const offenses = files.flatMap(offensesIn);

    assert.deepEqual(
      offenses.map(format),
      [],
      'Valor vindo do ambiente interpolado CRU numa mensagem — um `\\n` ali forja uma linha no ' +
        'stderr do boot (CWE-117).\n\n' +
        'Envolva com `echoEnvValue(...)` (`src/shared/runtime/env-echo.ts`), ou com ' +
        '`echoableDriverValue(...)` quando o campo puder carregar credencial.\n\n' +
        `${offenses.map(format).join('\n')}\n`,
    );
  });

  // Guarda contra verde por vacuidade: se as regexes pararem de casar — por refactor, por renomear
  // o campo `raw`, por trocar a forma de ler env —, o gate ficaria verde sem ler nada, que é o pior
  // desfecho possível para um gate de varredura.
  it('o gate ainda encontra os pontos que ele existe para vigiar', () => {
    const comInterpolacaoDeRaw = files.filter((f) =>
      codeLines(f).some(([, text]) =>
        [...text.matchAll(INTERPOLATION)].some(
          (m) => RAW_FIELD.test(m[1] ?? '') && !SQL_RAW.test(m[1] ?? ''),
        ),
      ),
    );
    const comBindingDeEnv = files.filter((f) => envBindings(f).size > 0);

    assert.ok(
      comInterpolacaoDeRaw.length > 0,
      'nenhuma interpolação de `.raw` encontrada — a regra A deixou de casar e o gate virou inerte',
    );
    assert.ok(
      comBindingDeEnv.length > 0,
      'nenhuma leitura de env encontrada — a regra B deixou de casar e o gate virou inerte',
    );
  });

  // O gate aponta dois sanitizadores; se um deles sumir ou for renomeado, a mensagem de falha passa
  // a mandar o próximo leitor para um símbolo que não existe.
  it('os dois sanitizadores que a mensagem indica existem de fato', () => {
    assert.match(
      readSource('src/shared/runtime/env-echo.ts'),
      /export const echoEnvValue\b/,
      'a mensagem de falha aponta `echoEnvValue`, que sumiu ou mudou de nome',
    );
    assert.match(
      readSource('src/shared/persistence/module-driver-config.ts'),
      /const echoableDriverValue\b/,
      'a mensagem de falha aponta `echoableDriverValue`, que sumiu ou mudou de nome',
    );
  });
});
