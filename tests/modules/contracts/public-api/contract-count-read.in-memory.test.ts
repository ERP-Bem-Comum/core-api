/**
 * W0 RED — 010 (T002). ContractCountReadPort in-memory: contagem em lote por contratado + filtros R2.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import {
  makeInMemoryContractCountReadPort,
  type InMemoryContractCountRow,
} from '#src/modules/contracts/adapters/persistence/repos/contract-count-read.in-memory.ts';

const rows: readonly InMemoryContractCountRow[] = [
  { contractorType: 'supplier', contractorId: 'S1', status: 'Active', amendments: 2 },
  { contractorType: 'supplier', contractorId: 'S1', status: 'Expired', amendments: 1 },
  { contractorType: 'supplier', contractorId: 'S2', status: 'Cancelled', amendments: 0 },
  { contractorType: 'collaborator', contractorId: 'S1', status: 'Active', amendments: 5 }, // mesmo id, OUTRO tipo
];

describe('makeInMemoryContractCountReadPort.countByContractor', () => {
  it('agrupa contratos + aditivos por id, conta todos os estados', async () => {
    const port = makeInMemoryContractCountReadPort(rows);
    const r = await port.countByContractor('supplier', ['S1', 'S2', 'S3']);
    assert.ok(isOk(r));
    if (!r.ok) return;
    assert.deepEqual(r.value.get('S1'), { contracts: 2, amendments: 3 }); // 2 contratos (Active+Expired), 2+1 aditivos
    assert.deepEqual(r.value.get('S2'), { contracts: 1, amendments: 0 }); // Cancelado conta
    assert.deepEqual(r.value.get('S3'), { contracts: 0, amendments: 0 }); // sem contrato → 0/0
  });

  it('não vaza contagem entre tipos diferentes (mesmo id)', async () => {
    const port = makeInMemoryContractCountReadPort(rows);
    const r = await port.countByContractor('collaborator', ['S1']);
    assert.ok(isOk(r));
    if (!r.ok) return;
    assert.deepEqual(r.value.get('S1'), { contracts: 1, amendments: 5 }); // só o collaborator S1
  });

  it('ids vazio → mapa vazio', async () => {
    const port = makeInMemoryContractCountReadPort(rows);
    const r = await port.countByContractor('supplier', []);
    assert.ok(isOk(r));
    if (!r.ok) return;
    assert.equal(r.value.size, 0);
  });
});

describe('ContractCountReadPort — filtros R2 (status)', () => {
  it('contractorIdsWithContractStatus retorna só os do estado', async () => {
    const port = makeInMemoryContractCountReadPort(rows);
    const r = await port.contractorIdsWithContractStatus('supplier', 'Active');
    assert.ok(isOk(r));
    if (!r.ok) return;
    assert.deepEqual([...r.value].sort(), ['S1']);
  });

  it('contractorIdsWithAnyContract retorna todos os contratados do tipo', async () => {
    const port = makeInMemoryContractCountReadPort(rows);
    const r = await port.contractorIdsWithAnyContract('supplier');
    assert.ok(isOk(r));
    if (!r.ok) return;
    assert.deepEqual([...r.value].sort(), ['S1', 'S2']);
  });
});
