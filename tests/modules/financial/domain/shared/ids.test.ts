import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
// W0 RED: ids do módulo financial ainda não existem (criados na W1).
import { DocumentId, PayableId } from '#src/modules/financial/domain/shared/ids.ts';

const VALID_V4 = '7f3a1234-5678-4abc-9def-fedcba987654';

describe('financial/domain/shared/ids — DocumentId / PayableId', () => {
  for (const [name, Id] of [
    ['DocumentId', DocumentId],
    ['PayableId', PayableId],
  ] as const) {
    describe(name, () => {
      it('gera um id que ele próprio reidrata (round-trip)', () => {
        const generated = Id.generate();
        assert.equal(isOk(Id.rehydrate(generated as unknown as string)), true);
      });

      it('reidrata UUID v4 válido', () => {
        assert.equal(isOk(Id.rehydrate(VALID_V4)), true);
      });

      it('rejeita id malformado', () => {
        assert.equal(isErr(Id.rehydrate('nope')), true);
        assert.equal(isErr(Id.rehydrate('')), true);
      });
    });
  }
});
