/**
 * BATCH-PARTNERS-SUPPLIERS · W0 (#356) — schema de entrada do `POST /api/v2/partners/suppliers:batch`.
 * DEVE FALHAR até existir `suppliersBatchBodySchema` em `supplier-schemas.ts` (W1).
 *
 * Contrato (#350 / ADR-0049): `{ refs: z.array(z.uuid()).min(1).max(200) }` — espelha o
 * `batchBodySchema` de escrita (teto 200, deliberadamente < 500). CA3 (uuid mal-formado → rejeita),
 * CA6 (>200 → rejeita). Fundamento: OWASP AI Exchange, l.3735 — "denial-of-service input validation:
 * input validation and sanitization to reject or correct malicious (e.g. very large) content".
 */
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { suppliersBatchBodySchema } from '#src/modules/partners/adapters/http/supplier-schemas.ts';

const uuid = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('suppliersBatchBodySchema (#356)', () => {
  it('CA1(shape) — aceita 1..200 refs uuid válidos', () => {
    const r = suppliersBatchBodySchema.safeParse({ refs: [uuid(1), uuid(2)] });
    assert.equal(r.success, true);
  });

  it('CA3 — rejeita uuid mal-formado no array', () => {
    const r = suppliersBatchBodySchema.safeParse({ refs: [uuid(1), 'not-a-uuid'] });
    assert.equal(r.success, false);
  });

  it('CA6 — rejeita > 200 refs (teto anti-DoS)', () => {
    const refs = Array.from({ length: 201 }, (_, i) => uuid(i));
    const r = suppliersBatchBodySchema.safeParse({ refs });
    assert.equal(r.success, false);
  });

  it('rejeita lista vazia (min 1)', () => {
    const r = suppliersBatchBodySchema.safeParse({ refs: [] });
    assert.equal(r.success, false);
  });
});
