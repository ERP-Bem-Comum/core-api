/**
 * CONTRACTS-HTTP-COMPOSITION-RW (C0) — W0 (RED) — mapper agregado -> DTO de resposta.
 *
 * DEVE FALHAR: `contractToListItem` ainda não existe em
 * `#src/modules/contracts/adapters/http/contract-dto.ts`.
 * GREEN quando o W1 entregar o mapper + o tipo `ContractListItemDto`.
 *
 * Cobre as 4 variantes do agregado (Pending/Active/Expired/Terminated) + período
 * Indefinite. O teste unit garante a serialização sem vazar campos internos
 * (`homologatedAmendmentIds` NÃO entra no DTO). A rota list em memory devolve [] —
 * o mapper só é exercitado aqui (W0 sem Docker).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { contractToListItem } from '#src/modules/contracts/adapters/http/contract-dto.ts';
import {
  buildContract,
  buildPendingContract,
  buildExpiredContract,
  buildTerminatedContract,
} from '../persistence/fixtures.ts';

describe('contractToListItem — mapper agregado -> DTO', () => {
  it('Active: Money como {cents}, Period Fixed como {kind,start,end} ISO, signedAt ISO', () => {
    const dto = contractToListItem(buildContract());
    assert.deepEqual(dto, {
      id: '11111111-1111-4111-8111-111111111111',
      sequentialNumber: '001/2026',
      title: 'Contrato Fixture',
      objective: 'Validar round-trip de persistência',
      status: 'Active',
      originalValue: { cents: 10_000_000 },
      originalPeriod: { kind: 'Fixed', start: '2026-02-01', end: '2026-12-31' },
      signedAt: '2026-01-15T00:00:00.000Z',
      currentValue: { cents: 10_000_000 },
      currentPeriod: { kind: 'Fixed', start: '2026-02-01', end: '2026-12-31' },
    });
  });

  it('Pending: sem signedAt/currentValue/currentPeriod (campos do estado efetivo ausentes)', () => {
    const dto = contractToListItem(buildPendingContract());
    assert.equal(dto.status, 'Pending');
    assert.equal('signedAt' in dto, false);
    assert.equal('currentValue' in dto, false);
    assert.equal('currentPeriod' in dto, false);
    assert.deepEqual(dto.originalValue, { cents: 10_000_000 });
    assert.deepEqual(dto.originalPeriod, { kind: 'Fixed', start: '2026-02-01', end: '2026-12-31' });
  });

  it('Expired: inclui endedAt ISO', () => {
    const dto = contractToListItem(buildExpiredContract());
    assert.equal(dto.status, 'Expired');
    assert.equal((dto as { endedAt: string }).endedAt, '2027-01-01T00:00:00.000Z');
  });

  it('Terminated: inclui endedAt ISO', () => {
    const dto = contractToListItem(buildTerminatedContract());
    assert.equal(dto.status, 'Terminated');
    assert.equal((dto as { endedAt: string }).endedAt, '2026-06-15T00:00:00.000Z');
  });

  it('não vaza homologatedAmendmentIds (campo interno do agregado)', () => {
    const dto = contractToListItem(buildContract());
    assert.equal('homologatedAmendmentIds' in dto, false);
  });

  it('Period Indefinite: {kind:Indefinite, start} sem end', () => {
    const dto = contractToListItem(
      buildContract({ periodKind: 'Indefinite', periodStartISO: '2026-02-01' }),
    );
    assert.deepEqual(dto.originalPeriod, { kind: 'Indefinite', start: '2026-02-01' });
  });
});
