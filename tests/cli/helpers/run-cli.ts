import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const CLI_ENTRY = fileURLToPath(
  new URL('../../../src/modules/contracts/cli/main.ts', import.meta.url),
);

const CWD = resolve(fileURLToPath(new URL('../../../', import.meta.url)));

const DEFAULT_TIMEOUT_MS = 30_000;

export type CliResult = Readonly<{
  stdout: string;
  stderr: string;
  exitCode: number;
}>;

// Decisão D1 do ticket: spawnSync (síncrono, sem promise hell)
// Decisão D4 (revisada): dispara `node` diretamente em vez de `pnpm`
// — saída do main.ts limpa, sem prefixo da task runner.
export const runCli = (args: readonly string[]): CliResult => {
  const result = spawnSync(
    'node',
    ['--experimental-strip-types', '--no-warnings', CLI_ENTRY, ...args],
    {
      cwd: CWD,
      encoding: 'utf-8',
      timeout: DEFAULT_TIMEOUT_MS,
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    },
  );
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? -1,
  };
};
