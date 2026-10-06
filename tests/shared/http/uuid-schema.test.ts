import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as z from 'zod/v4';

import { uuidV4 } from '#src/shared/http/uuid-schema.ts';
import { isUuidV4, newUuid } from '#src/shared/utils/id.ts';

const NIL = '00000000-0000-0000-0000-000000000000';
const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const V1 = 'c232ab00-9414-11ec-b3c8-9f6bdeced846';
const V5 = '886313e1-3b8a-5372-9b90-0c9aee199e5d';

describe('uuidV4 (schema de borda)', () => {
  it('aceita UUID v4 gerado por newUuid', () => {
    const id = newUuid();
    assert.equal(uuidV4().safeParse(id).success, true);
  });

  it('recusa UUID bem formado que não é v4 (nil, max, v1, v5)', () => {
    for (const raw of [NIL, MAX, V1, V5]) {
      assert.equal(uuidV4().safeParse(raw).success, false, raw);
    }
  });

  it('recusa o que não é UUID', () => {
    for (const raw of ['', 'abc', 'budget-results', 123, null, undefined]) {
      assert.equal(uuidV4().safeParse(raw).success, false, String(raw));
    }
  });

  it('casa com isUuidV4 do domínio nos mesmos insumos', () => {
    for (const raw of [newUuid(), NIL, MAX, V1, V5, 'abc']) {
      assert.equal(uuidV4().safeParse(raw).success, isUuidV4(raw), raw);
    }
  });

  it('o erro carrega mensagem clara', () => {
    const r = uuidV4().safeParse(NIL);
    assert.equal(r.success, false);
    assert.match(r.error?.issues[0]?.message ?? '', /UUID v4/);
  });

  it('compõe com .optional(), .nullable() e .meta()', () => {
    const schema = z.object({
      a: uuidV4().optional(),
      b: uuidV4().nullable(),
      c: uuidV4().meta({ description: 'x' }),
    });
    assert.equal(schema.safeParse({ b: null, c: newUuid() }).success, true);
    assert.equal(schema.safeParse({ b: NIL, c: newUuid() }).success, false);
  });
});
