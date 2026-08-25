/**
 * NODE-VERSION-SINGLE-SOURCE — os lugares que declaram a versão do Node concordam.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 * Irmão direto de `supply-chain-settings.test.ts`, que faz o mesmo para o pnpm.
 *
 * Norma ([ADR-0058](../../handbook/architecture/adr/0058-runtime-tracks-recommended-lts.md) §4): a
 * versão do runtime NÃO vive em ADR — vive onde é verificável e executável, e esses lugares MUST
 * concordar entre si. São três, com papéis diferentes:
 *
 *   `package.json` → `engines.node`      o piso aceito
 *   `Dockerfile`   → `FROM node:<v>`     o que roda em produção, pinado por digest
 *   CI workflows   → `node-version`      o que testa
 *
 * O que se cobra é o MAJOR, não o patch, e a distinção é deliberada: patch diverge por motivo
 * legítimo (a imagem base sobe quando o mantenedor publica; o CI usa a linha), enquanto major
 * divergente significa que produção roda um runtime que ninguém testou. Exigir patch idêntico
 * produziria vermelho a cada release do Node — ruído que treina a ignorar o gate.
 *
 * O que este gate NÃO cobre, e o ADR-0058 declara: se o major é o LTS RECOMENDADO. Isso exige
 * consultar a rede, e o gate local é offline e determinístico por desenho — mesma razão pela qual
 * `pnpm audit` vive no CI. Um repositório inteiro coerente numa versão EOL passa aqui.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { PROJECT_ROOT, readSource } from '../support/source-scan.ts';

const WORKFLOWS = '.github/workflows';

/** `>=24.0.0` → `24`. O piso declarado em `engines.node`. */
const engineMajor = (): string | undefined => {
  const pkg = JSON.parse(readSource('package.json')) as { engines?: { node?: string } };
  return /(\d+)\./.exec(pkg.engines?.node ?? '')?.[1];
};

/** `FROM node:24.15-bookworm-slim@sha256:…` → `24`. O que roda em produção. */
const dockerMajor = (): string | undefined =>
  /^FROM node:(\d+)\./m.exec(readSource('Dockerfile'))?.[1];

/** `node-version: '24'` / `node-version: 24` em cada workflow que o declara. */
const workflowMajors = (): ReadonlyMap<string, string> => {
  const out = new Map<string, string>();
  for (const f of readdirSync(join(PROJECT_ROOT, WORKFLOWS)).filter((n) => n.endsWith('.yml'))) {
    const m = /node-version:\s*['"]?(\d+)/.exec(readSource(`${WORKFLOWS}/${f}`));
    if (m?.[1] !== undefined) out.set(f, m[1]);
  }
  return out;
};

describe('NODE-VERSION-SINGLE-SOURCE — produção roda o runtime que o CI testa', () => {
  it('engines.node e o Dockerfile declaram o mesmo major', () => {
    const engine = engineMajor();
    const docker = dockerMajor();
    assert.ok(engine !== undefined, 'engines.node não declara versão de Node');
    assert.ok(docker !== undefined, 'Dockerfile não declara `FROM node:<versão>`');
    assert.equal(
      docker,
      engine,
      `Dockerfile roda Node ${docker}.x e engines.node exige ${engine}.x — ` +
        'produção executaria um major que o repositório não declara suportar',
    );
  });

  it('todo workflow que fixa node-version usa o mesmo major', () => {
    const engine = engineMajor();
    const divergentes = [...workflowMajors()]
      .filter(([, major]) => major !== engine)
      .map(
        ([file, major]) =>
          `${WORKFLOWS}/${file}: node-version ${major} (esperado ${String(engine)})`,
      )
      .sort();
    assert.deepEqual(
      divergentes,
      [],
      'Workflow testando num major diferente do declarado — verde no CI deixa de significar ' +
        'verde em produção:\n' +
        divergentes.join('\n'),
    );
  });

  it('há workflows declarando node-version (guarda contra verde por vacuidade)', () => {
    assert.ok(
      workflowMajors().size > 0,
      'nenhum workflow declara `node-version` — o gate passaria sem verificar nada',
    );
  });
});
