/**
 * W0 (RED) — CTR-USECASE-CREATE-PENDING-CONTRACT
 *
 * Use case de cadastro de contrato `Pendente` (sem assinatura). Espelha
 * `create-contract`, mas chama `Contract.createPending` (com `createdAt = clock.now()`).
 *
 * DEVE FALHAR no W0 — `createPendingContract` ainda não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import { createPendingContract } from '#src/modules/contracts/application/use-cases/create-pending-contract.ts';

const setup = () => {
  const outbox = InMemoryOutbox();
  const contractRepo = InMemoryContractRepository(outbox.port);
  const clock = ClockFixed(new Date('2026-01-10T00:00:00.000Z'));
  return { outbox, contractRepo, clock };
};

const validCommand = (overrides: Partial<Record<string, unknown>> = {}) => ({
  sequentialNumber: '001/2026',
  title: 'Contrato Pendente',
  objective: 'Aguardando assinatura',
  originalValueCents: 10_000_000,
  periodStart: '2026-02-01',
  periodEnd: '2026-12-31' as string | null,
  contractorType: 'supplier',
  contractorId: '55555555-5555-4555-8555-555555555555',
  ...overrides,
});

describe('createPendingContract', () => {
  it('CA1: cadastra contrato Pendente (sem signedAt) e persiste', async () => {
    const { contractRepo, clock } = setup();

    const r = await createPendingContract({ contractRepo: contractRepo.repo, clock })(
      validCommand(),
    );

    assert.equal(isOk(r), true, `esperado ok; erro: ${JSON.stringify(!r.ok && r.error)}`);
    if (!r.ok) return;
    assert.equal(r.value.contract.status, 'Pending');
    assert.equal('signedAt' in r.value.contract, false, 'Pending não tem signedAt');

    const persisted = await contractRepo.repo.findBySequentialNumber('001/2026');
    if (!persisted.ok || persisted.value === null) throw new Error('não persistido');
    assert.equal(persisted.value.status, 'Pending');
  });

  it('CA2: sequentialNumber duplicado → contract-sequential-number-duplicated', async () => {
    const { contractRepo, clock } = setup();
    const uc = createPendingContract({ contractRepo: contractRepo.repo, clock });
    await uc(validCommand());

    const r = await uc(validCommand({ sequentialNumber: '001/2026' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-sequential-number-duplicated');
  });

  it('CA3: originalValueCents zero → erro de domínio', async () => {
    const { contractRepo, clock } = setup();
    const r = await createPendingContract({ contractRepo: contractRepo.repo, clock })(
      validCommand({ originalValueCents: 0 }),
    );
    assert.equal(isErr(r), true);
  });

  it('CA4: evento ContractCreated com occurredAt = clock.now() (createdAt, não signedAt)', async () => {
    const { contractRepo, clock } = setup();
    const r = await createPendingContract({ contractRepo: contractRepo.repo, clock })(
      validCommand({ sequentialNumber: '002/2026' }),
    );
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.event.type, 'ContractCreated');
    if (r.value.event.type === 'ContractCreated') {
      assert.equal(
        r.value.event.occurredAt.getTime(),
        new Date('2026-01-10T00:00:00.000Z').getTime(),
      );
    }
  });
});
