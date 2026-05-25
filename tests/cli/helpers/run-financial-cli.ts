import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const CLI_ENTRY = fileURLToPath(
  new URL('../../../src/modules/financial/cli/main.ts', import.meta.url),
);

const CWD = resolve(fileURLToPath(new URL('../../../', import.meta.url)));

const DEFAULT_TIMEOUT_MS = 5_000;

export type FinancialCliResult = Readonly<{
  stdout: string;
  stderr: string;
  exitCode: number;
}>;

// Helper espelha `run-cli.ts` (módulo contracts) — CLI_ENTRY adaptado.
// Spawn direto do `node` em vez de `pnpm` evita prefixo da task runner
// na saída e reduz overhead (~500ms) por chamada.
export const runFinancialCli = (args: readonly string[]): FinancialCliResult => {
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
