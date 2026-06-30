/**
 * Atomic IO para STATE.json (tmpfile + rename).
 *
 * Ticket: CTR-PIPELINE-STATE-JSON (W1).
 *
 * **Atomicidade via DI explícita** (`opts.rename`): permite ao test simular
 * falha sem depender de `t.mock.method` sobre `node:fs/promises` — propriedades
 * de módulos nativos não são `configurable`, então mock.method falha com
 * "Cannot redefine property". O 3º arg `opts` é opcional; callers de produção
 * sempre usam as funções reais do `fsp`.
 */

import * as fsp from 'node:fs/promises';
import { join } from 'node:path';

import { type Result, ok, err } from '../../src/shared/primitives/result.ts';

import { parsePipelineState, type PipelineState } from './state-schema.ts';

const STATE_FILENAME = 'STATE.json';
const TMP_FILENAME = 'STATE.json.tmp';

export type ReadError =
  | Readonly<{ tag: 'ReadFileFailed'; reason: string }>
  | Readonly<{ tag: 'ParseFailed'; reason: string }>;

export type WriteError = Readonly<{ tag: 'WriteFailed'; reason: string }>;

export type WriteStateOptions = Readonly<{
  writeFile?: typeof fsp.writeFile;
  rename?: typeof fsp.rename;
  unlink?: typeof fsp.unlink;
}>;

const readRaw = async (path: string): Promise<Result<string, ReadError>> => {
  try {
    return ok(await fsp.readFile(path, 'utf8'));
  } catch (e) {
    return err({ tag: 'ReadFileFailed', reason: (e as Error).message });
  }
};

export const readState = async (ticketDir: string): Promise<Result<PipelineState, ReadError>> => {
  const raw = await readRaw(join(ticketDir, STATE_FILENAME));
  if (!raw.ok) return raw;
  const parsed = parsePipelineState(raw.value);
  if (!parsed.ok) {
    return err({ tag: 'ParseFailed', reason: JSON.stringify(parsed.error) });
  }
  return ok(parsed.value);
};

export const writeState = async (
  ticketDir: string,
  state: PipelineState,
  opts: WriteStateOptions = {},
): Promise<Result<void, WriteError>> => {
  const writeFile = opts.writeFile ?? fsp.writeFile;
  const rename = opts.rename ?? fsp.rename;
  const unlink = opts.unlink ?? fsp.unlink;

  const tmpPath = join(ticketDir, TMP_FILENAME);
  const finalPath = join(ticketDir, STATE_FILENAME);

  const payload = `${JSON.stringify(state, null, 2)}\n`;

  try {
    await writeFile(tmpPath, payload, 'utf8');
  } catch (e) {
    return err({ tag: 'WriteFailed', reason: `writeFile tmp failed: ${(e as Error).message}` });
  }

  try {
    await rename(tmpPath, finalPath);
  } catch (e) {
    try {
      await unlink(tmpPath);
    } catch {
      // best-effort cleanup
    }
    return err({ tag: 'WriteFailed', reason: `rename failed: ${(e as Error).message}` });
  }

  return ok(undefined);
};
