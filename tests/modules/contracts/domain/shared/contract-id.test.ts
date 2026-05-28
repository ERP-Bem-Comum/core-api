import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_V4 = '7f3a1234-5678-4abc-9def-fedcba987654';
const VALID_V4_UPPER = '7F3A1234-5678-4ABC-9DEF-FEDCBA987654';
const V1_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('ContractId — module-as-namespace (Padrão D)', () => {
  it('module is importable via `import * as ContractId` (Padrão D smoke)', () => {
    // Arrange
    const ns: Readonly<Record<string, unknown>> = ContractId;
    // Act / Assert
    assert.equal(typeof ns.generate, 'function');
    assert.equal(typeof ns.rehydrate, 'function');
  });

  it("does NOT expose a nested `ContractId` namespace-object (DON'T B§7)", () => {
    // Arrange / Act
    const ns: Readonly<Record<string, unknown>> = ContractId;
    // Assert
    assert.equal(ns.ContractId, undefined);
  });
});

describe('ContractId — generate', () => {
  it('returns a v4 UUID string', () => {
    // Arrange / Act
    const id = ContractId.generate();
    // Assert
    assert.match(id as unknown as string, UUID_V4_REGEX);
  });

  it('returns distinct values on consecutive calls', () => {
    // Arrange / Act
    const a = ContractId.generate();
    const b = ContractId.generate();
    // Assert
    assert.notEqual(a, b);
  });
});

describe('ContractId — rehydrate', () => {
  it('accepts a valid v4 UUID', () => {
    // Arrange / Act
    const r = ContractId.rehydrate(VALID_V4);
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value as unknown as string, VALID_V4);
  });

  it('accepts uppercase hex digits (case-insensitive)', () => {
    // Arrange / Act
    const r = ContractId.rehydrate(VALID_V4_UPPER);
    // Assert
    assert.equal(isOk(r), true);
  });

  it('rejects empty string', () => {
    // Arrange / Act
    const r = ContractId.rehydrate('');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-id-invalid');
  });

  it('rejects non-UUID string', () => {
    // Arrange / Act
    const r = ContractId.rehydrate('not-a-uuid');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-id-invalid');
  });

  it('rejects UUID v1 (wrong version)', () => {
    // Arrange / Act
    const r = ContractId.rehydrate(V1_UUID);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-id-invalid');
  });

  it('rejects UUID with trailing whitespace', () => {
    // Arrange / Act
    const r = ContractId.rehydrate(`${VALID_V4} `);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-id-invalid');
  });
});
