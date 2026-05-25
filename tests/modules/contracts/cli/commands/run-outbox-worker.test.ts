/**
 * W0 — RED tests for `run-outbox-worker` CLI subcommand.
 *
 * All 4 cases will FAIL until the subcommand is implemented (W1).
 * The failure mode is "module not found" — canonical W0 RED state.
 *
 * Cenários:
 *   CA-T1: driver=memory → exit 1 + mensagem clara no stderr.
 *   CA-T2: flag inválida (--batch-size abc) → exit 64 (EX_USAGE).
 *   CA-T3: AbortController pré-abortado → runLoop retorna imediatamente, exit 0.
 *   CA-T4: --help → exit 0 + usage no stdout.
 */
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { run, help } from '#src/modules/contracts/cli/commands/run-outbox-worker.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryAmendmentRepository } from '#src/modules/contracts/adapters/persistence/repos/amendment-repository.in-memory.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import type { CliContext } from '#src/modules/contracts/cli/context.ts';

// ─── helpers ─────────────────────────────────────────────────────────────────

const FIXED_CLOCK = ClockFixed(new Date('2026-01-01T00:00:00.000Z'));

/**
 * Builds a minimal CliContext backed by InMemory adapters.
 * `driverKind` simulates what ctx.driver will expose after the W1 expansion —
 * used by the command to reject non-mysql drivers early (CA-T1).
 *
 * For CA-T3, driverKind='mysql' is passed so the command does NOT reject early;
 * the `--test-abort` flag signals the command to pre-abort its AbortController,
 * causing runLoop to return immediately.
 */
const buildTestContext = (driverKind: 'memory' | 'mysql'): CliContext => {
  const outbox = InMemoryOutbox();
  const contractHandle = InMemoryContractRepository(outbox.port);
  const amendmentHandle = InMemoryAmendmentRepository(outbox.port);

  return {
    contractRepo: contractHandle.repo,
    amendmentRepo: amendmentHandle.repo,
    clock: FIXED_CLOCK,
    driver: driverKind,
    // Mescla OutboxPort (append) + WorkerOutboxOps num único objeto,
    // espelhando o que os drivers de produção fazem (CA-9).
    outbox: {
      append: outbox.port.append,
      findPendingForUpdate: outbox.findPendingForUpdate,
      markProcessed: outbox.markProcessed,
      markFailed: outbox.markFailed,
      moveToDeadLetter: outbox.moveToDeadLetter,
    },
    persist: async () => {
      await Promise.resolve();
      return { ok: true as const, value: undefined };
    },
    shutdown: async () => {
      await Promise.resolve();
    },
  } as unknown as CliContext;
};

// ─── stdout/stderr capture ────────────────────────────────────────────────────

type Capture = Readonly<{ stdout: string; stderr: string }>;

const withCapture = async (fn: () => Promise<void>): Promise<Capture> => {
  const chunks: string[] = [];
  const errChunks: string[] = [];

  const origWrite = process.stdout.write.bind(process.stdout);
  const origErrWrite = process.stderr.write.bind(process.stderr);

  // Patch both streams — restored in finally.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (process.stdout as any).write = (chunk: unknown, ...rest: unknown[]): boolean => {
    chunks.push(String(chunk));
    return (origWrite as (...args: unknown[]) => boolean)(chunk, ...rest);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (process.stderr as any).write = (chunk: unknown, ...rest: unknown[]): boolean => {
    errChunks.push(String(chunk));
    return (origErrWrite as (...args: unknown[]) => boolean)(chunk, ...rest);
  };

  try {
    await fn();
  } finally {
    process.stdout.write = origWrite;
    process.stderr.write = origErrWrite;
  }

  return { stdout: chunks.join(''), stderr: errChunks.join('') };
};

// ─── tests ────────────────────────────────────────────────────────────────────

describe('run-outbox-worker CLI subcommand', () => {
  // CA-T1: driver=memory deve ser rejeitado com exit 1 + mensagem clara.
  it('CA-T1: rejeita driver memory com exit 1 e mensagem clara no stderr', async () => {
    // Arrange
    const ctx = buildTestContext('memory');
    const argv: readonly string[] = [];

    // Act
    let exitCode = -1;
    const cap = await withCapture(async () => {
      exitCode = await run(ctx, argv);
    });

    // Assert
    assert.equal(exitCode, 1, 'exit code deve ser 1 para driver memory');
    assert.ok(cap.stderr.length > 0, 'stderr deve conter mensagem de erro');
    assert.ok(
      cap.stderr.toLowerCase().includes('mysql') || cap.stderr.toLowerCase().includes('driver'),
      `stderr deve mencionar "mysql" ou "driver" — recebido: ${cap.stderr}`,
    );
  });

  // CA-T2: flag inválida --batch-size abc → exit 64 (EX_USAGE).
  it('CA-T2: flag inválida (--batch-size abc) retorna exit 64', async () => {
    // Arrange
    const ctx = buildTestContext('mysql');
    const argv: readonly string[] = ['--batch-size', 'abc'];

    // Act
    let exitCode = -1;
    const cap = await withCapture(async () => {
      exitCode = await run(ctx, argv);
    });

    // Assert
    assert.equal(exitCode, 64, 'exit code deve ser 64 (EX_USAGE) para flag inválida');
    assert.ok(cap.stderr.length > 0, 'stderr deve conter mensagem sobre flag inválida');
  });

  // CA-T3: AbortController pré-abortado → runLoop retorna imediatamente, exit 0.
  // Usamos a flag de teste `--test-abort` que instrui o comando a pre-abortar
  // o AbortController antes de chamar runLoop — runLoop verifica signal.aborted
  // no primeiro while-check e retorna imediatamente. Determinístico, sem sleep real.
  it('CA-T3: AbortController pré-abortado → runLoop retorna imediatamente com exit 0', async () => {
    // Arrange
    const ctx = buildTestContext('mysql');
    const argv: readonly string[] = ['--test-abort'];

    // Act
    let exitCode = -1;
    const cap = await withCapture(async () => {
      exitCode = await run(ctx, argv);
    });

    // Assert
    assert.equal(exitCode, 0, 'exit code deve ser 0 em shutdown limpo');
    assert.ok(
      cap.stdout.includes('stats') ||
        cap.stdout.includes('shutdown') ||
        cap.stdout.includes('Worker') ||
        cap.stdout.includes('iterations'),
      `stdout deve conter stats/shutdown — recebido: ${cap.stdout}`,
    );
  });

  // CA-T4: --help → exit 0 + usage.
  it('CA-T4: --help retorna exit 0 e escreve help no stdout', async () => {
    // Arrange — driver memory é OK aqui: --help é verificado antes da validação de driver.
    const ctx = buildTestContext('memory');
    const argv: readonly string[] = ['--help'];

    // Act
    let exitCode = -1;
    const cap = await withCapture(async () => {
      exitCode = await run(ctx, argv);
    });

    // Assert
    assert.equal(exitCode, 0, 'exit code deve ser 0 para --help');
    assert.ok(cap.stdout.length > 0, 'stdout deve conter o texto de help');
    assert.ok(
      cap.stdout.includes('run-outbox-worker') || cap.stdout.includes('batch-size'),
      `stdout deve conter nome do comando ou flags — recebido: ${cap.stdout}`,
    );
    // Confirmar que o export `help` existe e contém informação relevante.
    assert.ok(
      typeof help === 'string' && help.length > 0,
      'export `help` deve ser string não-vazia',
    );
  });
});
