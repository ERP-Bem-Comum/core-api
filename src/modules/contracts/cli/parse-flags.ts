import { type Result, ok, err } from '../../../shared/primitives/result.ts';

export type ParsedFlags = Readonly<Record<string, string>>;

export type ParseFlagsError =
  | Readonly<{ kind: 'cli-flag-duplicated'; flag: string }>
  | Readonly<{ kind: 'cli-flag-unknown'; flag: string }>;

// REGR #9 (2026-05-15): parseFlags agora detecta flag duplicada. Antes, o
// "last value wins" silencioso permitia ataques tipo
// `--numero 300/2026 --numero 999/2026` passarem sem aviso, ou typos como
// `--titulo Foo --titulo Bar` resultarem em estado inconsistente sem o
// operador perceber.
export const parseFlags = (argv: readonly string[]): Result<ParsedFlags, ParseFlagsError> => {
  const out: Record<string, string> = {};
  const seen = new Set<string>();

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token?.startsWith('--') !== true) continue;

    const equalsIndex = token.indexOf('=');
    if (equalsIndex > 0) {
      const name = token.slice(2, equalsIndex);
      const value = token.slice(equalsIndex + 1);
      if (seen.has(name)) return err({ kind: 'cli-flag-duplicated', flag: name });
      seen.add(name);
      out[name] = value;
      continue;
    }

    const name = token.slice(2);
    const next = argv[i + 1];
    if (seen.has(name)) return err({ kind: 'cli-flag-duplicated', flag: name });
    seen.add(name);
    if (next !== undefined && !next.startsWith('--')) {
      out[name] = next;
      i++;
    } else {
      out[name] = '';
    }
  }

  return ok(out);
};

// REGR #10 (2026-05-15): valida que toda flag em `argv` está na allowlist do
// subcomando. Sem isso, `--xyz=1` ou `--no-stat` (typo de --no-state) caíam
// silenciosamente em `rest` do parser de driver, e o driver memory aplicava
// DEFAULT_MEMORY_STATE_PATH — operador achou que estava efêmero mas deixou
// state no FS.
export const validateAllowedFlags = (
  flags: ParsedFlags,
  allowed: readonly string[],
): Result<void, ParseFlagsError> => {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(flags)) {
    if (!allowedSet.has(key)) return err({ kind: 'cli-flag-unknown', flag: key });
  }
  return ok(undefined);
};
