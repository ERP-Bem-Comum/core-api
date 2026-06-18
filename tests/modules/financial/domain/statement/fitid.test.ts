import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr } from '#src/shared/index.ts';
// W0 RED: o VO Fitid ainda não existe (src/modules/financial/domain/statement/fitid.ts).
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';

// Critérios de aceite em .claude/.pipeline/FIN-RECON-STATEMENT-DOMAIN/000-request.md (CA4, CA5).
describe('financial/domain/statement/fitid — VO Fitid', () => {
  it('CA5: fromNative aceita FITID nativo não-vazio e ≤ 64 chars', () => {
    const r = Fitid.fromNative('2024051800012345');
    assert.equal(r.ok, true);
  });

  it('CA5: fromNative rejeita vazio com invalid-fitid', () => {
    const r = Fitid.fromNative('');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-fitid');
  });

  it('CA5: fromNative rejeita raw com mais de 64 chars', () => {
    const r = Fitid.fromNative('x'.repeat(65));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-fitid');
  });

  it('CA4: synthesize é determinístico — mesma entrada produz a mesma Fitid', () => {
    const input = {
      debitAccountRef: 'acc-1',
      dateIso: '2024-05-18',
      valueCents: 845000,
      memo: 'NFS 2024-0537',
      seq: 3,
    };
    assert.equal(Fitid.synthesize(input), Fitid.synthesize({ ...input }));
  });

  it('CA4: synthesize distingue entradas diferentes (seq e valor)', () => {
    const base = {
      debitAccountRef: 'acc-1',
      dateIso: '2024-05-18',
      valueCents: 845000,
      memo: 'NFS 2024-0537',
      seq: 3,
    };
    assert.notEqual(Fitid.synthesize(base), Fitid.synthesize({ ...base, seq: 4 }));
    assert.notEqual(Fitid.synthesize(base), Fitid.synthesize({ ...base, valueCents: 845001 }));
  });

  it('rehydrate reconstrói uma Fitid válida a partir do banco', () => {
    const r = Fitid.rehydrate('2024051800012345');
    assert.equal(r.ok, true);
  });
});
