/**
 * SUPPLY-CHAIN-SETTINGS — as quatro settings de quarentena e a versão única do pnpm.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Origem: o comprometimento do `axios` em março/2026 (ADR-0011), e os defaults endurecidos do
 * pnpm 11 (ADR-0029). As quatro settings de `pnpm-workspace.yaml` são a resposta a esse incidente
 * — e `trustPolicy: no-downgrade` é literalmente o vetor que foi usado.
 *
 * Por que este gate existe: o inventário de decisões registrou que as quatro existem no arquivo e
 * que **nenhum teste ou workflow as cobra**. São quatro linhas de YAML cuja remoção não quebra
 * build, não quebra teste e não aparece em lugar nenhum — reabrindo o vetor em silêncio. É o pior
 * perfil possível: alto impacto, custo zero de remover, detecção nenhuma.
 *
 * A segunda parte cobre a concordância de versão. O pnpm é declarado em TRÊS lugares —
 * `packageManager` (corepack ativa), `engines.pnpm` (recusa versão fora da faixa) e
 * `ENV PNPM_VERSION` no Dockerfile (o que roda no build da imagem). Se divergirem, a imagem instala
 * com um resolvedor diferente do que o desenvolvedor testou, e o lockfile deixa de ser garantia.
 *
 * NÃO cobra o pin de dependência crítica: 7 das 19 deps de produção usam `^` hoje — entre elas
 * `jose`, `mysql2` e `@aws-sdk/client-s3`. Isso é dívida registrada em `.claude/rules/supply-chain.md`,
 * não invariante vigente; um gate aqui nasceria vermelho.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readSource } from '../support/source-scan.ts';

/** As quatro settings e o valor exato exigido pelo ADR-0029. */
const REQUIRED_SETTINGS: readonly (readonly [string, string])[] = [
  ['minimumReleaseAge', '1440'],
  ['minimumReleaseAgeStrict', 'true'],
  ['trustPolicy', 'no-downgrade'],
  ['blockExoticSubdeps', 'true'],
];

const workspace = (): string => readSource('pnpm-workspace.yaml');

describe('SUPPLY-CHAIN — as 4 settings de quarentena estão presentes e com o valor certo', () => {
  for (const [key, value] of REQUIRED_SETTINGS) {
    it(`${key}: ${value}`, () => {
      const line = workspace()
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l.startsWith(`${key}:`));
      assert.notEqual(
        line,
        undefined,
        `${key} sumiu de pnpm-workspace.yaml — remover qualquer uma das quatro reabre o vetor do ` +
          'incidente do axios (ADR-0011/ADR-0029)',
      );
      assert.equal(
        line,
        `${key}: ${value}`,
        `${key} mudou de valor. Se uma dep recente travar o install, a saída é ` +
          '`minimumReleaseAgeExclude` por pacote — nunca afrouxar a setting.',
      );
    });
  }
});

describe('SUPPLY-CHAIN — a versão do pnpm é a mesma nos três lugares', () => {
  it('packageManager, engines.pnpm e ENV PNPM_VERSION concordam', () => {
    const pkg = JSON.parse(readSource('package.json')) as {
      packageManager?: string;
      engines?: { pnpm?: string };
    };
    const declared = /pnpm@(\d+\.\d+\.\d+)/.exec(pkg.packageManager ?? '')?.[1];
    const dockerfile = /ENV PNPM_VERSION=(\d+\.\d+\.\d+)/.exec(readSource('Dockerfile'))?.[1];
    const major = declared?.split('.')[0];

    assert.ok(declared !== undefined, 'packageManager não declara versão de pnpm');
    assert.equal(
      dockerfile,
      declared,
      `Dockerfile instala pnpm ${String(dockerfile)} e o repo declara ${declared} — a ` +
        'imagem resolveria dependências com um resolvedor diferente do testado',
    );
    assert.match(
      pkg.engines?.pnpm ?? '',
      new RegExp(`>=${String(major)}\\.`),
      `engines.pnpm não cobre o major ${String(major)} declarado em packageManager`,
    );
  });
});
