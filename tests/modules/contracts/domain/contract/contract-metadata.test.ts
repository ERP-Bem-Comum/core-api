/**
 * CONTRACTS-CONTRACTOR-METADATA-DOMAIN — W0 (RED) — agregado Contract:
 * `contractor` (FR-001/002) + metadados `observations`/`email`/`telephone`
 * (FR-009) + `updateContract` estendido (title/objective/metadados editáveis).
 *
 * RED por inexistência: `ContractorRef` não existe; `CreateContractInput` ainda
 * não tem `contractor`; o agregado ainda não tem os campos de metadado; e
 * `ContractUpdate` ainda não admite title/objective/metadados.
 *
 * Decisão (research.md R1 / clarify): `contractor` é referência leve, definida na
 * criação, imutável depois. title/objective são EDITÁVEIS (metadado); imutáveis
 * reais = originalValue/originalPeriod/sequentialNumber/signedAt/id.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import { updateContract } from '#src/modules/contracts/domain/contract/types.ts';
import type { CreateContractInput } from '#src/modules/contracts/domain/contract/types.ts';

const D = (iso: string): Date => new Date(iso);
const SUPPLIER_UUID = '7f3a1234-5678-4abc-9def-fedcba987654';

const pd = (iso: string): PlainDate.PlainDate => {
  const r = PlainDate.from(iso.slice(0, 10));
  if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
  return r.value;
};
const money = (cents: number) => {
  const r = Money.fromCents(cents);
  if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
  return r.value;
};
const fixedPeriod = (s: string, e: string) => {
  const r = Period.create(pd(s), pd(e));
  if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
  return r.value;
};
const someContractor = () => {
  const r = ContractorRef.make('supplier', SUPPLIER_UUID);
  if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
  return r.value;
};

const validInput = (overrides: Partial<CreateContractInput> = {}): CreateContractInput => ({
  id: ContractId.generate(),
  sequentialNumber: '001/2026',
  title: 'Cooperativa Bem Comum — equipamentos',
  objective: 'Aquisição de notebooks e periféricos',
  signedAt: D('2026-01-01'),
  originalValue: money(10_000_000),
  originalPeriod: fixedPeriod('2026-01-01', '2026-12-31'),
  contractor: someContractor(),
  ...overrides,
});

const createActive = () => {
  const r = Contract.create(validInput());
  if (!r.ok) throw new Error(`fixture broken: ${JSON.stringify(r.error)}`);
  return r.value.contract;
};

describe('Contract.create — vínculo de contratado (FR-001/002)', () => {
  it('exige `contractor` no input e o vincula ao contrato', () => {
    const contractor = someContractor();
    const r = Contract.create(validInput({ contractor }));
    assert.equal(isOk(r), true);
    if (r.ok) assert.deepEqual(r.value.contract.contractor, contractor);
  });

  it('inicializa metadados de cadastro como null (observations/email/telephone)', () => {
    const c = createActive();
    assert.equal(c.observations, null);
    assert.equal(c.email, null);
    assert.equal(c.telephone, null);
  });
});

describe('updateContract — metadados editáveis (FR-007/009)', () => {
  it('altera observations', () => {
    const next = updateContract(createActive(), { observations: 'Revisado em auditoria' });
    assert.equal(next.observations, 'Revisado em auditoria');
  });

  it('altera email e telephone', () => {
    const next = updateContract(createActive(), {
      email: 'contato@coop.org',
      telephone: '+55 11 99999-0000',
    });
    assert.equal(next.email, 'contato@coop.org');
    assert.equal(next.telephone, '+55 11 99999-0000');
  });

  it('altera title e objective (metadado, não imutável)', () => {
    const next = updateContract(createActive(), {
      title: 'Novo título',
      objective: 'Novo objetivo',
    });
    assert.equal(next.title, 'Novo título');
    assert.equal(next.objective, 'Novo objetivo');
  });

  it('preserva o subtipo refinado (status Active) e o contractor', () => {
    const active = createActive();
    const next = updateContract(active, { observations: 'x' });
    assert.equal(next.status, 'Active');
    assert.deepEqual(next.contractor, active.contractor);
  });

  // Imutabilidade de valor/período/sequentialNumber é garantida em COMPILE-TIME:
  // `ContractUpdate = Partial<Omit<EffectiveContractCore, ContractImmutableField>>`
  // não admite essas chaves. Não há asserção runtime (seria @ts-expect-error).
});
