/**
 * PAR-SUPPLIER-AVALIACAO — W0 (RED) — VO ServiceRating (Standard Type, Vernon p.307).
 *
 * DEVE FALHAR: `service-rating.ts` ainda não existe. GREEN no W1.
 *
 * Conjunto fechado de níveis de avaliação (RUIM/REGULAR/BOM/OTIMO). Smart constructor
 * normaliza (trim + uppercase) e rejeita valor fora do conjunto → 'invalid-service-rating'
 * (impede estado inválido — o argumento "doolars" de Vernon).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as ServiceRating from '#src/modules/partners/domain/supplier/service-rating.ts';

describe('ServiceRating.parse', () => {
  it('aceita os quatro níveis canônicos', () => {
    for (const r of ['RUIM', 'REGULAR', 'BOM', 'OTIMO']) {
      assert.equal(isOk(ServiceRating.parse(r)), true, `deveria aceitar ${r}`);
    }
  });

  it('normaliza trim + uppercase', () => {
    const r = ServiceRating.parse('  bom  ');
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value, 'BOM');
  });

  it('rejeita valor desconhecido → invalid-service-rating', () => {
    const r = ServiceRating.parse('EXCELENTE');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-service-rating');
  });

  it('rejeita string vazia', () => {
    assert.equal(isErr(ServiceRating.parse('')), true);
  });
});

describe('ServiceRating.listServiceRatings', () => {
  it('retorna o catálogo canônico (4 níveis, na ordem do pior ao melhor)', () => {
    assert.deepEqual([...ServiceRating.listServiceRatings()], ['RUIM', 'REGULAR', 'BOM', 'OTIMO']);
  });
});
