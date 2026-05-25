import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';

const VALID_V4 = '7f3a1234-5678-4abc-9def-fedcba987654';
const V1_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('UserRef — module-as-namespace (Padrão D)', () => {
  it('module is importable via `import * as UserRef` (Padrão D smoke)', () => {
    // Arrange
    const ns: Readonly<Record<string, unknown>> = UserRef;
    // Act / Assert — UserRef NÃO tem `generate` (referência externa, vem de fora)
    assert.equal(typeof ns.rehydrate, 'function');
    assert.equal(ns.generate, undefined);
  });

  it("does NOT expose a nested `UserRef` namespace-object (DON'T B§7)", () => {
    // Arrange / Act
    const ns: Readonly<Record<string, unknown>> = UserRef;
    // Assert
    assert.equal(ns.UserRef, undefined);
  });
});

describe('UserRef — rehydrate', () => {
  it('accepts a valid v4 UUID', () => {
    // Arrange / Act
    const r = UserRef.rehydrate(VALID_V4);
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value as unknown as string, VALID_V4);
  });

  it('rejects empty string', () => {
    // Arrange / Act
    const r = UserRef.rehydrate('');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'user-ref-invalid');
  });

  it('rejects non-UUID string', () => {
    // Arrange / Act
    const r = UserRef.rehydrate('not-a-uuid');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'user-ref-invalid');
  });

  it('rejects UUID v1 (wrong version)', () => {
    // Arrange / Act
    const r = UserRef.rehydrate(V1_UUID);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'user-ref-invalid');
  });
});
