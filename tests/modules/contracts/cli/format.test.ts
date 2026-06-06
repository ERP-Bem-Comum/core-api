import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Money from '#src/shared/kernel/money.ts';
import * as NonZeroMoney from '#src/shared/kernel/non-zero-money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as AmendmentId from '#src/modules/contracts/domain/shared/amendment-id.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import { Amendment } from '#src/modules/contracts/domain/amendment/amendment.ts';
import {
  formatAmendment,
  formatContract,
  formatDate,
  formatErrorCode,
  formatMoney,
  formatPeriod,
  formatStatus,
} from '#src/modules/contracts/cli/formatters/index.ts';

const pd = (iso: string): PlainDate.PlainDate => {
  const r = PlainDate.from(iso.slice(0, 10));
  if (!r.ok) throw new Error('fixture broken');
  return r.value;
};

const someContractor = (() => {
  const r = ContractorRef.make('supplier', '55555555-5555-4555-8555-555555555555');
  if (!r.ok) throw new Error('fixture broken');
  return r.value;
})();

const money = (cents: number) => {
  const r = Money.fromCents(cents);
  if (!r.ok) throw new Error('fixture broken');
  return r.value;
};

const nonZeroMoney = (cents: number) => {
  const m = money(cents);
  const r = NonZeroMoney.from(m);
  if (!r.ok) throw new Error('fixture broken');
  return r.value;
};

describe('formatMoney', () => {
  it('formats zero', () => {
    assert.equal(formatMoney(money(0)), 'R$ 0,00');
  });

  it('formats cents only', () => {
    assert.equal(formatMoney(money(50)), 'R$ 0,50');
  });

  it('formats integer reais', () => {
    assert.equal(formatMoney(money(10000)), 'R$ 100,00');
  });

  it('formats with mixed', () => {
    assert.equal(formatMoney(money(10550)), 'R$ 105,50');
  });

  it('formats large values with thousand separator', () => {
    assert.equal(formatMoney(money(10000000)), 'R$ 100.000,00');
  });

  it('formats very large values', () => {
    assert.equal(formatMoney(money(123456789)), 'R$ 1.234.567,89');
  });
});

describe('formatDate', () => {
  it('formats ISO date to DD/MM/YYYY', () => {
    assert.equal(formatDate(new Date('2026-03-15T00:00:00Z')), '15/03/2026');
  });

  it('formats single digit day/month with zero padding', () => {
    assert.equal(formatDate(new Date('2026-01-05T00:00:00Z')), '05/01/2026');
  });
});

describe('formatPeriod', () => {
  it('formats Fixed period as "start a end"', () => {
    const p = Period.create(pd('2026-01-01'), pd('2026-12-31'));
    if (!p.ok) throw new Error('fixture broken');
    assert.equal(formatPeriod(p.value), '01/01/2026 a 31/12/2026');
  });

  it('formats Indefinite period', () => {
    const p = Period.createIndefinite(pd('2026-01-01'));
    assert.equal(formatPeriod(p), '01/01/2026 (indefinido)');
  });
});

describe('formatStatus', () => {
  it('translates Active', () => {
    assert.equal(formatStatus('Active'), 'Ativo');
  });

  it('translates Expired', () => {
    assert.equal(formatStatus('Expired'), 'Encerrado');
  });

  it('translates Terminated', () => {
    assert.equal(formatStatus('Terminated'), 'Distratado');
  });
});

describe('formatErrorCode', () => {
  it('translates known error codes', () => {
    assert.equal(
      formatErrorCode('contract-not-active'),
      'Contrato já está encerrado — não aceita aditivos.',
    );
    assert.equal(
      formatErrorCode('amendment-without-signed-document'),
      'Aditivo precisa ter documento assinado anexado para ser homologado.',
    );
    assert.equal(formatErrorCode('money-negative-value'), 'Valor monetário não pode ser negativo.');
  });

  it('returns fallback for unknown codes', () => {
    const result = formatErrorCode('unknown-error-xyz');
    assert.match(result, /unknown-error-xyz/);
  });
});

describe('formatContract / formatAmendment — real newlines (Defeito #2)', () => {
  const buildPeriod = () => {
    const r = Period.create(pd('2026-01-01'), pd('2026-12-31'));
    if (!r.ok) throw new Error('fixture broken');
    return r.value;
  };

  it('formatContract returns string with real \\n line breaks, not literal "\\\\n"', () => {
    const created = Contract.create({
      id: ContractId.generate(),
      sequentialNumber: '001/2026',
      title: 'X',
      objective: 'Y',
      signedAt: new Date('2026-01-01'),
      originalValue: money(10000000),
      originalPeriod: buildPeriod(),
      contractor: someContractor,
    });
    if (!created.ok) throw new Error('fixture broken');
    const result = formatContract(created.value.contract);
    assert.equal(result.includes('\n'), true, 'must contain real newlines');
    assert.equal(result.includes('\\n'), false, 'must NOT contain literal backslash-n');
    // Cabeçalho deve estar na primeira linha
    const firstLine = result.split('\n')[0];
    assert.equal(firstLine, 'Contrato 001/2026');
  });

  it('formatAmendment returns string with real \\n line breaks, not literal "\\\\n"', () => {
    const c = Contract.create({
      id: ContractId.generate(),
      sequentialNumber: '001/2026',
      title: 'X',
      objective: 'Y',
      signedAt: new Date('2026-01-01'),
      originalValue: money(10000000),
      originalPeriod: buildPeriod(),
      contractor: someContractor,
    });
    if (!c.ok) throw new Error('fixture broken');
    const created = Amendment.create({
      id: AmendmentId.generate(),
      contractId: c.value.contract.id,
      amendmentNumber: 'AD 01-001/2026',
      description: 'X',
      createdAt: new Date('2026-03-01'),
      kind: 'Addition',
      impactValue: nonZeroMoney(500000),
    });
    if (!created.ok) throw new Error('fixture broken');
    const result = formatAmendment(created.value.amendment);
    assert.equal(result.includes('\n'), true, 'must contain real newlines');
    assert.equal(result.includes('\\n'), false, 'must NOT contain literal backslash-n');
  });
});
