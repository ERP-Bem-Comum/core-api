/**
 * Entrypoint da CLI do módulo Financial.
 *
 * Pipeline: `parseDriverFlags → buildContext → REGISTRY[subcmd]?.run`.
 *
 * - `--help` / `-h`: stdout, exit 0 (suporta `cli --help | less`).
 * - vazio / subcomando desconhecido / flag inválida: stderr + exit code POSIX.
 *
 * Preserva semântica do `FIN-CLI-WIRE`:
 *   - 4 testes pré-existentes (CA-3..CA-6) continuam passando.
 *   - REGISTRY vazio gera "(nenhum ainda — virá com FIN-CLI-APROVAR-TITULO)".
 *
 * Pattern espelha `src/modules/contracts/cli/main.ts`.
 */

import {
  installLastResortHandlers,
  processLastResortDeps,
} from '../../../shared/runtime/last-resort.ts';
import { buildContext, type CliContextError } from './context.ts';
import { formatErrorCode } from './formatters/index.ts';
import { parseDriverFlags } from './parse-driver-flags.ts';
import { REGISTRY } from './registry.ts';

// `process.stdout` / `process.stderr` são streams nativos mutáveis do Node;
// `prefer-readonly-parameter-types` não aplicável (sem variante readonly).
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const printUsage = (stream: NodeJS.WriteStream): void => {
  stream.write('Uso: financial-cli <subcomando> [flags] [--driver memory|mysql] [...]\n\n');
  stream.write('Subcomandos disponíveis:\n');
  const entries = Object.entries(REGISTRY);
  if (entries.length === 0) {
    stream.write('  (nenhum ainda — virão com tickets FIN-CLI-APROVAR-TITULO e sucessores)\n');
  } else {
    for (const [name, cmd] of entries) {
      stream.write(`  ${name.padEnd(24)} ${cmd.descricao}\n`);
    }
  }
  stream.write('\nFlags globais:\n');
  stream.write('  --driver <kind>           memory (default) | mysql\n');
  stream.write(
    '  --state <arquivo>         [memory] arquivo de persistência (default: ./fin-cli-state.json)\n',
  );
  stream.write('  --no-state                [memory] modo efêmero, estado descartado\n');
  stream.write('  --help, -h                mostra esta ajuda\n');
};

// Exit codes (sysexits.h):
//   64 EX_USAGE  — uso inválido (flag desconhecida, subcomando inexistente, driver não suportado)
//   74 EX_IOERR  — falha de I/O (state file)
const EXIT_USAGE = 64;
const EXIT_IOERR = 74;

const EXIT_CODE_BY_CONTEXT_ERROR: Readonly<Record<CliContextError, number>> = {
  'cli-driver-not-supported-yet': EXIT_USAGE,
  'state-file-not-readable': EXIT_IOERR,
  'state-file-corrupted': EXIT_IOERR,
  'state-schema-invalid': EXIT_IOERR,
  'state-entity-invalid': EXIT_IOERR,
  'state-concurrent-lock': EXIT_IOERR,
  'state-file-not-writable': EXIT_IOERR,
};

const exitCodeForContextError = (error: CliContextError): number =>
  EXIT_CODE_BY_CONTEXT_ERROR[error];

const main = async (): Promise<number> => {
  const [, , ...rawArgv] = process.argv;

  if (rawArgv.length === 0) {
    printUsage(process.stderr);
    return EXIT_USAGE;
  }

  if (rawArgv[0] === '--help' || rawArgv[0] === '-h') {
    printUsage(process.stdout);
    return 0;
  }

  const parsedR = parseDriverFlags(rawArgv);
  if (!parsedR.ok) {
    process.stderr.write(`❌ ${formatErrorCode(parsedR.error)}\n`);
    return EXIT_USAGE;
  }

  const [subcommand, ...subArgv] = parsedR.value.rest;
  if (subcommand === undefined) {
    printUsage(process.stderr);
    return EXIT_USAGE;
  }

  const cmd = REGISTRY[subcommand];
  if (cmd === undefined) {
    process.stderr.write(`❌ Subcomando desconhecido: ${subcommand}\n\n`);
    printUsage(process.stderr);
    return EXIT_USAGE;
  }

  if (subArgv.includes('--help') || subArgv.includes('-h')) {
    process.stdout.write(`${cmd.help}\n`);
    return 0;
  }

  const ctxR = await buildContext(parsedR.value.driver);
  if (!ctxR.ok) {
    process.stderr.write(`❌ ${formatErrorCode(ctxR.error)}\n`);
    return exitCodeForContextError(ctxR.error);
  }

  const ctx = ctxR.value;
  // `handle.close()` (pool MySQL) não é idempotente; o guard garante shutdown
  // único entre o handler de último recurso e o `finally`.
  let shuttingDown = false;
  const shutdownOnce = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    await ctx.shutdown();
  };
  installLastResortHandlers(shutdownOnce, processLastResortDeps());
  try {
    return await cmd.run(ctx, subArgv);
  } finally {
    await shutdownOnce();
  }
};

main().then(
  (code) => {
    process.exit(code);
  },
  (e: unknown) => {
    process.stderr.write(`❌ Erro inesperado: ${String(e)}\n`);
    process.exit(1);
  },
);
