import { describe, it, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import { runCli } from './helpers/run-cli.ts';
import { newStateFile, removeStateFile } from './helpers/temp-state.ts';

// W0 RED — CTR-IMPORT-LEGACY-CLI: comando `importar-contratos`.
// Sintaxe: importar-contratos --arquivo <path> [--formato csv|json] [--confirmar] --state <path>
// dry-run é o default; --confirmar persiste.

const HEADER =
  'numero,titulo,objetivo,assinado_em,valor_centavos,inicio,fim,contratado_tipo,contratado_id';
const CT = '55555555-5555-4555-8555-555555555555';

const tmpFile = (content: string, ext: string): string => {
  const path = join(tmpdir(), `ctr-import-${randomUUID()}.${ext}`);
  writeFileSync(path, content, 'utf-8');
  return path;
};

const validCsv = `${HEADER}
700/2026,Contrato A,Objeto A,2026-01-01,10000000,2026-01-01,2026-12-31,supplier,${CT}
701/2026,Contrato B,Objeto B,2026-02-01,5000000,2026-02-01,,supplier,${CT}`;

describe('CLI E2E — importar-contratos (UC-11 passada 2)', () => {
  const created: string[] = [];
  after(() => {
    for (const p of created) rmSync(p, { force: true });
  });
  const mk = (content: string, ext: string): string => {
    const p = tmpFile(content, ext);
    created.push(p);
    return p;
  };

  it('CA-2: sem --confirmar é dry-run — reporta e NÃO persiste', () => {
    const state = newStateFile();
    try {
      const file = mk(validCsv, 'csv');
      const r = runCli(['importar-contratos', '--arquivo', file, '--state', state]);
      assert.equal(r.exitCode, 0, `stderr: ${r.stderr}`);
      assert.match(r.stdout, /simula|dry-run|--confirmar/i);

      const list = runCli(['listar-contratos', '--state', state]);
      assert.doesNotMatch(list.stdout, /700\/2026/);
    } finally {
      removeStateFile(state);
    }
  });

  it('CA-1: com --confirmar persiste — listar-contratos mostra os importados', () => {
    const state = newStateFile();
    try {
      const file = mk(validCsv, 'csv');
      const r = runCli(['importar-contratos', '--arquivo', file, '--state', state, '--confirmar']);
      assert.equal(r.exitCode, 0, `stderr: ${r.stderr}`);

      const list = runCli(['listar-contratos', '--state', state]);
      assert.match(list.stdout, /700\/2026/);
      assert.match(list.stdout, /701\/2026/);
    } finally {
      removeStateFile(state);
    }
  });

  it('CA-4: JSON UTF-8 equivalente persiste igual ao CSV', () => {
    const state = newStateFile();
    try {
      const json = JSON.stringify([
        {
          numero: '710/2026',
          titulo: 'Contrato JSON',
          objetivo: 'Objeto',
          assinado_em: '2026-01-01',
          valor_centavos: 10000000,
          inicio: '2026-01-01',
          fim: '2026-12-31',
          contratado_tipo: 'supplier',
          contratado_id: CT,
        },
      ]);
      const file = mk(json, 'json');
      const r = runCli(['importar-contratos', '--arquivo', file, '--state', state, '--confirmar']);
      assert.equal(r.exitCode, 0, `stderr: ${r.stderr}`);

      const list = runCli(['listar-contratos', '--state', state]);
      assert.match(list.stdout, /710\/2026/);
    } finally {
      removeStateFile(state);
    }
  });

  it('CA-3: coluna obrigatória ausente → exit ≠ 0', () => {
    const state = newStateFile();
    try {
      const badCsv = `titulo,objetivo,assinado_em,valor_centavos,inicio,fim
Contrato A,Objeto A,2026-01-01,100,2026-01-01,2026-12-31`;
      const file = mk(badCsv, 'csv');
      const r = runCli(['importar-contratos', '--arquivo', file, '--state', state, '--confirmar']);
      assert.notEqual(r.exitCode, 0);
    } finally {
      removeStateFile(state);
    }
  });

  it('CA-5: arquivo inexistente → exit ≠ 0 com mensagem', () => {
    const state = newStateFile();
    try {
      const r = runCli([
        'importar-contratos',
        '--arquivo',
        join(tmpdir(), `nao-existe-${randomUUID()}.csv`),
        '--state',
        state,
      ]);
      assert.notEqual(r.exitCode, 0);
    } finally {
      removeStateFile(state);
    }
  });
});
