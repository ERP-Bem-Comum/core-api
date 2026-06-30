import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { CONTRACT_PERMISSION } from '#src/modules/contracts/public-api/permissions.ts';

// CTR-PERMISSION-CATALOG: catálogo type-safe das permissions do módulo contracts.
// SSoT única (const object) que substitui as magic strings inline do plugin HTTP e
// que a ETL importa tipado (migração da flag legada `massApprovalPermission`).

describe('CONTRACT_PERMISSION — catálogo de permissions de contracts', () => {
  it('expõe read/write/massApprove com os valores canônicos', () => {
    assert.equal(CONTRACT_PERMISSION.read, 'contract:read');
    assert.equal(CONTRACT_PERMISSION.write, 'contract:write');
    assert.equal(CONTRACT_PERMISSION.massApprove, 'contract:mass-approve');
  });

  it('todos os valores seguem o formato resource:action', () => {
    const re = /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/;
    for (const value of Object.values(CONTRACT_PERMISSION)) {
      assert.ok(re.test(value), `${value} deve ser resource:action`);
    }
  });

  it('é re-exportado pela public-api do módulo', async () => {
    const publicApi = await import('#src/modules/contracts/public-api/index.ts');
    assert.equal(
      (publicApi as { CONTRACT_PERMISSION?: typeof CONTRACT_PERMISSION }).CONTRACT_PERMISSION
        ?.massApprove,
      'contract:mass-approve',
    );
  });
});
