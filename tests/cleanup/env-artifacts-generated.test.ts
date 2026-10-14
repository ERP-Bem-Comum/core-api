/**
 * ENV-ARTIFACTS-GENERATED — o `.env.example` e a doc de env são DERIVADOS, e o disco concorda.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Norma: os dois artefatos saem de `src/deploy/env-catalog.ts` + `src/deploy/workloads.ts` por
 * `pnpm run env:generate`. Este gate é a forma do `format:check` contra o Prettier: não opina sobre
 * o conteúdo, exige que o arquivo no disco seja **idêntico** ao que o gerador produz.
 *
 * O caso que originou o gate: o `.env.example` era escrito à mão, não declarava `VAN_S3_REGION` nem
 * `VAN_S3_BUCKET`, e `cp .env.example .env && pnpm run dev` não subia nem o processo `http` —
 * `buildVanStorage` faz `throw` (`composition.ts:782`) e é chamado de forma eager na composição do
 * `financial` (`:949`). Nenhum gate olhava o template (#1059).
 *
 * POR QUE GERAR, E NÃO CONFERIR CAMPO A CAMPO. O [ADR-0073](../../handbook/architecture/adr/0073-nvmrc-single-source-supersedes-0058-partial.md)
 * mediu a diferença: o gate da versão do Node cobrava só o major, e a divergência de minor
 * (`24.16.0` contra `24.15`) sobreviveu **verde**. Um gate de igualdade byte a byte não tem essa
 * fenda — e a mensagem de erro é acionável, porque o conserto é um comando.
 *
 * O gate invoca o gerador como SUBPROCESSO, em `--check`, em vez de importar as funções: assim o
 * que é testado é o comando que a pessoa vai rodar, incluindo o caminho de escrita e a resolução
 * de `#src/*`. Um teste que importasse as funções passaria com o script quebrado.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync, execFileSync as run } from 'node:child_process';

import { CATALOGUED_ENVS, envDoc } from '#src/deploy/env-catalog.ts';

import { PROJECT_ROOT, readSource } from '../support/source-scan.ts';

const GENERATOR = 'scripts/deploy/generate-env-artifacts.ts';

/** Roda o gerador e devolve a saída combinada mais o código de saída. */
const runGenerator = (args: readonly string[]): { readonly out: string; readonly code: number } => {
  try {
    const out = run('node', [GENERATOR, ...args], {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { out, code: 0 };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { out: `${err.stdout ?? ''}${err.stderr ?? ''}`, code: err.status ?? 1 };
  }
};

describe('ENV-ARTIFACTS-GENERATED — o disco concorda com o gerador', () => {
  it('o `.env.example` e a doc no disco são idênticos ao gerado', () => {
    const { out, code } = runGenerator(['--check']);

    assert.equal(
      code,
      0,
      'Artefato derivado divergente do gerador. Estes arquivos NÃO se editam à mão — rode ' +
        `\`pnpm run env:generate\` e comite o resultado:\n${out}`,
    );
  });

  it('o gerador é versionado e roda (guarda contra gate que mede o vazio)', () => {
    const tracked = execFileSync('git', ['ls-files', GENERATOR], {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
    }).trim();

    assert.equal(
      tracked,
      GENERATOR,
      `O gerador não está versionado neste caminho. Sem ele o \`--check\` do primeiro caso não ` +
        'tem o que comparar, e o gate passaria por ausência.',
    );
  });

  it('toda variável catalogada chega ao template, salvo as que nenhuma unidade compõe', () => {
    const template = readSource('.env.example');

    const missing = CATALOGUED_ENVS.filter(
      (name) =>
        envDoc(name)?.notComposed === undefined &&
        !new RegExp(`^#?\\s*${name}=`, 'm').test(template),
    ).sort();

    assert.deepEqual(
      missing,
      [],
      'Variável catalogada que não chegou ao `.env.example`. Este caso mede o ARTEFATO, não a ' +
        'definição de categoria — porque foi exatamente a divergência entre as duas que fez ' +
        '`EMAIL_FROM` e irmãos desaparecerem do template na primeira versão do gerador: a ' +
        'varredura do gate contava as `constraints` e a do gerador não. Medir o efeito é imune a ' +
        `isso:\n${missing.join('\n')}`,
    );
  });

  it('o `--check` sabe reprovar (contraprova invertida, em diretório vazio)', () => {
    const { code } = runGenerator(['--check', '--out-dir', '.tmp/env-check-contraprova']);

    assert.equal(
      code,
      1,
      'O `--check` aprovou um diretório que não tem os artefatos. Se ele não reprova o ausente, ' +
        'o primeiro caso é indistinguível de um gate que não mede nada — é a fenda que o ' +
        'ADR-0073 documenta no gate da versão do Node.',
    );
  });
});
