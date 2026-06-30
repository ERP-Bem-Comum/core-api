/**
 * CTR-CONTRACT-SEQUENTIAL-NUMBER — W0 (RED) — numeração gerada pelo backend.
 *
 * DEVE FALHAR: hoje `createContract` exige `sequentialNumber` do cliente. GREEN no W1, quando
 * o backend gera por ano (`NNNN/YYYY`) via tabela de sequência (opção c — Refman §17.7.2.4).
 *
 * O import legado preserva o número antigo (não regera); o `POST` novo omite e o backend gera.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import { createContract } from '#src/modules/contracts/application/use-cases/create-contract.ts';

const setup = (year = '2026') => {
  const outbox = InMemoryOutbox();
  const contractRepo = InMemoryContractRepository(outbox.port);
  const clock = ClockFixed(new Date(`${year}-03-15`));
  return { contractRepo, deps: { contractRepo: contractRepo.repo, clock } };
};

// Command SEM sequentialNumber — o backend gera (omitido do body do POST).
const cmdSemNumero = {
  title: 'Cooperativa Bem Comum',
  objective: 'Aquisição de equipamentos',
  signedAt: '2026-03-15',
  originalValueCents: 10000000,
  originalPeriodStart: '2026-03-15',
  originalPeriodEnd: '2026-12-31',
  contractorType: 'supplier',
  contractorId: '55555555-5555-4555-8555-555555555555',
};

describe('createContract — numeração gerada por ano', () => {
  it('gera sequentialNumber no formato NNNN/YYYY (ano do clock) quando ausente', async () => {
    const { deps } = setup('2026');
    const r = await createContract(deps)(cmdSemNumero);
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.match(r.value.contract.sequentialNumber, /^\d{4}\/2026$/);
  });

  it('numeração crescente: primeiro 0001/2026, segundo 0002/2026', async () => {
    const { deps } = setup('2026');
    const r1 = await createContract(deps)(cmdSemNumero);
    const r2 = await createContract(deps)({
      ...cmdSemNumero,
      contractorId: '66666666-6666-4666-8666-666666666666',
    });
    assert.equal(isOk(r1), true);
    assert.equal(isOk(r2), true);
    if (r1.ok) assert.equal(r1.value.contract.sequentialNumber, '0001/2026');
    if (r2.ok) assert.equal(r2.value.contract.sequentialNumber, '0002/2026');
  });

  it('reinicia a sequência em outro ano', async () => {
    const { deps } = setup('2027');
    const r = await createContract(deps)({
      ...cmdSemNumero,
      signedAt: '2027-03-15',
      originalPeriodStart: '2027-03-15',
      originalPeriodEnd: '2027-12-31',
    });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.contract.sequentialNumber, '0001/2027');
  });

  it('preserva o número fornecido (import legado) quando presente', async () => {
    const { deps } = setup('2026');
    const r = await createContract(deps)({ ...cmdSemNumero, sequentialNumber: '0042/2020' });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.contract.sequentialNumber, '0042/2020');
  });
});
