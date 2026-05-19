import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { rmSync, existsSync } from 'node:fs';

// Decisão D2 do ticket: isolamento via tmpdir() + UUID — sem race conditions
// entre testes paralelos. Cleanup via `removeStateFile`.
export const newStateFile = (): string => join(tmpdir(), `ctr-e2e-${randomUUID()}.json`);

export const removeStateFile = (path: string): void => {
  if (existsSync(path)) {
    rmSync(path, { force: true });
  }
};
