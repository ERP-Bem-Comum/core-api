/**
 * CTR-INFRA-INTEGRATION-SECRET-PERMS — Wave W0 (RED)
 *
 * Regressão de tooling barata e determinística (roda sem Docker).
 *
 * Contexto: o commit `948b76c` (fecha CTR-INFRA-READONLY-BI-AUTH) corrigiu
 * `scripts/setup-secrets.ts` e `tests/infra/mysql-compose.test.ts` para gravar
 * os secrets em `0o644` — necessário porque o seed
 * `docker/mysql/initdb.d/01-databases-and-users.sh` roda como o user `mysql`
 * (uid 999, pós step-down `gosu`) e lê `/run/secrets/*` via `cat` sob `set -eu`.
 * Com `0600` owned pelo uid do host (bind-mount do compose), o `cat` falha com
 * *Permission denied*, o seed aborta e `readonly_bi` nunca é criado.
 *
 * Mas o fix deixou intacto o terceiro ponto que materializa o secret: o script
 * inline `package.json#scripts.test:integration`, que ainda cria os secrets com
 * `chmod 600`. A suíte `mysql-compose.test.ts` NÃO pega essa regressão porque
 * usa seu próprio `writeSecrets()` (já 0o644), independente do package.json.
 *
 * Este teste amarra o script `test:integration` à permissão correta: a prova
 * funcional de que `0o644` cria `readonly_bi` e boota healthy já vive em
 * `mysql-compose.test.ts` (CA-3/CA-5/CA-6). Aqui garantimos que o caminho de
 * integração não regrida para `0600`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..', '..');
const PACKAGE_JSON = join(PROJECT_ROOT, 'package.json');

interface PackageJson {
  readonly scripts: Readonly<Record<string, string>>;
}

const readScripts = (): Readonly<Record<string, string>> => {
  const raw = readFileSync(PACKAGE_JSON, 'utf-8');
  return (JSON.parse(raw) as PackageJson).scripts;
};

// `chmod 600` ou `chmod 0600` mirando os secrets de MySQL, em qualquer script.
const CHMOD_600_SECRETS = /chmod\s+0?600\s+secrets\/mysql_/;
// `chmod 644`/`0644` mirando os secrets — a permissão correta (owner rw, others r).
const CHMOD_644_SECRETS = /chmod\s+0?644\s+secrets\/mysql_/;

describe('CTR-INFRA-INTEGRATION-SECRET-PERMS — script test:integration', () => {
  it('CA-1: o script test:integration não cria secrets MySQL com chmod 600', () => {
    const script = readScripts()['test:integration'];
    assert.ok(script, 'script test:integration deveria existir em package.json');
    assert.doesNotMatch(
      script,
      CHMOD_600_SECRETS,
      'test:integration usa chmod 600 nos secrets — o seed readonly_bi falha silenciosamente (uid mysql não lê 0600). Use chmod 644.',
    );
  });

  it('CA-1b: o script test:integration grava os secrets MySQL com chmod 644', () => {
    const script = readScripts()['test:integration'];
    assert.ok(script, 'script test:integration deveria existir em package.json');
    assert.match(
      script,
      CHMOD_644_SECRETS,
      'test:integration deveria gravar os secrets em 0644 (alinhado a setup-secrets.ts e ao seed do MySQL).',
    );
  });

  it('CA-4: nenhum script de package.json usa chmod 600 para secrets MySQL', () => {
    const scripts = readScripts();
    const offenders = Object.entries(scripts)
      .filter(([, body]) => CHMOD_600_SECRETS.test(body))
      .map(([name]) => name);
    assert.deepEqual(
      offenders,
      [],
      `scripts com chmod 600 para secrets MySQL (devem usar 0644): ${offenders.join(', ')}`,
    );
  });
});
