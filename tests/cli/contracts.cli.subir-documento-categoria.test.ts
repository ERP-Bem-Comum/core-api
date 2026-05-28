import { describe, it, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

import { runCli } from './helpers/run-cli.ts';
import { newStateFile, removeStateFile } from './helpers/temp-state.ts';
import { allowedFlags } from '#src/modules/contracts/cli/commands/subir-documento.ts';

// CTR-CLI-SUBIR-DOCUMENTO-CATEGORIA — `subir-documento` aceita `--categoria`.
// Hoje a categoria é 'other' hardcoded; estes testes falham por inexistência da flag.

type StoredDocument = Readonly<{ id: string; categoria: string; parentType: string }>;

const readDocuments = (statePath: string): readonly StoredDocument[] => {
  const parsed: unknown = JSON.parse(readFileSync(statePath, 'utf-8'));
  assert.ok(typeof parsed === 'object' && parsed !== null, 'state não é objeto');
  const docs = (parsed as { documents?: unknown }).documents;
  assert.ok(Array.isArray(docs), 'state.documents não é array');
  return docs as readonly StoredDocument[];
};

const subirDocumento = (statePath: string, extra: readonly string[]): ReturnType<typeof runCli> =>
  runCli([
    'subir-documento',
    '--state',
    statePath,
    '--parent-id',
    randomUUID(),
    '--parent-tipo',
    'Contract',
    ...extra,
  ]);

describe('CLI E2E — subir-documento --categoria', () => {
  describe('CA1: categoria explícita signed_contract', () => {
    const state = newStateFile();
    after(() => {
      removeStateFile(state);
    });

    it('cria documento com categoria signed_contract e exit 0', () => {
      const r = subirDocumento(state, ['--categoria', 'signed_contract']);
      assert.equal(r.exitCode, 0, `stderr: ${r.stderr}`);
      const docs = readDocuments(state);
      assert.equal(docs.length, 1);
      assert.equal(docs[0]?.categoria, 'signed_contract');
    });
  });

  describe('CA2: categoria inválida', () => {
    const state = newStateFile();
    after(() => {
      removeStateFile(state);
    });

    it('rejeita categoria fora do enum com exit 64 e lista as válidas', () => {
      const r = subirDocumento(state, ['--categoria', 'xpto-invalida']);
      assert.equal(r.exitCode, 64, `stdout: ${r.stdout} / stderr: ${r.stderr}`);
      assert.match(r.stderr, /signed_contract/);
    });
  });

  describe('CA3: regressão — default other', () => {
    const state = newStateFile();
    after(() => {
      removeStateFile(state);
    });

    it('sem --categoria cria documento com categoria other (comportamento atual)', () => {
      const r = subirDocumento(state, []);
      assert.equal(r.exitCode, 0, `stderr: ${r.stderr}`);
      const docs = readDocuments(state);
      assert.equal(docs.length, 1);
      assert.equal(docs[0]?.categoria, 'other');
    });
  });

  describe('CA4: --categoria é flag conhecida', () => {
    it('allowedFlags inclui categoria', () => {
      assert.ok(allowedFlags.includes('categoria'), `allowedFlags: ${allowedFlags.join(',')}`);
    });
  });
});
