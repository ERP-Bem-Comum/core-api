/**
 * W0 (RED) — CTR-DOMAIN-CONTRACT-PENDING-STATE
 *
 * Estado refinado `PendingContract` + construtor `Contract.createPending`
 * (ADR-0023: contrato pode nascer `Pendente`, sem documento assinado).
 *
 * Estes testes DEVEM FALHAR no W0 — `Contract.createPending`, o tipo
 * `PendingContract` e `CreatePendingContractInput` ainda não existem.
 *
 * `Contract.create` (→ Active) NÃO é tocado; o teste de regressão CA-P5
 * garante que o caminho atual segue intacto.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import type { CreatePendingContractInput } from '#src/modules/contracts/domain/contract/types.ts';

const D = (iso: string): Date => new Date(iso);

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

// Input de criação SEM `signedAt` — carrega `createdAt` para o timestamp do evento.
const validPendingInput = (
  overrides: Partial<CreatePendingContractInput> = {},
): CreatePendingContractInput => ({
  id: ContractId.generate(),
  sequentialNumber: '001/2026',
  title: 'Cooperativa Bem Comum — equipamentos',
  objective: 'Aquisição de notebooks e periféricos',
  originalValue: money(10000000),
  originalPeriod: fixedPeriod('2026-01-01', '2026-12-31'),
  createdAt: D('2026-01-01'),
  ...overrides,
});

// ============================================================================
// createPending — happy path
// ============================================================================

describe('Contract.createPending — nasce Pendente (ADR-0023)', () => {
  it('CA-P1: retorna PendingContract sem vigência efetiva nem signedAt', () => {
    const input = validPendingInput();
    const r = Contract.createPending(input);

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const { contract } = r.value;

    assert.equal(contract.status, 'Pending');
    // Pendente NÃO tem efetividade: campos de vigência e assinatura ausentes.
    assert.equal('signedAt' in contract, false, 'PendingContract não deve expor signedAt');
    assert.equal('currentValue' in contract, false, 'PendingContract não deve expor currentValue');
    assert.equal(
      'currentPeriod' in contract,
      false,
      'PendingContract não deve expor currentPeriod',
    );
    assert.equal(
      'homologatedAmendmentIds' in contract,
      false,
      'PendingContract não acumula aditivos',
    );
    // Dados de cadastro presentes.
    assert.equal(contract.id, input.id);
    assert.equal(contract.sequentialNumber, input.sequentialNumber);
    assert.equal(contract.originalValue.cents, input.originalValue.cents);
  });

  it('CA-P2: emite ContractCreated com occurredAt = createdAt (não signedAt)', () => {
    const input = validPendingInput({ createdAt: D('2026-03-10') });
    const r = Contract.createPending(input);

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const { contract, event } = r.value;
    assert.equal(event.type, 'ContractCreated');
    if (event.type === 'ContractCreated') {
      assert.equal(event.contractId, contract.id);
      assert.equal(event.occurredAt.getTime(), D('2026-03-10').getTime());
    }
  });
});

// ============================================================================
// createPending — validações (mesmas regras de cadastro do create)
// ============================================================================

describe('Contract.createPending — validações de cadastro', () => {
  it('CA-P3a: rejeita sequentialNumber em branco', () => {
    const r = Contract.createPending(validPendingInput({ sequentialNumber: '' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'ContractSequentialNumberRequired');
  });

  it('CA-P3b: rejeita sequentialNumber fora do formato NNN/AAAA', () => {
    const r = Contract.createPending(validPendingInput({ sequentialNumber: 'ABC' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'ContractSequentialNumberInvalidFormat');
  });

  it('CA-P3c: rejeita title em branco', () => {
    const r = Contract.createPending(validPendingInput({ title: '   ' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'ContractTitleRequired');
  });

  it('CA-P3d: rejeita objective em branco', () => {
    const r = Contract.createPending(validPendingInput({ objective: '' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'ContractObjectiveRequired');
  });

  it('CA-P3e: rejeita originalValue zero', () => {
    const r = Contract.createPending(validPendingInput({ originalValue: money(0) }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'ContractOriginalValueZero');
  });
});

// ============================================================================
// Regressão: create (→ Active) permanece intacto (CA3)
// ============================================================================

describe('Contract.create — Active preservado (regressão CA3)', () => {
  it('CA-P5: create com signedAt segue produzindo ActiveContract', () => {
    const r = Contract.create({
      id: ContractId.generate(),
      sequentialNumber: '002/2026',
      title: 'Contrato já assinado',
      objective: 'Objeto qualquer',
      signedAt: D('2026-01-01'),
      originalValue: money(5000000),
      originalPeriod: fixedPeriod('2026-01-01', '2026-12-31'),
    });
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.contract.status, 'Active');
    assert.equal('signedAt' in r.value.contract, true);
  });
});
