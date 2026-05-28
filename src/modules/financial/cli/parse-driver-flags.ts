import { type Result, ok, err } from '#src/shared/primitives/result.ts';

/**
 * Parser de flags globais de driver da CLI do módulo Financial.
 *
 * Drivers reconhecidos: `memory` (default) e `mysql` (parser aceita; rejeição
 * em `buildContext` com `cli-driver-not-supported-yet` — adapter Drizzle do
 * `PayableRepository` ainda não existe; ver `FIN-ADAPTER-DRIZZLE-PAYABLE`).
 *
 * - `memory` recebe `--state <path>` (default `./fin-cli-state.json`) ou `--no-state` (ephemeral).
 * - `mysql` (futuro): receberá `--connection-string mysql://user:pass@host:port/db`.
 *
 * Pattern espelha `src/modules/contracts/cli/parse-driver-flags.ts`, mas com:
 *   - DriverFlags `mysql` SEM `connectionString` (fora do escopo deste ticket).
 *   - DEFAULT_MEMORY_STATE_PATH com nome próprio (`./fin-cli-state.json`)
 *     para não conflitar com o state file da CLI contracts (`./cli-state.json`).
 */

export type DriverKind = 'memory' | 'mysql';

export type DriverFlags = Readonly<
  { kind: 'memory'; statePath: string | null } | { kind: 'mysql' }
>;

export type DriverFlagsError =
  | 'cli-driver-unknown'
  | 'cli-driver-flag-conflict'
  | 'cli-driver-missing-value';

export const DEFAULT_MEMORY_STATE_PATH = './fin-cli-state.json';

export type ParsedDriverArgs = Readonly<{
  driver: DriverFlags;
  rest: readonly string[];
}>;

const KNOWN_DRIVERS: readonly DriverKind[] = ['memory', 'mysql'];
const isKnownDriver = (s: string): s is DriverKind =>
  (KNOWN_DRIVERS as readonly string[]).includes(s);

type RawFlags = Readonly<{
  driverRaw: string | null;
  statePath: string | null;
  noState: boolean;
  rest: readonly string[];
}>;

const extractFlags = (argv: readonly string[]): Result<RawFlags, DriverFlagsError> => {
  let driverRaw: string | null = null;
  let statePath: string | null = null;
  let noState = false;
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === undefined) continue;

    if (token === '--driver' || token === '--state') {
      const next = argv[i + 1];
      if (next === undefined || next === '' || next.startsWith('--')) {
        return err('cli-driver-missing-value');
      }
      if (token === '--driver') driverRaw = next;
      else statePath = next;
      i++;
      continue;
    }
    if (token.startsWith('--driver=')) {
      driverRaw = token.slice('--driver='.length);
      if (driverRaw === '') return err('cli-driver-missing-value');
      continue;
    }
    if (token.startsWith('--state=')) {
      statePath = token.slice('--state='.length);
      if (statePath === '') return err('cli-driver-missing-value');
      continue;
    }
    if (token === '--no-state') {
      noState = true;
      continue;
    }
    rest.push(token);
  }

  return ok({ driverRaw, statePath, noState, rest });
};

const buildMemoryDriver = (flags: RawFlags): Result<DriverFlags, DriverFlagsError> => {
  if (flags.statePath !== null && flags.noState) return err('cli-driver-flag-conflict');
  if (flags.noState) return ok({ kind: 'memory', statePath: null });
  return ok({ kind: 'memory', statePath: flags.statePath ?? DEFAULT_MEMORY_STATE_PATH });
};

const buildMysqlDriver = (flags: RawFlags): Result<DriverFlags, DriverFlagsError> => {
  // `--state` e `--no-state` são exclusivos de memory.
  if (flags.statePath !== null || flags.noState) return err('cli-driver-flag-conflict');
  return ok({ kind: 'mysql' });
};

export const parseDriverFlags = (
  argv: readonly string[],
): Result<ParsedDriverArgs, DriverFlagsError> => {
  const flagsR = extractFlags(argv);
  if (!flagsR.ok) return flagsR;
  const flags = flagsR.value;

  if (flags.driverRaw !== null && !isKnownDriver(flags.driverRaw)) {
    return err('cli-driver-unknown');
  }

  const driverKind: DriverKind = (flags.driverRaw as DriverKind | null) ?? 'memory';

  const driverR = driverKind === 'memory' ? buildMemoryDriver(flags) : buildMysqlDriver(flags);
  if (!driverR.ok) return driverR;

  return ok({ driver: driverR.value, rest: flags.rest });
};
