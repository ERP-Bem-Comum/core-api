import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr } from '#src/shared/index.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
// W0 RED: o domínio CedenteAccount ainda não existe.
import {
  create,
  isActive,
  isClosed,
  close,
} from '#src/modules/financial/domain/cedente/cedente-account.ts';

type Overrides = Partial<{
  bankCode: string;
  agency: string;
  accountNumber: string;
  accountDigit: string;
  convenio: string;
  document: string;
}>;

const validInput = (overrides: Overrides = {}) => ({
  id: CedenteAccountId.generate(),
  bankCode: '237',
  agency: '1234',
  accountNumber: '567890',
  accountDigit: '1',
  convenio: '9999999',
  document: '12345678000190',
  ...overrides,
});

// Critérios em .claude/.pipeline/FIN-CEDENTE-ACCOUNT/000-request.md (CA1–CA5).
describe('financial/domain/cedente/cedente-account — create', () => {
  it('CA1: campos válidos → ok; status Active e nextNsa 1 por default', () => {
    const r = create(validInput());
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.status, 'Active');
      assert.equal(r.value.nextNsa, 1);
    }
  });

  it('CA2: agency vazia → agency-required', () => {
    const r = create(validInput({ agency: '' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'agency-required');
  });

  it('CA3: accountNumber vazio → account-number-required', () => {
    const r = create(validInput({ accountNumber: '' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'account-number-required');
  });

  it('CA4: document (CNPJ) vazio → document-required', () => {
    const r = create(validInput({ document: '' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'document-required');
  });
});

describe('financial/domain/cedente/cedente-account — status', () => {
  it('CA5: isActive/isClosed + close (e close em já-encerrada falha)', () => {
    const r = create(validInput());
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(isActive(r.value), true);
      assert.equal(isClosed(r.value), false);

      const closed = close(r.value);
      assert.equal(closed.ok, true);
      if (closed.ok) {
        assert.equal(closed.value.status, 'Closed');
        assert.equal(isClosed(closed.value), true);

        const again = close(closed.value);
        assert.equal(isErr(again), true);
        if (!again.ok) assert.equal(again.error, 'cedente-account-already-closed');
      }
    }
  });
});
