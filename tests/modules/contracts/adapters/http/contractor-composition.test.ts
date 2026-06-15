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

describe('composeContractor — act identifica-se pela razão social (CON-ACT-CONTRACTOR-RAZAO-SOCIAL)', () => {
  // W0 RED — `viewToSnapshot` no ramo act deve usar `corporateName` como `name`.
  // RED por inexistência: hoje o act cai no `else` e usa `view.name` (objeto do acordo).
  it('act: snapshot.name = corporateName (razão social), não o name do objeto', async () => {
    const port = fakePort({
      getActView: () =>
        Promise.resolve(
          ok({
            type: 'act',
            id: SUPPLIER_ID,
            name: 'Acordo de Cooperação 2026', // objeto/título do acordo
            corporateName: 'Instituição Parceira LTDA', // razão social
            email: 'a@y.com',
            document: '11222333000181',
            role: 'Representante Legal',
            occupationArea: 'PARC',
            updatedAt: UPDATED,
          }),
        ),
    });
    const block = await composeContractor(port, { type: 'act', id: SUPPLIER_ID });
    assert.equal(block.type, 'act');
    assert.equal(block.snapshot?.name, 'Instituição Parceira LTDA');
    assert.notEqual(block.snapshot?.name, 'Acordo de Cooperação 2026');
    // documento e demais campos inalterados
    assert.equal(block.snapshot?.document, '11222333000181');
    assert.equal('bankAccount' in (block.snapshot ?? {}), false);
  });

  it('não-regressão: collaborator/financier/supplier mantêm snapshot.name = name do parceiro', async () => {
    const collaboratorPort = fakePort({
      getCollaboratorView: () =>
        Promise.resolve(
          ok({
            type: 'collaborator',
            id: SUPPLIER_ID,
            name: 'João Souza',
            email: 'j@y.com',
            document: '11144477735',
            role: 'Educador',
            occupationArea: 'PARC',
            updatedAt: UPDATED,
          }),
        ),
    });
    const financierPort = fakePort({
      getFinancierView: () =>
        Promise.resolve(
          ok({
            type: 'financier',
            id: SUPPLIER_ID,
            name: 'Fundação Bem Comum',
            corporateName: 'Fundação Bem Comum LTDA',
            document: '11444777000161',
            legalRepresentative: 'Maria',
            telephone: '+5511999998888',
            address: 'Av. Paulista, 1000',
            updatedAt: UPDATED,
          }),
        ),
    });

    const collab = await composeContractor(collaboratorPort, {
      type: 'collaborator',
      id: SUPPLIER_ID,
    });
    assert.equal(collab.snapshot?.name, 'João Souza');

    const fin = await composeContractor(financierPort, { type: 'financier', id: SUPPLIER_ID });
    // financier conserva o `name` do parceiro (NÃO usa corporateName como identificação).
    assert.equal(fin.snapshot?.name, 'Fundação Bem Comum');
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
