import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, isErr, isOk } from '#src/shared/index.ts';
import {
  AmendmentId,
  ContractId,
  DocumentId,
  UserRef,
} from '#src/modules/contracts/domain/shared/ids.ts';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_V4 = '7f3a1234-5678-4abc-9def-fedcba987654';
const VALID_V4_UPPER = '7F3A1234-5678-4ABC-9DEF-FEDCBA987654';
const V1_UUID = '123e4567-e89b-12d3-a456-426614174000';

type IdNamespace<Tag extends string, Err extends string> = Readonly<{
  generate: () => Tag;
  rehydrate: (raw: string) => Result<Tag, Err>;
}>;

const runIdNamespaceSuite = <Tag extends string, Err extends string>(
  name: string,
  Id: IdNamespace<Tag, Err>,
  errorCode: Err,
): void => {
  describe(`${name} — generate`, () => {
    it('returns a v4 UUID string', () => {
      const id = Id.generate();
      assert.match(id as unknown as string, UUID_V4_REGEX);
    });

    it('returns distinct values on consecutive calls', () => {
      const a = Id.generate();
      const b = Id.generate();
      assert.notEqual(a, b);
    });
  });

  describe(`${name} — rehydrate`, () => {
    it('accepts a valid v4 UUID', () => {
      const r = Id.rehydrate(VALID_V4);
      assert.equal(isOk(r), true);
      if (r.ok) assert.equal(r.value as unknown as string, VALID_V4);
    });

    it('accepts uppercase hex digits (case-insensitive)', () => {
      const r = Id.rehydrate(VALID_V4_UPPER);
      assert.equal(isOk(r), true);
    });

    it('rejects empty string', () => {
      const r = Id.rehydrate('');
      assert.equal(isErr(r), true);
      if (!r.ok) assert.equal(r.error, errorCode);
    });

    it('rejects non-UUID string', () => {
      const r = Id.rehydrate('not-a-uuid');
      assert.equal(isErr(r), true);
      if (!r.ok) assert.equal(r.error, errorCode);
    });

    it('rejects UUID v1 (wrong version)', () => {
      const r = Id.rehydrate(V1_UUID);
      assert.equal(isErr(r), true);
      if (!r.ok) assert.equal(r.error, errorCode);
    });

    it('rejects UUID with trailing whitespace', () => {
      const r = Id.rehydrate(`${VALID_V4} `);
      assert.equal(isErr(r), true);
      if (!r.ok) assert.equal(r.error, errorCode);
    });
  });
};

runIdNamespaceSuite('ContractId', ContractId, 'contract-id-invalid');
runIdNamespaceSuite('AmendmentId', AmendmentId, 'amendment-id-invalid');
runIdNamespaceSuite('DocumentId', DocumentId, 'document-id-invalid');

describe('UserRef — rehydrate', () => {
  it('accepts a valid v4 UUID', () => {
    const r = UserRef.rehydrate(VALID_V4);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value as unknown as string, VALID_V4);
  });

  it('rejects empty string', () => {
    const r = UserRef.rehydrate('');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'user-ref-invalid');
  });

  it('rejects non-UUID string', () => {
    const r = UserRef.rehydrate('not-a-uuid');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'user-ref-invalid');
  });

  it('rejects UUID v1 (wrong version)', () => {
    const r = UserRef.rehydrate(V1_UUID);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'user-ref-invalid');
  });
});
