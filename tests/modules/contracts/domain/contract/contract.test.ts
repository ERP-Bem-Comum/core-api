import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { Money } from '#src/modules/contracts/domain/shared/money.ts';
import { Period } from '#src/modules/contracts/domain/shared/period.ts';
import { AmendmentId, ContractId } from '#src/modules/contracts/domain/shared/ids.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import type {
  ContractAdjustment,
  CreateContractInput,
} from '#src/modules/contracts/domain/contract/types.ts';

const D = (iso: string): Date => new Date(iso);
const INVALID_DATE = new Date('not-a-date');

const money = (cents: number) => {
  const r = Money.fromCents(cents);
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

const fixedPeriod = (startISO: string, endISO: string) => {
  const r = Period.create(D(startISO), D(endISO));
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

const indefinitePeriod = (startISO: string) => {
  const r = Period.createIndefinite(D(startISO));
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

const validInput = (overrides: Partial<CreateContractInput> = {}): CreateContractInput => ({
  id: ContractId.generate(),
  sequentialNumber: '001/2026',
  title: 'Cooperativa Bem Comum — equipamentos',
  objective: 'Aquisição de notebooks e periféricos',
  signedAt: D('2026-01-01'),
  originalValue: money(10000000),
  originalPeriod: fixedPeriod('2026-01-01', '2026-12-31'),
  ...overrides,
});

const createActive = () => {
  const r = Contract.create(validInput());
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value.contract;
};

// ============================================================================
// create
// ============================================================================

describe('Contract.create — happy path', () => {
  it('returns Active contract with current === original', () => {
    const input = validInput();
    const r = Contract.create(input);
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const { contract, event } = r.value;
    assert.equal(contract.status, 'Active');
    assert.equal(contract.currentValue.cents, input.originalValue.cents);
    assert.equal(Period.equals(contract.currentPeriod, input.originalPeriod), true);
    assert.equal(contract.endedAt, null);
    assert.equal(contract.homologatedAmendmentIds.length, 0);
    assert.equal(event.type, 'ContractCreated');
    if (event.type === 'ContractCreated') {
      assert.equal(event.contractId, contract.id);
    }
  });
});

describe('Contract.create — validation', () => {
  it('rejects empty sequentialNumber', () => {
    const r = Contract.create(validInput({ sequentialNumber: '' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-sequential-number-required');
  });

  it('rejects whitespace-only sequentialNumber', () => {
    const r = Contract.create(validInput({ sequentialNumber: '   ' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-sequential-number-required');
  });

  it('rejects empty title', () => {
    const r = Contract.create(validInput({ title: '' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-title-required');
  });

  it('rejects whitespace-only title', () => {
    const r = Contract.create(validInput({ title: '   ' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-title-required');
  });

  it('rejects empty objective', () => {
    const r = Contract.create(validInput({ objective: '' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-objective-required');
  });

  it('rejects invalid signedAt', () => {
    const r = Contract.create(validInput({ signedAt: INVALID_DATE }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-invalid-signed-at');
  });

  // Defeito #6 — formato XXX/AAAA do sequentialNumber
  it('rejects sequentialNumber without slash (ABC)', () => {
    const r = Contract.create(validInput({ sequentialNumber: 'ABC' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-sequential-number-invalid-format');
  });

  it('rejects sequentialNumber with short prefix (1/26)', () => {
    const r = Contract.create(validInput({ sequentialNumber: '1/26' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-sequential-number-invalid-format');
  });

  it('rejects sequentialNumber with dash instead of slash (001-2026)', () => {
    const r = Contract.create(validInput({ sequentialNumber: '001-2026' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-sequential-number-invalid-format');
  });

  it('rejects sequentialNumber with 4-digit prefix (0001/2026)', () => {
    const r = Contract.create(validInput({ sequentialNumber: '0001/2026' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-sequential-number-invalid-format');
  });

  it('accepts canonical format 001/2026', () => {
    const r = Contract.create(validInput({ sequentialNumber: '001/2026' }));
    assert.equal(isOk(r), true);
  });

  it('accepts boundary format 999/9999', () => {
    const r = Contract.create(validInput({ sequentialNumber: '999/9999' }));
    assert.equal(isOk(r), true);
  });

  // Defeito #9 — contrato R$ 0,00 rejeitado
  it('rejects contract with originalValue = 0', () => {
    const r = Contract.create(validInput({ originalValue: money(0) }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-original-value-zero');
  });
});

// ============================================================================
// expire
// ============================================================================

describe('Contract.expire — happy path', () => {
  it('transitions Active to Expired when at >= period.end', () => {
    const contract = createActive();
    const r = Contract.expire(contract, D('2027-01-01'));
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.contract.status, 'Expired');
    assert.equal(r.value.contract.endedAt?.getTime(), D('2027-01-01').getTime());
    assert.equal(r.value.event.type, 'ContractEnded');
    if (r.value.event.type === 'ContractEnded') {
      assert.equal(r.value.event.kind, 'Expired');
    }
  });

  it('preserves originalValue and originalPeriod', () => {
    const contract = createActive();
    const originalValueCents = contract.originalValue.cents;
    const r = Contract.expire(contract, D('2027-01-01'));
    if (!r.ok) return;
    assert.equal(r.value.contract.originalValue.cents, originalValueCents);
    assert.equal(Period.equals(r.value.contract.originalPeriod, contract.originalPeriod), true);
  });
});

describe('Contract.expire — rejections', () => {
  it('rejects when at < period.end', () => {
    const contract = createActive();
    const r = Contract.expire(contract, D('2026-06-15'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-cannot-expire-yet');
  });

  it('rejects when period is Indefinite', () => {
    const r = Contract.create(validInput({ originalPeriod: indefinitePeriod('2026-01-01') }));
    if (!r.ok) throw new Error('fixture broken');
    const expireResult = Contract.expire(r.value.contract, D('2099-12-31'));
    assert.equal(isErr(expireResult), true);
    if (!expireResult.ok) {
      assert.equal(expireResult.error, 'contract-cannot-expire-indefinite-period');
    }
  });

  it('rejects when contract is already Expired', () => {
    const contract = createActive();
    const first = Contract.expire(contract, D('2027-01-01'));
    if (!first.ok) throw new Error('fixture broken');
    const second = Contract.expire(first.value.contract, D('2028-01-01'));
    assert.equal(isErr(second), true);
    if (!second.ok) assert.equal(second.error, 'contract-not-active');
  });

  it('rejects when contract is Terminated', () => {
    const contract = createActive();
    const t = Contract.terminate(contract, D('2026-06-15'));
    if (!t.ok) throw new Error('fixture broken');
    const r = Contract.expire(t.value.contract, D('2027-01-01'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-not-active');
  });

  it('rejects invalid at date', () => {
    const contract = createActive();
    const r = Contract.expire(contract, INVALID_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-invalid-event-date');
  });
});

// ============================================================================
// terminate
// ============================================================================

describe('Contract.terminate — happy path', () => {
  it('transitions Active to Terminated', () => {
    const contract = createActive();
    const r = Contract.terminate(contract, D('2026-06-15'));
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.contract.status, 'Terminated');
    assert.equal(r.value.contract.endedAt?.getTime(), D('2026-06-15').getTime());
    assert.equal(r.value.event.type, 'ContractEnded');
    if (r.value.event.type === 'ContractEnded') {
      assert.equal(r.value.event.kind, 'Terminated');
    }
  });

  it('works on Indefinite period (no expiration possible, only termination)', () => {
    const r = Contract.create(validInput({ originalPeriod: indefinitePeriod('2026-01-01') }));
    if (!r.ok) throw new Error('fixture broken');
    const terminateResult = Contract.terminate(r.value.contract, D('2030-01-01'));
    assert.equal(isOk(terminateResult), true);
  });
});

describe('Contract.terminate — rejections', () => {
  it('rejects when contract is Expired', () => {
    const contract = createActive();
    const e = Contract.expire(contract, D('2027-01-01'));
    if (!e.ok) throw new Error('fixture broken');
    const r = Contract.terminate(e.value.contract, D('2028-01-01'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-not-active');
  });

  it('rejects when contract is already Terminated', () => {
    const contract = createActive();
    const first = Contract.terminate(contract, D('2026-06-15'));
    if (!first.ok) throw new Error('fixture broken');
    const second = Contract.terminate(first.value.contract, D('2026-07-15'));
    assert.equal(isErr(second), true);
    if (!second.ok) assert.equal(second.error, 'contract-not-active');
  });

  it('rejects invalid at date', () => {
    const contract = createActive();
    const r = Contract.terminate(contract, INVALID_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-invalid-event-date');
  });
});

// ============================================================================
// applyHomologatedAdjustment
// ============================================================================

describe('Contract.applyHomologatedAdjustment — ValueIncrease', () => {
  it('increases currentValue and registers amendmentId', () => {
    const contract = createActive();
    const amendmentId = AmendmentId.generate();
    const adjustment: ContractAdjustment = {
      kind: 'ValueIncrease',
      amount: money(500000),
      amendmentId,
    };
    const r = Contract.applyHomologatedAdjustment(contract, adjustment, D('2026-03-01'));
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.contract.currentValue.cents, 10500000);
    assert.equal(r.value.contract.homologatedAmendmentIds.length, 1);
    assert.equal(r.value.contract.homologatedAmendmentIds[0], amendmentId);
    assert.equal(r.value.contract.status, 'Active');
    assert.equal(r.value.event.type, 'ContractStateUpdated');
  });

  it('preserves originalValue (R5)', () => {
    const contract = createActive();
    const adjustment: ContractAdjustment = {
      kind: 'ValueIncrease',
      amount: money(500000),
      amendmentId: AmendmentId.generate(),
    };
    const r = Contract.applyHomologatedAdjustment(contract, adjustment, D('2026-03-01'));
    if (!r.ok) return;
    assert.equal(r.value.contract.originalValue.cents, 10000000);
  });
});

describe('Contract.applyHomologatedAdjustment — ValueDecrease', () => {
  it('decreases currentValue when result is non-negative', () => {
    const contract = createActive();
    const adjustment: ContractAdjustment = {
      kind: 'ValueDecrease',
      amount: money(500000),
      amendmentId: AmendmentId.generate(),
    };
    const r = Contract.applyHomologatedAdjustment(contract, adjustment, D('2026-03-01'));
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.contract.currentValue.cents, 9500000);
  });

  it('rejects when result would go negative', () => {
    const contract = createActive();
    const adjustment: ContractAdjustment = {
      kind: 'ValueDecrease',
      amount: money(10000001),
      amendmentId: AmendmentId.generate(),
    };
    const r = Contract.applyHomologatedAdjustment(contract, adjustment, D('2026-03-01'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-value-would-go-negative');
  });
});

describe('Contract.applyHomologatedAdjustment — PeriodExtension', () => {
  it('extends Fixed period when newEnd is after current end', () => {
    const contract = createActive();
    const adjustment: ContractAdjustment = {
      kind: 'PeriodExtension',
      newEnd: D('2027-06-30'),
      amendmentId: AmendmentId.generate(),
    };
    const r = Contract.applyHomologatedAdjustment(contract, adjustment, D('2026-11-01'));
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    if (r.value.contract.currentPeriod.kind === 'Fixed') {
      assert.equal(r.value.contract.currentPeriod.end.getTime(), D('2027-06-30').getTime());
    } else {
      throw new Error('expected Fixed currentPeriod');
    }
  });

  it('rejects when newEnd <= current end', () => {
    const contract = createActive();
    const adjustment: ContractAdjustment = {
      kind: 'PeriodExtension',
      newEnd: D('2026-06-30'),
      amendmentId: AmendmentId.generate(),
    };
    const r = Contract.applyHomologatedAdjustment(contract, adjustment, D('2026-03-01'));
    assert.equal(isErr(r), true);
    if (!r.ok) {
      assert.equal(r.error, 'contract-period-extension-not-after-current-end');
    }
  });

  it('rejects when period is Indefinite', () => {
    const r = Contract.create(validInput({ originalPeriod: indefinitePeriod('2026-01-01') }));
    if (!r.ok) throw new Error('fixture broken');
    const adjustment: ContractAdjustment = {
      kind: 'PeriodExtension',
      newEnd: D('2099-01-01'),
      amendmentId: AmendmentId.generate(),
    };
    const applied = Contract.applyHomologatedAdjustment(
      r.value.contract,
      adjustment,
      D('2026-03-01'),
    );
    assert.equal(isErr(applied), true);
    if (!applied.ok) {
      assert.equal(applied.error, 'contract-cannot-extend-indefinite-period');
    }
  });
});

describe('Contract.applyHomologatedAdjustment — Acknowledgment', () => {
  it('registers amendmentId without changing value or period', () => {
    const contract = createActive();
    const adjustment: ContractAdjustment = {
      kind: 'Acknowledgment',
      amendmentId: AmendmentId.generate(),
    };
    const r = Contract.applyHomologatedAdjustment(contract, adjustment, D('2026-03-01'));
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.contract.currentValue.cents, contract.currentValue.cents);
    assert.equal(Period.equals(r.value.contract.currentPeriod, contract.currentPeriod), true);
    assert.equal(r.value.contract.homologatedAmendmentIds.length, 1);
    assert.equal(r.value.event.type, 'ContractStateUpdated');
  });
});

describe('Contract.applyHomologatedAdjustment — common rejections', () => {
  it('rejects when contract is not Active (Expired)', () => {
    const contract = createActive();
    const e = Contract.expire(contract, D('2027-01-01'));
    if (!e.ok) throw new Error('fixture broken');
    const adjustment: ContractAdjustment = {
      kind: 'ValueIncrease',
      amount: money(100),
      amendmentId: AmendmentId.generate(),
    };
    const r = Contract.applyHomologatedAdjustment(e.value.contract, adjustment, D('2027-02-01'));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-not-active');
  });

  it('rejects when amendmentId has already been applied', () => {
    const contract = createActive();
    const amendmentId = AmendmentId.generate();
    const adjustment: ContractAdjustment = {
      kind: 'ValueIncrease',
      amount: money(100),
      amendmentId,
    };
    const first = Contract.applyHomologatedAdjustment(contract, adjustment, D('2026-03-01'));
    if (!first.ok) throw new Error('fixture broken');
    const second = Contract.applyHomologatedAdjustment(
      first.value.contract,
      adjustment,
      D('2026-04-01'),
    );
    assert.equal(isErr(second), true);
    if (!second.ok) assert.equal(second.error, 'contract-amendment-already-applied');
  });

  it('rejects invalid at date', () => {
    const contract = createActive();
    const adjustment: ContractAdjustment = {
      kind: 'ValueIncrease',
      amount: money(100),
      amendmentId: AmendmentId.generate(),
    };
    const r = Contract.applyHomologatedAdjustment(contract, adjustment, INVALID_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-invalid-event-date');
  });
});
