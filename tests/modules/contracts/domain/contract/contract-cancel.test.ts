/**
 * CTR-HTTP-CANCEL-PENDING — W0 (RED) — domínio do cancelamento (ADR-0039).
 *
 * DEVE FALHAR: `Contract.cancel` e `Contract.parsePending` ainda não existem; o subtipo
 * `CancelledContract` e o evento `ContractCancelled` ainda não foram modelados. GREEN no W1.
 *
 * Regra (ADR-0039): só `PendingContract` é cancelável → `CancelledContract` (terminal, com
 * `endedAt`, SEM vigência efetiva). Demais estados não são canceláveis.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr } from '#src/shared/index.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import {
  buildPendingContract,
  buildContract,
  buildExpiredContract,
} from '../../adapters/persistence/fixtures.ts';

describe('Contract.cancel — Pending → Cancelled (ADR-0039)', () => {
  it('cancela um contrato Pendente: status Cancelled + endedAt + evento ContractCancelled', () => {
    const pending = buildPendingContract({ id: '99999999-9999-4999-8999-999999999999' });
    const at = new Date('2026-03-20T12:00:00.000Z');

    const r = Contract.cancel(pending, at);
    assert.equal(isOk(r), true);
    if (!r.ok) return;

    assert.equal(r.value.contract.status, 'Cancelled');
    assert.equal(r.value.contract.endedAt.getTime(), at.getTime());
    // Preserva os dados de cadastro.
    assert.equal(r.value.contract.sequentialNumber, pending.sequentialNumber);
    assert.equal(r.value.contract.id, pending.id);
    // Evento de domínio (CA-4).
    assert.equal(r.value.event.type, 'ContractCancelled');
    assert.equal(r.value.event.occurredAt.getTime(), at.getTime());
  });

  it('rejeita data de evento inválida', () => {
    const pending = buildPendingContract();
    const r = Contract.cancel(pending, new Date('invalid'));
    assert.equal(isErr(r), true);
  });
});

describe('Contract.parsePending — refinement constructor', () => {
  it('narrows um contrato Pendente', () => {
    const pending = buildPendingContract();
    const r = Contract.parsePending(pending);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.status, 'Pending');
  });

  it('rejeita contrato Active com ContractNotPending (carrega currentStatus)', () => {
    const active = buildContract();
    const r = Contract.parsePending(active);
    assert.equal(isErr(r), true);
    if (!r.ok) {
      assert.equal(r.error.tag, 'ContractNotPending');
      if (r.error.tag === 'ContractNotPending') {
        assert.equal(r.error.currentStatus, 'Active');
      }
    }
  });

  it('rejeita contrato Expired com ContractNotPending', () => {
    const expired = buildExpiredContract();
    const r = Contract.parsePending(expired);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'ContractNotPending');
  });
});
