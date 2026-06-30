import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as AmendmentId from '#src/modules/contracts/domain/shared/amendment-id.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import type {
  ContractAdjustment,
  CreateContractInput,
} from '#src/modules/contracts/domain/contract/types.ts';
// CTR-DOMAIN-DEBRAND-AGG (W0 RED) — helper canônico ainda não existe em types.ts.
// Este import deve falhar até o W1 introduzir `updateContract` (DO A§4 do master doc).
import { updateContract } from '#src/modules/contracts/domain/contract/types.ts';

const D = (iso: string): Date => new Date(iso);
const INVALID_DATE = new Date('not-a-date');
const pd = (iso: string): PlainDate.PlainDate => {
  const r = PlainDate.from(iso.slice(0, 10));
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

const money = (cents: number) => {
  const r = Money.fromCents(cents);
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

const fixedPeriod = (startISO: string, endISO: string) => {
  const r = Period.create(pd(startISO), pd(endISO));
  if (!r.ok) throw new Error(`test fixture broken: ${r.error}`);
  return r.value;
};

const indefinitePeriod = (startISO: string) => Period.createIndefinite(pd(startISO));

const someContractor = (() => {
  const r = ContractorRef.make('supplier', '55555555-5555-4555-8555-555555555555');
  if (!r.ok) throw new Error('test fixture broken: contractor');
  return r.value;
})();

const validInput = (overrides: Partial<CreateContractInput> = {}): CreateContractInput => ({
  id: ContractId.generate(),
  sequentialNumber: '001/2026',
  title: 'Cooperativa Bem Comum — equipamentos',
  objective: 'Aquisição de notebooks e periféricos',
  signedAt: D('2026-01-01'),
  originalValue: money(10000000),
  originalPeriod: fixedPeriod('2026-01-01', '2026-12-31'),
  contractor: someContractor,
  ...overrides,
});

const createActive = () => {
  const r = Contract.create(validInput());
  if (!r.ok) throw new Error(`test fixture broken: ${JSON.stringify(r.error)}`);
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
    assert.equal('endedAt' in contract, false, 'ActiveContract não deve expor endedAt');
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
    if (!r.ok) assert.equal(r.error.tag, 'ContractSequentialNumberRequired');
  });

  it('rejects whitespace-only sequentialNumber', () => {
    const r = Contract.create(validInput({ sequentialNumber: '   ' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'ContractSequentialNumberRequired');
  });

  it('rejects empty title', () => {
    const r = Contract.create(validInput({ title: '' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'ContractTitleRequired');
  });

  it('rejects whitespace-only title', () => {
    const r = Contract.create(validInput({ title: '   ' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'ContractTitleRequired');
  });

  it('rejects empty objective', () => {
    const r = Contract.create(validInput({ objective: '' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'ContractObjectiveRequired');
  });

  it('rejects invalid signedAt', () => {
    const r = Contract.create(validInput({ signedAt: INVALID_DATE }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'ContractInvalidSignedAt');
  });

  // Defeito #6 — formato XXX/AAAA do sequentialNumber
  it('rejects sequentialNumber without slash (ABC)', () => {
    const r = Contract.create(validInput({ sequentialNumber: 'ABC' }));
    assert.equal(isErr(r), true);
    if (!r.ok) {
      assert.equal(r.error.tag, 'ContractSequentialNumberInvalidFormat');
      if (r.error.tag === 'ContractSequentialNumberInvalidFormat') {
        assert.equal(r.error.attempted, 'ABC');
      }
    }
  });

  it('rejects sequentialNumber with short prefix (1/26)', () => {
    const r = Contract.create(validInput({ sequentialNumber: '1/26' }));
    assert.equal(isErr(r), true);
    if (!r.ok) {
      assert.equal(r.error.tag, 'ContractSequentialNumberInvalidFormat');
      if (r.error.tag === 'ContractSequentialNumberInvalidFormat') {
        assert.equal(r.error.attempted, '1/26');
      }
    }
  });

  it('rejects sequentialNumber with dash instead of slash (001-2026)', () => {
    const r = Contract.create(validInput({ sequentialNumber: '001-2026' }));
    assert.equal(isErr(r), true);
    if (!r.ok) {
      assert.equal(r.error.tag, 'ContractSequentialNumberInvalidFormat');
      if (r.error.tag === 'ContractSequentialNumberInvalidFormat') {
        assert.equal(r.error.attempted, '001-2026');
      }
    }
  });

  // CTR-CONTRACT-SEQUENTIAL-NUMBER: o backend passou a GERAR `NNNN/YYYY` (4 dígitos).
  // O formato canônico agora aceita 3-ou-4 dígitos (legado + gerado).
  it('accepts 4-digit prefix (0001/2026) — numeração gerada pelo backend', () => {
    const r = Contract.create(validInput({ sequentialNumber: '0001/2026' }));
    assert.equal(isOk(r), true);
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
    if (!r.ok) assert.equal(r.error.tag, 'ContractOriginalValueZero');
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
    if (!r.ok) {
      assert.equal(r.error.tag, 'ContractCannotExpireYet');
      if (r.error.tag === 'ContractCannotExpireYet') {
        assert.equal(PlainDate.equals(r.error.currentEnd, pd('2026-12-31')), true);
        assert.equal(PlainDate.equals(r.error.attemptedAt, pd('2026-06-15')), true);
      }
    }
  });

  it('rejects when period is Indefinite', () => {
    const r = Contract.create(validInput({ originalPeriod: indefinitePeriod('2026-01-01') }));
    if (!r.ok) throw new Error('fixture broken');
    const expireResult = Contract.expire(r.value.contract, D('2099-12-31'));
    assert.equal(isErr(expireResult), true);
    if (!expireResult.ok) {
      assert.equal(expireResult.error.tag, 'ContractCannotExpireIndefinitePeriod');
    }
  });

  it('CA3 — TS rejeita Contract.expire(expiredContract) em compile time', () => {
    // CTR-DOMAIN-STATE-MACHINE-CONTRACT: assinatura refinada
    // `expire(c: ActiveContract)` torna a rejeição estática. O caminho de
    // runtime (parseActive) é coberto em outro describe.
    const contract = createActive();
    const first = Contract.expire(contract, D('2027-01-01'));
    if (!first.ok) throw new Error('fixture broken');
    // @ts-expect-error — ExpiredContract não é atribuível a ActiveContract.
    const _ = Contract.expire(first.value.contract, D('2028-01-01'));
    assert.ok(_);
  });

  it('CA3 — TS rejeita Contract.expire(terminatedContract) em compile time', () => {
    const contract = createActive();
    const t = Contract.terminate(contract, D('2026-06-15'));
    if (!t.ok) throw new Error('fixture broken');
    // @ts-expect-error — TerminatedContract não é atribuível a ActiveContract.
    const _ = Contract.expire(t.value.contract, D('2027-01-01'));
    assert.ok(_);
  });

  it('rejects invalid at date', () => {
    const contract = createActive();
    const r = Contract.expire(contract, INVALID_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'ContractInvalidEventDate');
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
  it('CA3 — TS rejeita Contract.terminate(expiredContract) em compile time', () => {
    const contract = createActive();
    const e = Contract.expire(contract, D('2027-01-01'));
    if (!e.ok) throw new Error('fixture broken');
    // @ts-expect-error — ExpiredContract não é atribuível a ActiveContract.
    const _ = Contract.terminate(e.value.contract, D('2028-01-01'));
    assert.ok(_);
  });

  it('CA3 — TS rejeita Contract.terminate(terminatedContract) em compile time', () => {
    const contract = createActive();
    const first = Contract.terminate(contract, D('2026-06-15'));
    if (!first.ok) throw new Error('fixture broken');
    // @ts-expect-error — TerminatedContract não é atribuível a ActiveContract.
    const _ = Contract.terminate(first.value.contract, D('2026-07-15'));
    assert.ok(_);
  });

  it('rejects invalid at date', () => {
    const contract = createActive();
    const r = Contract.terminate(contract, INVALID_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'ContractInvalidEventDate');
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
    if (!r.ok) {
      assert.equal(r.error.tag, 'ContractValueWouldGoNegative');
      if (r.error.tag === 'ContractValueWouldGoNegative') {
        assert.equal(r.error.currentValue.cents, 10000000);
        assert.equal(r.error.attemptedDecrease.cents, 10000001);
      }
    }
  });
});

describe('Contract.applyHomologatedAdjustment — PeriodExtension', () => {
  it('extends Fixed period when newEnd is after current end', () => {
    const contract = createActive();
    const adjustment: ContractAdjustment = {
      kind: 'PeriodExtension',
      newEnd: pd('2027-06-30'),
      amendmentId: AmendmentId.generate(),
    };
    const r = Contract.applyHomologatedAdjustment(contract, adjustment, D('2026-11-01'));
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    if (r.value.contract.currentPeriod.kind === 'Fixed') {
      assert.equal(PlainDate.equals(r.value.contract.currentPeriod.end, pd('2027-06-30')), true);
    } else {
      throw new Error('expected Fixed currentPeriod');
    }
  });

  it('rejects when newEnd <= current end', () => {
    const contract = createActive();
    const adjustment: ContractAdjustment = {
      kind: 'PeriodExtension',
      newEnd: pd('2026-06-30'),
      amendmentId: AmendmentId.generate(),
    };
    const r = Contract.applyHomologatedAdjustment(contract, adjustment, D('2026-03-01'));
    assert.equal(isErr(r), true);
    if (!r.ok) {
      assert.equal(r.error.tag, 'ContractPeriodExtensionNotAfterCurrentEnd');
      if (r.error.tag === 'ContractPeriodExtensionNotAfterCurrentEnd') {
        assert.equal(PlainDate.equals(r.error.currentEnd, pd('2026-12-31')), true);
        assert.equal(PlainDate.equals(r.error.attemptedEnd, pd('2026-06-30')), true);
      }
    }
  });

  it('rejects when period is Indefinite', () => {
    const r = Contract.create(validInput({ originalPeriod: indefinitePeriod('2026-01-01') }));
    if (!r.ok) throw new Error('fixture broken');
    const adjustment: ContractAdjustment = {
      kind: 'PeriodExtension',
      newEnd: pd('2099-01-01'),
      amendmentId: AmendmentId.generate(),
    };
    const applied = Contract.applyHomologatedAdjustment(
      r.value.contract,
      adjustment,
      D('2026-03-01'),
    );
    assert.equal(isErr(applied), true);
    if (!applied.ok) {
      assert.equal(applied.error.tag, 'ContractCannotExtendIndefinitePeriod');
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
    // @ts-expect-error — CA3: applyHomologatedAdjustment exige ActiveContract; TS rejeita ExpiredContract em compile.
    const r = Contract.applyHomologatedAdjustment(e.value.contract, adjustment, D('2027-02-01'));
    assert.ok(r);
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
    if (!second.ok) {
      assert.equal(second.error.tag, 'ContractAmendmentAlreadyApplied');
      if (second.error.tag === 'ContractAmendmentAlreadyApplied') {
        assert.equal(second.error.amendmentId, amendmentId);
      }
    }
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
    if (!r.ok) assert.equal(r.error.tag, 'ContractInvalidEventDate');
  });
});

// ============================================================================
// CTR-DOMAIN-STATE-MACHINE-CONTRACT — CA2: Contract.parseActive
// ============================================================================
//
// Contract.parseActive ainda NÃO existe no namespace Contract.
// Todos os testes abaixo falham em runtime com:
//   TypeError: Contract.parseActive is not a function
//
// Após W1 introduzir parseActive, esses testes devem passar (GREEN).
//
// Origem: DO D§21 — "Refinement via `parseActive`. Não `assertActive`."

describe('Contract.parseActive — happy path', () => {
  it('retorna ok(ActiveContract) quando contrato está Active', () => {
    // Arrange
    const contract = createActive();
    // Act
    const r = Contract.parseActive(contract);
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.status, 'Active');
    // Narrowing: r.value deve ser ActiveContract — sem endedAt no tipo refinado.
    // A asserção runtime de ausência do campo confirma o shape (CA1-shape-a).
    assert.equal('endedAt' in r.value, false, 'ActiveContract não deve ter campo endedAt');
  });

  it('tipo de retorno é ActiveContract (narrowing via status)', () => {
    // Arrange
    const contract = createActive();
    // Act
    const r = Contract.parseActive(contract);
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    // Discriminator correto para narrowing
    assert.equal(r.value.status, 'Active');
  });
});

describe('Contract.parseActive — rejeições', () => {
  it('retorna err(ContractNotActive) quando contrato está Expired', () => {
    // Arrange
    const active = createActive();
    const expireResult = Contract.expire(active, D('2027-01-01'));
    if (!expireResult.ok)
      throw new Error(`fixture quebrado: ${JSON.stringify(expireResult.error)}`);
    const expired = expireResult.value.contract;
    // Act
    const r = Contract.parseActive(expired);
    // Assert
    assert.equal(isErr(r), true);
    if (r.ok) return;
    assert.equal(r.error.tag, 'ContractNotActive');
    if (r.error.tag === 'ContractNotActive') {
      assert.equal(r.error.currentStatus, 'Expired');
    }
  });

  it('retorna err(ContractNotActive) quando contrato está Terminated', () => {
    // Arrange
    const active = createActive();
    const terminateResult = Contract.terminate(active, D('2026-06-15'));
    if (!terminateResult.ok)
      throw new Error(`fixture quebrado: ${JSON.stringify(terminateResult.error)}`);
    const terminated = terminateResult.value.contract;
    // Act
    const r = Contract.parseActive(terminated);
    // Assert
    assert.equal(isErr(r), true);
    if (r.ok) return;
    assert.equal(r.error.tag, 'ContractNotActive');
    if (r.error.tag === 'ContractNotActive') {
      assert.equal(r.error.currentStatus, 'Terminated');
    }
  });
});

describe('Contract.parseActive — shape do tipo refinado (CA1 runtime)', () => {
  it('ActiveContract produzido por create não tem campo endedAt', () => {
    // Arrange
    const contract = createActive();
    // Act — create já produz ActiveContract após W1
    const r = Contract.parseActive(contract);
    if (!r.ok) throw new Error('fixture quebrado');
    // Assert
    assert.equal('endedAt' in r.value, false, 'ActiveContract não deve expor endedAt');
  });

  it('ExpiredContract produzido por expire tem endedAt: Date', () => {
    // Arrange
    const active = createActive();
    const expireResult = Contract.expire(active, D('2027-01-01'));
    if (!expireResult.ok) throw new Error('fixture quebrado');
    const expired = expireResult.value.contract;
    // Assert — após W1, ExpiredContract tem endedAt obrigatório
    assert.equal('endedAt' in expired, true, 'ExpiredContract deve ter campo endedAt');
    assert.ok(expired.endedAt instanceof Date, 'endedAt deve ser Date');
  });

  it('TerminatedContract produzido por terminate tem endedAt: Date', () => {
    // Arrange
    const active = createActive();
    const terminateResult = Contract.terminate(active, D('2026-06-15'));
    if (!terminateResult.ok) throw new Error('fixture quebrado');
    const terminated = terminateResult.value.contract;
    // Assert — após W1, TerminatedContract tem endedAt obrigatório
    assert.equal('endedAt' in terminated, true, 'TerminatedContract deve ter campo endedAt');
    assert.ok(terminated.endedAt instanceof Date, 'endedAt deve ser Date');
  });
});

// ============================================================================
// CTR-DOMAIN-DEBRAND-AGG — Bloco A DON'T §1 + DO A§4
// ============================================================================

describe("Contract — desbrandado (Bloco A DON'T §1)", () => {
  it('Contract não tem propriedade __brand em runtime', () => {
    // Arrange
    const contract = createActive();
    // Act
    const descriptors = Object.getOwnPropertyDescriptors(contract);
    const keys = Object.keys(descriptors);
    // Assert
    assert.equal(
      keys.includes('__brand'),
      false,
      'Contract não deve carregar marcador __brand em runtime',
    );
  });

  it('valor brandado-como-Contract é estruturalmente compatível com ContractShape', () => {
    // Arrange
    const contract = createActive();
    // Act
    // Ao desbrandar, qualquer objeto que satisfaça ContractShape estrutural
    // deve ser atribuível a Contract sem cast `as unknown as`. O teste em
    // runtime apenas verifica acessibilidade das propriedades estruturais.
    const shape = {
      id: contract.id,
      sequentialNumber: contract.sequentialNumber,
      title: contract.title,
      objective: contract.objective,
      signedAt: contract.signedAt,
      originalValue: contract.originalValue,
      originalPeriod: contract.originalPeriod,
      currentValue: contract.currentValue,
      currentPeriod: contract.currentPeriod,
      status: contract.status,
      homologatedAmendmentIds: contract.homologatedAmendmentIds,
      // endedAt removido: ActiveContract não tem o campo (CA1 — DO C§29).
    };
    // Assert
    assert.equal(shape.id, contract.id);
    assert.equal(shape.status, contract.status);
    assert.equal(shape.sequentialNumber, contract.sequentialNumber);
  });
});

describe('updateContract — helper canônico intra-variante (DO A§4 + state machine)', () => {
  it('exporta updateContract com assinatura esperada', () => {
    // Arrange / Act
    const fn = updateContract;
    // Assert
    assert.equal(typeof fn, 'function', 'updateContract deve ser exportado como função');
  });

  it('CTR-DOMAIN-STATE-MACHINE-CONTRACT — não aceita mudança de status no patch', () => {
    // Após state machine, mudança de status passa por transições refinadas
    // (Contract.expire / terminate / applyHomologatedAdjustment), nunca por
    // updateContract — o tipo ContractUpdate exclui status/endedAt.
    const prev = createActive();
    // @ts-expect-error — `status` não deve estar em ContractUpdate
    const _withStatus = updateContract(prev, { status: 'Expired' });
    // @ts-expect-error — `endedAt` não deve estar em ContractUpdate
    const _withEnded = updateContract(prev, { endedAt: D('2027-01-01') });
    assert.ok(_withStatus);
    assert.ok(_withEnded);
  });

  it('CA-9 — Object.isFrozen(updateContract(c, {})) é true', () => {
    // Arrange
    const prev = createActive();
    // Act
    const next = updateContract(prev, {});
    // Assert
    assert.equal(Object.isFrozen(next), true, 'resultado de updateContract deve ser frozen');
  });

  it('preserva o subtipo refinado de prev (genérico T extends Contract)', () => {
    // Arrange
    const prev = createActive(); // ActiveContract
    // Act
    const next = updateContract(prev, {});
    // Assert — TS narrowing: next é ActiveContract, não tem endedAt.
    assert.equal(next.status, 'Active');
    assert.equal('endedAt' in next, false);
  });
});
