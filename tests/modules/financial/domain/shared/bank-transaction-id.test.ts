import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as BankTransactionId from '#src/modules/financial/domain/shared/bank-transaction-id.ts';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_V4 = 'deadbeef-1234-4abc-9def-fedcba987654';
const VALID_V4_UPPER = 'DEADBEEF-1234-4ABC-9DEF-FEDCBA987654';
const V1_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('BankTransactionId — module-as-namespace (Padrão D)', () => {
  it('module is importable via `import * as BankTransactionId` (Padrão D smoke)', () => {
    // Arrange
    const ns: Readonly<Record<string, unknown>> = BankTransactionId;
    // Act / Assert
    assert.equal(typeof ns.generate, 'function');
    assert.equal(typeof ns.rehydrate, 'function');
  });

  it("does NOT expose a nested `BankTransactionId` namespace-object (DON'T B§7)", () => {
    // Arrange / Act
    const ns: Readonly<Record<string, unknown>> = BankTransactionId;
    // Assert
    assert.equal(ns.BankTransactionId, undefined);
  });
});

describe('BankTransactionId — generate', () => {
  it('returns a v4 UUID string', () => {
    // Arrange / Act
    const id = BankTransactionId.generate();
    // Assert
    assert.match(id as unknown as string, UUID_V4_REGEX);
  });

  it('returns distinct values on consecutive calls', () => {
    // Arrange / Act
    const a = BankTransactionId.generate();
    const b = BankTransactionId.generate();
    // Assert
    assert.notEqual(a, b);
  });
});

describe('BankTransactionId — rehydrate', () => {
  it('accepts a valid v4 UUID', () => {
    // Arrange / Act
    const r = BankTransactionId.rehydrate(VALID_V4);
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value as unknown as string, VALID_V4);
  });

  it('accepts uppercase hex digits (case-insensitive)', () => {
    // Arrange / Act
    const r = BankTransactionId.rehydrate(VALID_V4_UPPER);
    // Assert
    assert.equal(isOk(r), true);
  });

  it('rejects empty string', () => {
    // Arrange / Act
    const r = BankTransactionId.rehydrate('');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bank-transaction-id-invalid');
  });

  it('rejects non-UUID string', () => {
    // Arrange / Act
    const r = BankTransactionId.rehydrate('not-a-uuid');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bank-transaction-id-invalid');
  });

  it('rejects UUID v1 (wrong version)', () => {
    // Arrange / Act
    const r = BankTransactionId.rehydrate(V1_UUID);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bank-transaction-id-invalid');
  });

  it('rejects UUID with trailing whitespace', () => {
    // Arrange / Act
    const r = BankTransactionId.rehydrate(`${VALID_V4} `);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bank-transaction-id-invalid');
  });
});
