/**
 * PARTNERS-CONTRACTOR-READ-PORT — W0 RED — mapper agregado → ContractorView (unit).
 *
 * DEVE FALHAR em W0 (mapper inexistente: contractor-view.mapper.ts). Puro, sem IO.
 * Cobre: supplier (bankAccount + pixKey read-only), financier, collaborator, e o
 * `updatedAt` injetado (placeholder de "última atualização" — R5 do po-feedback/0001).
 *
 * A View é PROJEÇÃO PLANA (ADR-0014): nunca expõe o agregado interno nem `par_*` cru.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  supplierToView,
  financierToView,
  collaboratorToView,
  actToView,
} from '#src/modules/partners/public-api/contractor-view.mapper.ts';
import type { ContractorView } from '#src/modules/partners/public-api/contractor-view.mapper.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Act from '#src/modules/partners/domain/act/act.ts';
import * as ActId from '#src/modules/partners/domain/act/act-id.ts';

const UPDATED_AT = new Date('2026-05-30T09:30:00.000Z');

const aSupplier = () => {
  const r = Supplier.register({
    id: SupplierId.generate(),
    name: 'Fornecedor X',
    email: 'contato@fornecedor.com.br',
    cnpj: '11222333000181',
    corporateName: 'Fornecedor X LTDA',
    fantasyName: 'FX',
    serviceCategory: 'INFORMATICA',
    bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
    pixKey: { keyType: 'email', key: 'pix@fornecedor.com.br' },
    registeredAt: new Date('2025-01-01T00:00:00.000Z'),
  });
  if (!r.ok) throw new Error(`fixture supplier: ${r.error}`);
  return r.value.supplier;
};

const aFinancier = () => {
  const r = Financier.register({
    id: FinancierId.generate(),
    name: 'Fundação Bem Comum',
    corporateName: 'Fundação Bem Comum LTDA',
    legalRepresentative: 'Maria Silva',
    cnpj: '11444777000161',
    telephone: '+5511999998888',
    address: 'Av. Paulista, 1000',
    registeredAt: new Date('2025-01-01T00:00:00.000Z'),
  });
  if (!r.ok) throw new Error(`fixture financier: ${r.error}`);
  return r.value.financier;
};

const aCollaborator = () => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name: 'João Souza',
    email: 'joao@bemcomum.org',
    cpf: '111.444.777-35',
    occupationArea: 'PARC',
    role: 'Educador',
    startOfContract: new Date('2025-02-01T00:00:00.000Z'),
    employmentRelationship: 'CLT',
    registeredAt: new Date('2025-01-01T00:00:00.000Z'),
  });
  if (!r.ok) throw new Error(`fixture collaborator: ${r.error}`);
  return r.value.collaborator;
};

const anAct = () => {
  const r = Act.register({
    id: ActId.generate(),
    name: 'Ana Ato',
    email: 'ana@bemcomum.org',
    cpf: '111.444.777-35',
    occupationArea: 'PARC',
    role: 'Voluntária',
    startOfContract: new Date('2025-02-01T00:00:00.000Z'),
    employmentRelationship: 'CLT',
    registeredAt: new Date('2025-01-01T00:00:00.000Z'),
  });
  if (!r.ok) throw new Error(`fixture act: ${r.error}`);
  return r.value.act;
};

describe('supplierToView', () => {
  it('projeta nome, documento (cnpj), email, categoria + updatedAt', () => {
    const s = aSupplier();
    const view = supplierToView(s, UPDATED_AT);

    assert.equal(view.type, 'supplier');
    assert.equal(view.id, s.id as unknown as string);
    assert.equal(view.name, 'Fornecedor X');
    assert.equal(view.email, 'contato@fornecedor.com.br');
    assert.equal(view.document, s.cnpj as unknown as string);
    assert.equal(view.serviceCategory, 'INFORMATICA');
    assert.deepEqual(view.updatedAt, UPDATED_AT);
  });

  it('expõe bankAccount e pixKey read-only (presentes)', () => {
    const s = aSupplier();
    const view = supplierToView(s, UPDATED_AT);

    assert.deepEqual(view.bankAccount, {
      bank: '001',
      agency: '0001-2',
      accountNumber: '123456',
      checkDigit: '7',
    });
    assert.deepEqual(view.pixKey, { keyType: 'email', key: 'pix@fornecedor.com.br' });
  });

  it('bankAccount/pixKey ausentes viram null na View', () => {
    const r = Supplier.register({
      id: SupplierId.generate(),
      name: 'Só PIX',
      email: 'sopix@x.com',
      cnpj: '11444777000161',
      corporateName: 'Só PIX LTDA',
      fantasyName: 'SP',
      serviceCategory: 'INFORMATICA',
      bankAccount: null,
      pixKey: { keyType: 'random-key', key: 'abc-123' },
      registeredAt: new Date('2025-01-01T00:00:00.000Z'),
    });
    if (!r.ok) throw new Error(`fixture: ${r.error}`);
    const view = supplierToView(r.value.supplier, UPDATED_AT);

    assert.equal(view.bankAccount, null);
    assert.deepEqual(view.pixKey, { keyType: 'random-key', key: 'abc-123' });
  });
});

describe('financierToView', () => {
  it('projeta identidade corporativa + documento (cnpj) + updatedAt', () => {
    const f = aFinancier();
    const view = financierToView(f, UPDATED_AT);

    assert.equal(view.type, 'financier');
    assert.equal(view.id, f.id as unknown as string);
    assert.equal(view.name, 'Fundação Bem Comum');
    assert.equal(view.document, f.cnpj as unknown as string);
    assert.equal(view.corporateName, 'Fundação Bem Comum LTDA');
    assert.equal(view.legalRepresentative, 'Maria Silva');
    assert.equal(view.telephone, '+5511999998888');
    assert.equal(view.address, 'Av. Paulista, 1000');
    assert.deepEqual(view.updatedAt, UPDATED_AT);
  });
});

describe('collaboratorToView', () => {
  it('projeta nome, documento (cpf), email, papel + updatedAt', () => {
    const c = aCollaborator();
    const view = collaboratorToView(c, UPDATED_AT);

    assert.equal(view.type, 'collaborator');
    assert.equal(view.id, c.id as unknown as string);
    assert.equal(view.name, 'João Souza');
    assert.equal(view.email, 'joao@bemcomum.org');
    assert.equal(view.document, c.cpf as unknown as string);
    assert.equal(view.role, 'Educador');
    assert.equal(view.occupationArea, 'PARC');
    assert.deepEqual(view.updatedAt, UPDATED_AT);
  });
});

describe('actToView (paridade 4/4 — FR-005)', () => {
  it('projeta nome, documento (cpf), email, papel, área + updatedAt (espelha Collaborator)', () => {
    const a = anAct();
    const view = actToView(a, UPDATED_AT);

    assert.equal(view.type, 'act');
    assert.equal(view.id, a.id as unknown as string);
    assert.equal(view.name, 'Ana Ato');
    assert.equal(view.email, 'ana@bemcomum.org');
    assert.equal(view.document, a.cpf as unknown as string);
    assert.equal(view.role, 'Voluntária');
    assert.equal(view.occupationArea, 'PARC');
    assert.deepEqual(view.updatedAt, UPDATED_AT);
  });

  it('é membro da união ContractorView (discriminado por type)', () => {
    const view = actToView(anAct(), UPDATED_AT);
    // Narrowing pelo discriminante prova que ActView entrou na união ContractorView.
    const contractor: ContractorView = view;
    assert.equal(contractor.type === 'act' ? contractor.occupationArea : null, 'PARC');
  });
});
