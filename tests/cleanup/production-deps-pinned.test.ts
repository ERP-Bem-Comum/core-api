/**
 * PRODUCTION-DEPS-PINNED — em `dependencies`, versão exata. Sem `^`, sem `~`.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Origem: o ADR-0011 §3 manda pinar "dep crítica" e **nunca definiu o que é crítica**. A lacuna
 * durou o suficiente para 7 das 19 dependências de produção entrarem com `^` — entre elas `jose`
 * (assina e verifica JWT), `mysql2`, `@aws-sdk/client-s3`, `nodemailer` e `resend`.
 *
 * A definição que fecha a lacuna saiu de medir, não de opinar. Classificando as 19 por FUNÇÃO —
 * o que assina credencial, o que fala com banco, o que sai pela rede, o que parseia entrada não
 * confiável — o resultado foi **19 de 19**. Num backend, `dependencies` só carrega o que serve
 * tráfego; a distinção "crítica × não-crítica" é vazia aqui. Então a regra é a borda entre os dois
 * blocos do manifesto, e não uma lista a manter:
 *
 *     dependencies    → versão exata (roda em produção)
 *     devDependencies → range permitido (não vai para a imagem)
 *
 * Por que pinar. `minimumReleaseAge` dá 24h de quarentena, mas com `^` a resolução ainda escolhe
 * sozinha uma versão que ninguém revisou — basta ela envelhecer um dia. Pinar move a decisão para
 * um diff de PR, que é onde a política de supply-chain do ADR-0011 consegue agir. O lockfile já
 * fixa a árvore; o que o pin acrescenta é que **subir de versão vira ato deliberado**.
 *
 * Efeito colateral medido ao aplicar: os ranges do `@aws-sdk` permitiam múltiplas resoluções das
 * mesmas transitivas, e o pin removeu 20 pacotes duplicados do lockfile — 306 linhas a menos, sem
 * mudar uma única versão instalada.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { readSource } from '../support/source-scan.ts';

const RANGE_PREFIX = /^[\^~]/;

type Manifest = Readonly<{
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}>;

const manifest = (): Manifest => JSON.parse(readSource('package.json')) as Manifest;

describe('PRODUCTION-DEPS — o que roda em produção tem versão exata', () => {
  it('nenhuma entrada de dependencies usa ^ ou ~', () => {
    const offenders = Object.entries(manifest().dependencies ?? {})
      .filter(([, version]) => RANGE_PREFIX.test(version))
      .map(([name, version]) => `${name}@${version}`)
      .sort();
    assert.deepEqual(
      offenders,
      [],
      'Dependência de produção com faixa de versão — a resolução escolheria sozinha uma versão ' +
        'não revisada assim que ela passasse da quarentena de 24h (ADR-0011 §3):\n' +
        offenders.join('\n'),
    );
  });

  it('a varredura enxerga o manifesto (guarda contra verde por vacuidade)', () => {
    const total = Object.keys(manifest().dependencies ?? {}).length;
    assert.ok(total > 10, `esperado 10+ dependências de produção, encontrado ${total}`);
  });

  it('devDependencies NÃO é cobrada — a regra é sobre o que vai para a imagem', () => {
    // Asserção deliberada de escopo: se um dia alguém estender o pin a dev por engano, este teste
    // deixa de descrever a norma e o próximo leitor percebe. Dev com range é estado esperado.
    const devRanges = Object.values(manifest().devDependencies ?? {}).filter((v) =>
      RANGE_PREFIX.test(v),
    );
    assert.ok(
      devRanges.length > 0,
      'nenhuma devDependency usa range — se isso foi deliberado, atualize esta asserção e a rule',
    );
  });
});
