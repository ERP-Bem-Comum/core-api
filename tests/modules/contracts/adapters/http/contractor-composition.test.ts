/**
 * CONTRACTS-DETAIL-COMPOSITION-HTTP — W0 (RED) — composição do contratado na borda.
 *
 * `composeContractor(port, ref)` orquestra a leitura do contratado via
 * `ContractorReadPort` (public-api de Parceiros, ADR-0032) e devolve o bloco
 * `{ type, id, snapshot|null }`. Anti-oráculo (FR-006): not-found, erro de IO e
 * timeout colapsam no MESMO `snapshot: null`. Puro do ponto de vista de teste:
 * usa um fake do port (sem MySQL).
 *
 * RED por inexistência: `adapters/http/contractor-composition.ts` não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/primitives/result.ts';
import type { ContractorReadPort } from '#src/modules/partners/public-api/index.ts';
import { composeContractor } from '#src/modules/contracts/adapters/http/contractor-composition.ts';

const UPDATED = new Date('2026-05-30T09:30:00.000Z');
const SUPPLIER_ID = '11111111-1111-4111-8111-111111111111';

// Fake port: cada getter devolve o que o teste configurar (ok(view)|ok(null)|err).
const fakePort = (over: Partial<ContractorReadPort> = {}): ContractorReadPort => ({
  getSupplierView: () => Promise.resolve(ok(null)),
  getFinancierView: () => Promise.resolve(ok(null)),
  getCollaboratorView: () => Promise.resolve(ok(null)),
  getActView: () => Promise.resolve(ok(null)),
  ...over,
});

describe('composeContractor — supplier', () => {
  it('projeta snapshot com bankAccount/pixKey (só supplier) + updatedAt ISO', async () => {
    const port = fakePort({
      getSupplierView: () =>
        Promise.resolve(
          ok({
            type: 'supplier',
            id: SUPPLIER_ID,
            name: 'Fornecedor X',
            email: 'x@y.com',
            document: '11222333000181',
            serviceCategory: 'INFORMATICA',
            bankAccount: {
              bank: '001',
              agency: '0001-2',
              accountNumber: '123456',
              checkDigit: '7',
            },
            pixKey: { keyType: 'email', key: 'pix@x.com' },
            updatedAt: UPDATED,
          }),
        ),
    });
    const block = await composeContractor(port, { type: 'supplier', id: SUPPLIER_ID });

    assert.equal(block.type, 'supplier');
    assert.equal(block.id, SUPPLIER_ID);
    assert.equal(block.snapshot?.name, 'Fornecedor X');
    assert.equal(block.snapshot?.document, '11222333000181');
    assert.deepEqual(block.snapshot?.bankAccount, {
      bank: '001',
      agency: '0001-2',
      accountNumber: '123456',
      checkDigit: '7',
    });
    assert.deepEqual(block.snapshot?.pixKey, { keyType: 'email', key: 'pix@x.com' });
    assert.equal(block.snapshot?.updatedAt, UPDATED.toISOString());
  });
});

describe('composeContractor — não-supplier (sem bancário/PIX)', () => {
  it('collaborator: snapshot só com name/document/updatedAt', async () => {
    const port = fakePort({
      getCollaboratorView: () =>
        Promise.resolve(
          ok({
            type: 'collaborator',
            id: SUPPLIER_ID,
            name: 'João',
            email: 'j@y.com',
            document: '11144477735',
            role: 'Educador',
            occupationArea: 'PARC',
            updatedAt: UPDATED,
          }),
        ),
    });
    const block = await composeContractor(port, { type: 'collaborator', id: SUPPLIER_ID });
    assert.equal(block.snapshot?.name, 'João');
    assert.equal('bankAccount' in (block.snapshot ?? {}), false);
  });
});

describe('composeContractor — degradação graciosa (FR-006, anti-oráculo)', () => {
  it('contratado inexistente (ok(null)) → snapshot null', async () => {
    const block = await composeContractor(fakePort(), { type: 'supplier', id: SUPPLIER_ID });
    assert.equal(block.snapshot, null);
    assert.equal(block.type, 'supplier');
    assert.equal(block.id, SUPPLIER_ID);
  });

  it('erro de IO (err) → snapshot null — resposta idêntica ao not-found', async () => {
    const port = fakePort({
      getSupplierView: () => Promise.resolve(err('contractor-read-unavailable')),
    });
    const block = await composeContractor(port, { type: 'supplier', id: SUPPLIER_ID });
    assert.equal(block.snapshot, null);
  });

  it('timeout → snapshot null', async () => {
    const port = fakePort({
      getSupplierView: () =>
        new Promise((resolve) => {
          // nunca resolve dentro do timeout
          setTimeout(() => {
            resolve(ok(null));
          }, 5_000);
        }),
    });
    const block = await composeContractor(
      port,
      { type: 'supplier', id: SUPPLIER_ID },
      { timeoutMs: 20 },
    );
    assert.equal(block.snapshot, null);
  });
});
