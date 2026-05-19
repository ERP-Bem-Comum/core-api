import { buildContext, type CliContextError } from './context.ts';
import { formatErrorCode } from './formatters/error.ts';
import { parseDriverFlags } from './parse-driver-flags.ts';
import { REGISTRY } from './registry.ts';

// REGR #8 (2026-05-15): `--help` intencional vai para stdout (suporta `cli --help | less`);
// uso inválido vai para stderr (convenção GNU/POSIX). Passamos o stream como argumento
// para deixar o caller decidir.
// `process.stdout` / `process.stderr` são streams nativos do Node — read-only-param
// não se aplica (são mutáveis por design da API). Suprimimos a regra localmente.
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const printUsage = (stream: NodeJS.WriteStream): void => {
  stream.write('Uso: contratos-cli <subcomando> [flags] [--driver memory|mysql] [...]\n\n');
  stream.write('Subcomandos disponíveis:\n');
  for (const [name, cmd] of Object.entries(REGISTRY)) {
    stream.write(`  ${name.padEnd(24)} ${cmd.descricao}\n`);
  }
  stream.write('\nFlags globais:\n');
  stream.write('  --driver <kind>           memory (default) | mysql\n');
  stream.write(
    '  --state <arquivo>         [memory] arquivo de persistência (default: ./cli-state.json)\n',
  );
  stream.write('  --no-state                [memory] modo efêmero, estado descartado\n');
  stream.write('  --connection-string <url> [mysql] mysql://user:pass@host:port/db\n');
  stream.write('  --help, -h                mostra esta ajuda\n');
};

// Exit codes (sysexits.h):
//   64 EX_USAGE — uso inválido (flag desconhecida, conflito, connection string mal formada)
//   74 EX_IOERR — falha de I/O (state file, mysql connect/migrate)
const EXIT_USAGE = 64;
const EXIT_IOERR = 74;

// Lookup table substitui `switch + throw unreachable`. Tipagem
// `Record<CliContextError, number>` força exaustividade em compile-time:
// adicionar variante em `CliContextError` quebra o build aqui.
const EXIT_CODE_BY_CONTEXT_ERROR: Readonly<Record<CliContextError, number>> = {
  // MysqlDriverError (CTR-DB-DRIVER-MYSQL #4)
  'mysql-driver-connection-string-invalid': EXIT_USAGE,
  'mysql-driver-connect-failed': EXIT_IOERR,
  'mysql-driver-migrate-failed': EXIT_IOERR,
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
    // Uso inválido (sem args) → stderr + EX_USAGE (POSIX).
    printUsage(process.stderr);
    return EXIT_USAGE;
  }

  if (rawArgv[0] === '--help' || rawArgv[0] === '-h') {
    // --help explícito → stdout + exit 0 (permite `cli --help | less`).
    printUsage(process.stdout);
    return 0;
  }

  // REGR #6: detecta flag global posicionada ANTES do subcomando.
  // Antes, `--driver` aqui virava "subcomando desconhecido: --driver" — confuso.
  // Agora damos mensagem específica de posicionamento.
  const GLOBAL_FLAG_TOKENS = new Set(['--driver', '--state', '--no-state', '--connection-string']);
  const firstToken = rawArgv[0];
  if (firstToken?.startsWith('--') === true) {
    const flagName = firstToken.split('=')[0] ?? firstToken;
    if (GLOBAL_FLAG_TOKENS.has(flagName)) {
      process.stderr.write(`❌ ${formatErrorCode('cli-flag-position-invalid')}\n`);
      return EXIT_USAGE;
    }
  }

  const [subcommand, ...subArgv] = rawArgv;
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

  const parsedR = parseDriverFlags(subArgv);
  if (!parsedR.ok) {
    process.stderr.write(`❌ ${formatErrorCode(parsedR.error)}\n`);
    return EXIT_USAGE;
  }

  const ctxR = await buildContext(parsedR.value.driver);
  if (!ctxR.ok) {
    process.stderr.write(`❌ ${formatErrorCode(ctxR.error)}\n`);
    return exitCodeForContextError(ctxR.error);
  }

  const ctx = ctxR.value;
  try {
    return await cmd.run(ctx, parsedR.value.rest);
  } finally {
    await ctx.shutdown();
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
