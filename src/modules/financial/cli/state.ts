/**
 * State file da CLI do módulo Financial — persistência local opcional para
 * driver `memory`.
 *
 * Pattern espelha `src/modules/contracts/cli/state.ts` mas é enxuto:
 *   - 1 agregado (Payable) em vez de 3.
 *   - Validação `isValidPayable` pragmática (id + status + datas críticas);
 *     revalidação profunda de Money/BeneficiaryBankData via mappers Drizzle
 *     fica fora deste ticket (`FIN-ADAPTER-DRIZZLE-PAYABLE` traz os mappers
 *     reais; até lá, confiamos no JSON gerado pelo próprio adapter InMemory).
 *
 * Atomicidade do save: `writeFileSync` em `${path}.tmp.${uuid}` + `renameSync`
 * — POSIX rename(2) é atômico no mesmo FS.
 *
 * Lock: `openSync('wx')` em `${path}.lock` com retry curto. Garante
 * read-modify-write seguro entre processos concorrentes.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  renameSync,
  unlinkSync,
  openSync,
  closeSync,
  rmSync,
  statSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { isUuidV4 } from '#src/shared/utils/id.ts';
import type { Payable, PayableStatus } from '#src/modules/financial/domain/payable/types.ts';
import type { InMemoryPayableRepositoryHandle } from '#src/modules/financial/adapters/persistence/repos/payable-repository.in-memory.ts';

export type StateError =
  | 'state-file-not-readable'
  | 'state-file-corrupted'
  | 'state-schema-invalid'
  | 'state-entity-invalid'
  | 'state-file-not-writable'
  | 'state-concurrent-lock';

// ─── Date reviver ─────────────────────────────────────────────────────────────

const DATE_KEYS = new Set([
  'openedAt',
  'dueDate',
  'approvedAt',
  'transmittedAt',
  'rejectedAt',
  'markedOverdueAt',
  'paidAt',
  'bankPaymentDate',
  'settledAt',
]);

const reviver = (key: string, value: unknown): unknown => {
  if (DATE_KEYS.has(key) && typeof value === 'string') {
    return new Date(value);
  }
  return value;
};

// ─── Snapshot shape ───────────────────────────────────────────────────────────

type Snapshot = Readonly<{
  payables: readonly Payable[];
}>;

const isSnapshot = (v: unknown): v is { payables: readonly unknown[] } => {
  if (typeof v !== 'object' || v === null) return false;
  const candidate = v as { payables?: unknown };
  return Array.isArray(candidate.payables);
};

// ─── Payable validation (pragmática) ──────────────────────────────────────────

const PAYABLE_STATUSES: ReadonlySet<PayableStatus> = new Set([
  'Open',
  'Approved',
  'Transmitted',
  'Rejected',
  'Overdue',
  'Paid',
  'Settled',
]);

const isValidDateInstance = (d: unknown): d is Date =>
  d instanceof Date && !Number.isNaN(d.getTime());

const isValidPayable = (raw: unknown): raw is Payable => {
  if (typeof raw !== 'object' || raw === null) return false;
  const p = raw as Record<string, unknown>;

  if (typeof p['id'] !== 'string' || !isUuidV4(p['id'])) return false;
  if (typeof p['status'] !== 'string' || !PAYABLE_STATUSES.has(p['status'] as PayableStatus)) {
    return false;
  }
  if (p['kind'] !== 'Principal' && p['kind'] !== 'Tax') return false;
  if (p['paymentMethod'] !== 'BankRemittance' && p['paymentMethod'] !== 'ManualExternal') {
    return false;
  }
  if (!isValidDateInstance(p['openedAt'])) return false;
  if (!isValidDateInstance(p['dueDate'])) return false;
  // Datas opcionais por status — checadas só se presentes (mesmo princípio do contracts).
  if (p['approvedAt'] !== undefined && !isValidDateInstance(p['approvedAt'])) return false;
  if (p['transmittedAt'] !== undefined && !isValidDateInstance(p['transmittedAt'])) return false;
  if (p['rejectedAt'] !== undefined && !isValidDateInstance(p['rejectedAt'])) return false;
  if (p['markedOverdueAt'] !== undefined && !isValidDateInstance(p['markedOverdueAt']))
    return false;
  if (p['paidAt'] !== undefined && !isValidDateInstance(p['paidAt'])) return false;
  if (p['bankPaymentDate'] !== undefined && !isValidDateInstance(p['bankPaymentDate']))
    return false;
  if (p['settledAt'] !== undefined && !isValidDateInstance(p['settledAt'])) return false;
  return true;
};

// ─── Lock ─────────────────────────────────────────────────────────────────────

const LOCK_RETRY_DELAY_MS = 30;
const LOCK_RETRY_MAX = 50;

const lockPathFor = (statePath: string): string => `${statePath}.lock`;

const acquireLock = (statePath: string): Result<string, 'state-concurrent-lock'> => {
  const lockPath = lockPathFor(statePath);
  for (let attempt = 0; attempt < LOCK_RETRY_MAX; attempt++) {
    try {
      const fd = openSync(lockPath, 'wx');
      closeSync(fd);
      return ok(lockPath);
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      if (code !== 'EEXIST') {
        return err('state-concurrent-lock');
      }
      const target = Date.now() + LOCK_RETRY_DELAY_MS;
      while (Date.now() < target) {
        // busy-wait curto — aceitável para CLI single-thread.
      }
    }
  }
  return err('state-concurrent-lock');
};

const releaseLock = (lockPath: string): void => {
  try {
    rmSync(lockPath, { force: true });
  } catch {
    // Best-effort cleanup; lock será limpo na próxima execução.
  }
};

// ─── loadState / saveState ────────────────────────────────────────────────────

export const loadState = (
  path: string,
  handle: InMemoryPayableRepositoryHandle,
): Result<void, StateError> => {
  // Arquivo ausente é OK (primeira execução do CLI — saveState cria depois).
  // Pattern alinhado com `contracts/cli/state.ts:324`.
  if (!existsSync(path)) return ok(undefined);

  try {
    const stat = statSync(path);
    if (!stat.isFile()) return err('state-file-not-readable');
  } catch {
    return err('state-file-not-readable');
  }

  const readResult = ((): Result<string, StateError> => {
    try {
      return ok(readFileSync(path, 'utf-8'));
    } catch {
      return err('state-file-not-readable');
    }
  })();
  if (!readResult.ok) return readResult;
  if (readResult.value.trim() === '') return ok(undefined);

  const parseResult = ((): Result<unknown, StateError> => {
    try {
      return ok(JSON.parse(readResult.value, reviver));
    } catch {
      return err('state-file-corrupted');
    }
  })();
  if (!parseResult.ok) return parseResult;
  const parsed = parseResult.value;

  if (!isSnapshot(parsed)) return err('state-schema-invalid');

  for (const raw of parsed.payables) {
    if (!isValidPayable(raw)) return err('state-entity-invalid');
  }

  // Restauração: eventos já foram emitidos quando os agregados foram criados.
  // Passa `[]` para satisfazer a assinatura `save(payable, events)`.
  for (const p of parsed.payables as readonly Payable[]) {
    void handle.repo.save(p, []);
  }
  return ok(undefined);
};

export const saveState = (
  path: string,
  handle: InMemoryPayableRepositoryHandle,
): Result<void, StateError> => {
  const snapshot: Snapshot = {
    payables: handle.store(),
  };
  const tmpPath = `${path}.tmp.${randomUUID()}`;
  try {
    writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2), 'utf-8');
  } catch {
    return err('state-file-not-writable');
  }
  try {
    renameSync(tmpPath, path);
    return ok(undefined);
  } catch {
    try {
      unlinkSync(tmpPath);
    } catch {
      // Best-effort cleanup.
    }
    return err('state-file-not-writable');
  }
};

// ─── Public lock helpers ──────────────────────────────────────────────────────

export const acquireStateLock = (statePath: string): Result<string, 'state-concurrent-lock'> =>
  acquireLock(statePath);

export const releaseStateLock = (lockPath: string): void => {
  releaseLock(lockPath);
};
