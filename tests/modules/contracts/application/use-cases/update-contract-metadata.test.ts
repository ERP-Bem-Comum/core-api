/**
 * CONTRACTS-PATCH-METADATA-HTTP — W0 (RED) — use-case updateContractMetadata.
 *
 * Aplica patch de metadados de cadastro (title/objective/observations/email/telephone)
 * sobre o agregado via `updateContract` (intra-variante). Não toca campos imutáveis
 * (valor/período/datas/sequentialNumber — barrados na borda). Contrato inexistente →
 * `contract-not-found` (modelo RBAC puro, sem ownership por tenant).
 *
 * RED por inexistência: `update-contract-metadata.ts` não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { updateContractMetadata } from '#src/modules/contracts/application/use-cases/update-contract-metadata.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import { buildContract } from '../../adapters/persistence/fixtures.ts';

const CONTRACT_ID = '11111111-1111-4111-8111-111111111111';

const setup = async () => {
  const { repo } = InMemoryContractRepository();
  await repo.save(buildContract({ id: CONTRACT_ID }), []);
  return updateContractMetadata({ contractRepo: repo });
};

describe('updateContractMetadata', () => {
  it('aplica patch de metadados e devolve o contrato atualizado', async () => {
    const uc = await setup();
    const r = await uc({
      contractId: CONTRACT_ID,
      patch: { title: 'Novo título', observations: 'revisado', email: 'a@b.org' },
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.contract.title, 'Novo título');
      assert.equal(r.value.contract.observations, 'revisado');
      assert.equal(r.value.contract.email, 'a@b.org');
    }
  });

  it('persiste a alteração (findById reflete)', async () => {
    const { repo } = InMemoryContractRepository();
    await repo.save(buildContract({ id: CONTRACT_ID }), []);
    const uc = updateContractMetadata({ contractRepo: repo });
    await uc({ contractId: CONTRACT_ID, patch: { telephone: '+55 11 99999-0000' } });

    const idR = ContractId.rehydrate(CONTRACT_ID);
    assert.equal(idR.ok, true);
    if (!idR.ok) return;
    const loaded = await repo.findById(idR.value);
    assert.equal(loaded.ok && loaded.value?.telephone, '+55 11 99999-0000');
  });

  it('contrato inexistente → contract-not-found (RBAC puro, sem tenant)', async () => {
    const uc = await setup();
    const r = await uc({
      contractId: '22222222-2222-4222-8222-222222222222',
      patch: { title: 'x' },
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-not-found');
  });

  it('id malformado → erro (ContractIdError)', async () => {
    const uc = await setup();
    const r = await uc({ contractId: 'not-a-uuid', patch: { title: 'x' } });
    assert.equal(isErr(r), true);
  });
});
