import { type Result, ok, err } from '../../../shared/primitives/result.ts';

// ADR-0020: drivers vivos são `memory` e `mysql`.
// `memory` recebe `--state <path>` ou `--no-state`.
// `mysql` recebe a connection string via `--connection-string`.

export type DriverKind = 'memory' | 'mysql';

export type DriverFlags = Readonly<
  { kind: 'memory'; statePath: string | null } | { kind: 'mysql'; connectionString: string }
>;

export type DriverFlagsError =
  | 'cli-driver-unknown'
  | 'cli-driver-flag-conflict'
  | 'cli-driver-missing-value';

export const DEFAULT_MEMORY_STATE_PATH = './cli-state.json';

export type ParsedDriverArgs = Readonly<{
  driver: DriverFlags;
  rest: readonly string[];
}>;

const KNOWN_DRIVERS: readonly DriverKind[] = ['memory', 'mysql'];
const isKnownDriver = (s: string): s is DriverKind =>
  (KNOWN_DRIVERS as readonly string[]).includes(s);

// Parse de `--driver` e flags por driver:
//  - `memory`: `--state <path>` (default `./cli-state.json`) ou `--no-state` (ephemeral).
//  - `mysql`: `--connection-string mysql://user:pass@host:port/db`.
// Forma `--flag=valor` e `--flag valor` ambas aceitas.
type RawFlags = Readonly<{
  driverRaw: string | null;
  statePath: string | null;
  noState: boolean;
  connectionString: string | null;
  rest: readonly string[];
}>;

const extractFlags = (argv: readonly string[]): Result<RawFlags, DriverFlagsError> => {
  let driverRaw: string | null = null;
  let statePath: string | null = null;
  let noState = false;
  let connectionString: string | null = null;
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === undefined) continue;

    if (token === '--driver' || token === '--state' || token === '--connection-string') {
      const next = argv[i + 1];
      if (next === undefined || next === '' || next.startsWith('--')) {
        return err('cli-driver-missing-value');
      }
      if (token === '--driver') driverRaw = next;
      else if (token === '--state') statePath = next;
      else connectionString = next;
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
    if (token.startsWith('--connection-string=')) {
      connectionString = token.slice('--connection-string='.length);
      if (connectionString === '') return err('cli-driver-missing-value');
      continue;
    }
    if (token === '--no-state') {
      noState = true;
      continue;
    }
    rest.push(token);
  }

  return ok({ driverRaw, statePath, noState, connectionString, rest });
};

const buildMemoryDriver = (flags: RawFlags): Result<DriverFlags, DriverFlagsError> => {
  if (flags.connectionString !== null) return err('cli-driver-flag-conflict');
  if (flags.statePath !== null && flags.noState) return err('cli-driver-flag-conflict');
  if (flags.noState) return ok({ kind: 'memory', statePath: null });
  return ok({ kind: 'memory', statePath: flags.statePath ?? DEFAULT_MEMORY_STATE_PATH });
};

const buildMysqlDriver = (flags: RawFlags): Result<DriverFlags, DriverFlagsError> => {
  if (flags.statePath !== null || flags.noState) return err('cli-driver-flag-conflict');
  if (flags.connectionString === null) return err('cli-driver-missing-value');
  return ok({ kind: 'mysql', connectionString: flags.connectionString });
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
