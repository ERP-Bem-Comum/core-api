/**
 * CTR-INFRA-INTEGRATION-SECRET-PERMS — atualizado p/ Fase 1 (repo cleanup).
 *
 * Regressão de tooling barata e determinística (roda sem Docker).
 *
 * Contexto: o seed `docker/mysql/initdb.d/01-databases-and-users.sh` roda como o user `mysql`
 * (uid 999) e lê `/run/secrets/*` via `cat` sob `set -eu`. Com `0600` owned pelo uid do host
 * (bind-mount do compose), o `cat` falha com *Permission denied*, o seed aborta e `readonly_bi`
 * nunca é criado. Logo os secrets de teste precisam ser `0o644`.
 *
 * A criação dos secrets de integração saiu do string inline do package.json para o orquestrador
 * `scripts/test-integration.ts` (`writeTestSecrets`). Este teste amarra o orquestrador à permissão
 * correta e garante que nenhum script do package.json regrida para `chmod 600`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..', '..');
const PACKAGE_JSON = join(PROJECT_ROOT, 'package.json');
const ORCHESTRATOR = join(PROJECT_ROOT, 'scripts', 'ci', 'test-integration.ts');

// `chmod 600`/`0600` (shell legado) ou `0o600` (orquestrador) mirando os secrets de MySQL.
const CHMOD_600_SECRETS = /chmod\s+0?600\s+secrets\/mysql_/;

describe('CTR-INFRA-INTEGRATION-SECRET-PERMS — orquestrador de integração', () => {
  it('CA-1: o orquestrador NÃO grava os secrets MySQL com 0o600', () => {
    const src = readFileSync(ORCHESTRATOR, 'utf-8');
    assert.doesNotMatch(
      src,
      /0o600/,
      'orquestrador usa 0o600 — o seed readonly_bi falha (uid mysql não lê 0600). Use 0o644.',
    );
  });

  it('CA-1b: o orquestrador grava os secrets MySQL em 0o644', () => {
    const src = readFileSync(ORCHESTRATOR, 'utf-8');
    assert.match(
      src,
      /chmodSync\([^)]*0o644\)/,
      'orquestrador deveria gravar os secrets em 0o644 (alinhado a setup-secrets.ts e ao seed do MySQL).',
    );
  });

  it('CA-4: nenhum script de package.json usa chmod 600 para secrets MySQL', () => {
    const scripts = (
      JSON.parse(readFileSync(PACKAGE_JSON, 'utf-8')) as {
        scripts: Readonly<Record<string, string>>;
      }
    ).scripts;
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
