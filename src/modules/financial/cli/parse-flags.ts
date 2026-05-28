import { type Result, ok, err } from '#src/shared/primitives/result.ts';

/**
 * Parser genérico de flags long-form (`--flag value` ou `--flag=value`).
 *
 * Pattern espelha `src/modules/contracts/cli/parse-flags.ts` — **lógica
 * funcionalmente idêntica** (mesma detecção de flag duplicada e mesmo
 * `validateAllowedFlags`); diffs intencionais:
 *   - Imports via `#src/*` subpath em vez de relativo (`../../../`).
 *   - Header doc e JSDoc próprios; comentários "REGR #9 / #10" específicos
 *     do contracts substituídos por JSDoc genérico.
 *
 * Detecta flag duplicada para evitar "last value wins" silencioso em ataques
 * tipo `--id A --id B` (REGR herdada do contracts).
 *
 * **Consumidores esperados:** `FIN-CLI-APROVAR-TITULO` (primeiro subcomando a
 * usar `parseFlags` + `validateAllowedFlags` para parsear `--payable-id` /
 * `--approved-by`). Se o ticket NÃO os usar, este arquivo vira candidato a
 * remoção (dead code).
 */

export type ParsedFlags = Readonly<Record<string, string>>;

export type ParseFlagsError =
  | Readonly<{ kind: 'cli-flag-duplicated'; flag: string }>
  | Readonly<{ kind: 'cli-flag-unknown'; flag: string }>;

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

/**
 * Valida que toda flag presente em `flags` está na allowlist `allowed`.
 * Retorna `cli-flag-unknown` ao primeiro flag fora da lista — útil para o
 * subcomando rejeitar typos (e.g., `--no-stat` em vez de `--no-state`).
 */
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
