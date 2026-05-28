/**
 * W0 (RED) — CTR-CLI-VALIDATE-FLAGS-BEFORE-STATE
 *
 * Bug: uma flag desconhecida (typo, ex. `--no-stat` em vez de `--no-state`) só é
 * rejeitada com EXIT=64 (EX_USAGE) DEPOIS de `buildContext` carregar o state. Quando
 * o `./cli-state.json` default existe mas tem schema inválido, o load falha com
 * EXIT=74 (EX_IOERR) ANTES de a flag ser validada — mascarando o typo.
 *
 * Estes testes sobem o CLI real (`main.ts`) num cwd temporário hermético, com um
 * `cli-state.json` deliberadamente inválido. DEVEM FALHAR no W0 (hoje retornam 74).
 *
 * Fix esperado (W1): validar flags desconhecidas ANTES de tocar I/O de state.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(here, '..', '..', '..', '..');
const cliEntry = resolve(repoRoot, 'src', 'modules', 'contracts', 'cli', 'main.ts');

// JSON sintaticamente válido, schema inválido (UUID inválido) → dispara
// `state-entity-invalid` (EXIT=74) no load do driver memory.
const INVALID_STATE = '{"contracts":[{"id":"not-a-valid-uuid","title":""}],"amendments":[]}';

type RunResult = Readonly<{ code: number; stdout: string; stderr: string }>;

const runCliInCwd = async (cwd: string, args: readonly string[]): Promise<RunResult> =>
  new Promise((resolveFn) => {
    const child = spawn(
      process.execPath,
      ['--experimental-strip-types', '--no-warnings', cliEntry, ...args],
      { cwd, env: { ...process.env, NODE_NO_WARNINGS: '1' } },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c: Buffer) => {
      stdout += c.toString('utf-8');
    });
    child.stderr.on('data', (c: Buffer) => {
      stderr += c.toString('utf-8');
    });
    child.on('close', (code) => {
      resolveFn({ code: code ?? -1, stdout, stderr });
    });
  });

const makeCwdWithInvalidState = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), 'ctr-cli-flag-before-state-'));
  await writeFile(join(dir, 'cli-state.json'), INVALID_STATE, 'utf-8');
  return dir;
};

describe('CTR-CLI-VALIDATE-FLAGS-BEFORE-STATE — flag desconhecida precede I/O de state', () => {
  it('CA-V1: `--no-stat` (typo) com cli-state.json inválido → EXIT=64, não 74', async () => {
    const cwd = await makeCwdWithInvalidState();

    const r = await runCliInCwd(cwd, ['listar-contratos', '--no-stat']);

    assert.equal(
      r.code,
      64,
      `flag desconhecida deve falhar com EX_USAGE (64) antes de carregar state; obtido ${r.code}\nstderr: ${r.stderr}`,
    );
  });

  it('CA-V2: stderr nomeia a flag desconhecida, não reporta erro de state', async () => {
    const cwd = await makeCwdWithInvalidState();

    const r = await runCliInCwd(cwd, ['listar-contratos', '--no-stat']);

    assert.match(r.stderr, /--no-stat/, 'stderr deve nomear a flag desconhecida');
    assert.doesNotMatch(
      r.stderr,
      /estado|schema inválido|state/i,
      `stderr não deve reportar erro de state quando a falha é de flag; obtido: ${r.stderr}`,
    );
  });

  it('CA-V3: state inválido permanece intacto (nenhuma escrita ocorre)', async () => {
    const cwd = await makeCwdWithInvalidState();

    await runCliInCwd(cwd, ['listar-contratos', '--no-stat']);

    const after = await readFile(join(cwd, 'cli-state.json'), 'utf-8');
    assert.equal(after, INVALID_STATE, 'o arquivo de estado não deve ser tocado/sobrescrito');
  });
});
