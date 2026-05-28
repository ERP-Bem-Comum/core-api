/**
 * CTR-NODE-CORRELATION-ALS — W0 (RED)
 *
 * Cobre CA1, CA2, CA3 do ticket.
 *
 * Estado W0: RED — `src/shared/observability/correlation.ts` não existe →
 *   import falha com ERR_MODULE_NOT_FOUND.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  runWithCorrelation,
  withNewCorrelation,
  currentCorrelationId,
} from '#src/shared/observability/correlation.ts';

describe('correlation (AsyncLocalStorage)', () => {
  it('CA1: retorna undefined fora de qualquer escopo', () => {
    assert.equal(currentCorrelationId(), undefined);
  });

  it('CA2: expõe o id dentro de runWithCorrelation, inclusive após await', async () => {
    await runWithCorrelation('abc', async () => {
      assert.equal(currentCorrelationId(), 'abc');
      await Promise.resolve();
      assert.equal(currentCorrelationId(), 'abc');
    });
    // escopo encerrado → volta a undefined
    assert.equal(currentCorrelationId(), undefined);
  });

  it('CA3: withNewCorrelation gera UUID v4 distinto por chamada', () => {
    const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    const id1 = withNewCorrelation(() => currentCorrelationId());
    const id2 = withNewCorrelation(() => currentCorrelationId());
    assert.match(id1 ?? '', uuidV4);
    assert.match(id2 ?? '', uuidV4);
    assert.notEqual(id1, id2);
  });

  it('CA3: escopos aninhados não vazam — o interno sobrepõe, o externo é restaurado', () => {
    runWithCorrelation('outer', () => {
      assert.equal(currentCorrelationId(), 'outer');
      runWithCorrelation('inner', () => {
        assert.equal(currentCorrelationId(), 'inner');
      });
      assert.equal(currentCorrelationId(), 'outer');
    });
  });

  it('CA2: retorna o valor produzido por fn', () => {
    const out = runWithCorrelation('x', () => 42);
    assert.equal(out, 42);
  });
});
