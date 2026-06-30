import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { DocumentId, PayableId } from '#src/modules/financial/domain/shared/ids.ts';

const VALID_V4 = '7f3a1234-5678-4abc-9def-fedcba987654';

describe('financial/domain/shared/ids — DocumentId', () => {
  it('gera um id que ele próprio reidrata (round-trip)', () => {
    assert.equal(isOk(DocumentId.rehydrate(DocumentId.generate())), true);
  });

  it('reidrata UUID v4 válido', () => {
    assert.equal(isOk(DocumentId.rehydrate(VALID_V4)), true);
  });

  it('rejeita id malformado', () => {
    assert.equal(isErr(DocumentId.rehydrate('nope')), true);
    assert.equal(isErr(DocumentId.rehydrate('')), true);
  });
});

describe('financial/domain/shared/ids — PayableId', () => {
  it('gera um id que ele próprio reidrata (round-trip)', () => {
    assert.equal(isOk(PayableId.rehydrate(PayableId.generate())), true);
  });

  it('reidrata UUID v4 válido', () => {
    assert.equal(isOk(PayableId.rehydrate(VALID_V4)), true);
  });

  it('rejeita id malformado', () => {
    assert.equal(isErr(PayableId.rehydrate('nope')), true);
    assert.equal(isErr(PayableId.rehydrate('')), true);
  });
});
