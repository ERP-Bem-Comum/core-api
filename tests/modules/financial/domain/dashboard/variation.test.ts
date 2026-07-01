/**
 * FIN-DASHBOARD-VARIATION (#237) · W0 — motor de variação (domínio puro). M-1 vs M-2.
 * DEVE FALHAR em W0 (`variation.ts` inexistente).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  calculateVariation,
  calculatePercentage,
  monthWindow,
  comparisonWindows,
} from '#src/modules/financial/domain/dashboard/variation.ts';

const iso = (d: Date): string => d.toISOString().slice(0, 10);

describe('financial/domain/dashboard — motor de variação (#237)', () => {
  it('CA1: calculateVariation = diferença assinada em centavos', () => {
    assert.equal(calculateVariation(1000, 800).absoluteCents, 200);
    assert.equal(calculateVariation(800, 1000).absoluteCents, -200);
    assert.equal(calculateVariation(0, 0).absoluteCents, 0);
  });

  it('CA2: calculatePercentage finito', () => {
    const up = calculatePercentage(1200, 1000);
    assert.equal(up.kind, 'value');
    if (up.kind === 'value') assert.equal(up.percent, 20);
    const down = calculatePercentage(900, 1000);
    assert.equal(down.kind, 'value');
    if (down.kind === 'value') assert.equal(down.percent, -10);
  });

  it('CA3: div/0 → no-change (0%) / new (+)', () => {
    assert.equal(calculatePercentage(0, 0).kind, 'no-change');
    assert.equal(calculatePercentage(500, 0).kind, 'new');
  });

  it('CA4: janelas M-1/M-2 (half-open UTC, rollover)', () => {
    const w = comparisonWindows(new Date('2026-06-15T00:00:00.000Z'));
    assert.equal(iso(w.m1.start), '2026-05-01');
    assert.equal(iso(w.m1.end), '2026-06-01');
    assert.equal(iso(w.m2.start), '2026-04-01');
    assert.equal(iso(w.m2.end), '2026-05-01');

    const jan = monthWindow(new Date('2026-01-15T00:00:00.000Z'), 1);
    assert.equal(iso(jan.start), '2025-12-01');
    assert.equal(iso(jan.end), '2026-01-01');
  });
});
