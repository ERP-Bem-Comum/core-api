/**
 * CONTRACTS-CONTRACTOR-METADATA-DOMAIN — W0 (RED) — persistência.
 *
 * (a) Round-trip do agregado COM `contractor` + metadados pelo repo in-memory.
 * (b) Asserção ESTRUTURAL: a tabela `ctr_contracts` (schema Drizzle) ganha as 5
 *     colunas novas. Roda no gate default (sem DB) e falha por inexistência.
 *
 * RED por inexistência: `ContractorRef` não existe; o agregado não carrega os
 * campos; o schema não tem as colunas; o mapper do repo não os preserva.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import { updateContract } from '#src/modules/contracts/domain/contract/types.ts';
import type { CreateContractInput } from '#src/modules/contracts/domain/contract/types.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { contracts } from '#src/modules/contracts/adapters/persistence/schemas/mysql.ts';

const COLLABORATOR_UUID = '7f3a1234-5678-4abc-9def-fedcba987654';

const pd = (iso: string) => {
  const r = PlainDate.from(iso.slice(0, 10));
  if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
  return r.value;
};
const money = (cents: number) => {
  const r = Money.fromCents(cents);
  if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
  return r.value;
};
const contractor = () => {
  const r = ContractorRef.make('collaborator', COLLABORATOR_UUID);
  if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
  return r.value;
};

const input = (): CreateContractInput => ({
  id: ContractId.generate(),
  sequentialNumber: '042/2026',
  title: 'Contrato com contratado',
  objective: 'Round-trip de persistência',
  signedAt: new Date('2026-01-15'),
  originalValue: money(5_000_000),
  originalPeriod: (() => {
    const r = Period.create(pd('2026-01-01'), pd('2026-12-31'));
    if (!r.ok) throw new Error('fixture broken');
    return r.value;
  })(),
  contractor: contractor(),
});

describe('InMemoryContractRepository — round-trip de contractor + metadados', () => {
  it('preserva contractor e metadados após save → findById', async () => {
    const { repo } = InMemoryContractRepository();
    const created = Contract.create(input());
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const withMeta = updateContract(created.value.contract, {
      observations: 'obs',
      email: 'a@b.org',
      telephone: '+55 11 1234-5678',
    });

    const saved = await repo.save(withMeta, []);
    assert.equal(saved.ok, true);

    const loaded = await repo.findById(withMeta.id);
    assert.equal(loaded.ok, true);
    if (!loaded.ok || loaded.value === null) {
      assert.fail('contrato não encontrado após save');
      return;
    }
    assert.deepEqual(loaded.value.contractor, withMeta.contractor);
    assert.equal(loaded.value.observations, 'obs');
    assert.equal(loaded.value.email, 'a@b.org');
    assert.equal(loaded.value.telephone, '+55 11 1234-5678');
  });
});

describe('schema ctr_contracts — colunas novas (estrutural, sem DB)', () => {
  const table = contracts as unknown as Readonly<Record<string, unknown>>;
  for (const col of ['contractorType', 'contractorId', 'observations', 'email', 'telephone']) {
    it(`expõe a coluna '${col}'`, () => {
      assert.ok(table[col], `coluna ${col} ausente em ctr_contracts`);
    });
  }
});
