/**
 * PARTNERS-AGGREGATOR-HTTP — W0 (RED) — agregador (função pura).
 *
 * `aggregatePartners(records, query, opts?)` projeta os 4 tipos para `PartnerListItem`,
 * filtra (`search`/`type`), faz merge, ordena `(name, type, id)`, pagina (meta canônico
 * do partners) e aplica o cap `MAX_TOTAL` (→ err `partners-aggregate-too-large`).
 *
 * RED por inexistência: `partner-aggregate-query.ts` ainda não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Act from '#src/modules/partners/domain/act/act.ts';
import * as ActId from '#src/modules/partners/domain/act/act-id.ts';
import { aggregatePartners } from '#src/modules/partners/adapters/http/partner-aggregate-query.ts';

const NOW = new Date('2026-01-10T08:00:00.000Z');

const unwrap = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(`fixture: ${JSON.stringify(r.error)}`);
  return r.value;
};

const aSupplier = (name: string, cnpj: string) =>
  unwrap(
    Supplier.register({
      id: SupplierId.generate(),
      name,
      email: `${name.toLowerCase()}@f.com`,
      cnpj,
      corporateName: `${name} LTDA`,
      fantasyName: name,
      serviceCategory: 'INFORMATICA',
      bankAccount: null,
      pixKey: { keyType: 'email', key: `${name.toLowerCase()}@f.com` },
      registeredAt: NOW,
    }),
  ).supplier;

const aFinancier = (name: string, cnpj: string) =>
  unwrap(
    Financier.register({
      id: FinancierId.generate(),
      name,
      corporateName: `${name} LTDA`,
      legalRepresentative: 'Rep',
      cnpj,
      telephone: '+5511999998888',
      address: 'Av. Teste, 1',
      registeredAt: NOW,
    }),
  ).financier;

const aCollaborator = (name: string, cpf: string) =>
  unwrap(
    Collaborator.register({
      id: CollaboratorId.generate(),
      name,
      email: `${name.toLowerCase()}@c.org`,
      cpf,
      occupationArea: 'PARC',
      role: 'Educador',
      startOfContract: NOW,
      employmentRelationship: 'CLT',
      registeredAt: NOW,
    }),
  ).collaborator;

const anAct = (name: string, actNumber: string) =>
  unwrap(
    Act.register({
      id: ActId.generate(),
      actNumber,
      name,
      email: `${name.toLowerCase()}@a.org`,
      cnpj: '11.222.333/0001-81',
      corporateName: `${name} Instituição LTDA`,
      fantasyName: name,
      occupationArea: 'PARC',
      legalRepresentative: 'Representante Legal',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      hasFinancialTransfer: false,
      bankAccount: null,
      pixKey: null,
      registeredAt: NOW,
    }),
  ).act;

// Records dos 4 tipos (o adapter envolve o agregado em *ReadRecord; aqui usamos o shape mínimo).
const seed = () => ({
  suppliers: [
    {
      supplier: aSupplier('Alpha', '11.222.333/0001-81'),
      legacyId: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      supplier: aSupplier('Zeta', '11.444.777/0001-61'),
      legacyId: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  financiers: [
    {
      financier: aFinancier('Beta', '11.444.777/0001-61'),
      legacyId: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  collaborators: [
    {
      collaborator: aCollaborator('Gama', '111.444.777-35'),
      legacyId: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  acts: [{ act: anAct('Delta', 'ACT-2026-010'), legacyId: null, createdAt: NOW, updatedAt: NOW }],
});

const DEFAULT_QUERY = { page: 1, limit: 20 } as const;

describe('aggregatePartners — projeção + merge + sort', () => {
  it('sem type: 5 itens dos 4 tipos, ordenados por (name, type, id)', () => {
    const r = aggregatePartners(seed(), DEFAULT_QUERY);
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    // ACT identifica-se pela razão social (CON-ACT-CONTRACTOR-RAZAO-SOCIAL): o item de
    // `anAct('Delta')` projeta `corporateName = 'Delta Instituição LTDA'`. Ordem (name,type,id)
    // inalterada: 'Delta Instituição LTDA' segue entre 'Beta' e 'Gama' (D < G).
    assert.deepEqual(
      r.value.items.map((i) => i.name),
      ['Alpha', 'Beta', 'Delta Instituição LTDA', 'Gama', 'Zeta'],
    );
    assert.equal(r.value.meta.totalItems, 5);
    // projeção plana
    const alpha = r.value.items[0];
    assert.equal(alpha?.type, 'supplier');
    assert.equal(alpha?.document, '11222333000181');
    assert.equal(alpha?.active, true);
  });
});

describe('aggregatePartners — filtro', () => {
  it('type=supplier devolve só fornecedores', () => {
    const r = aggregatePartners(seed(), { ...DEFAULT_QUERY, type: 'supplier' });
    assert.equal(isOk(r), true);
    if (r.ok) assert.deepEqual([...new Set(r.value.items.map((i) => i.type))], ['supplier']);
  });

  it('search casa name (case-insensitive)', () => {
    const r = aggregatePartners(seed(), { ...DEFAULT_QUERY, search: 'alph' });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.items.length, 1);
      assert.equal(r.value.items[0]?.name, 'Alpha');
    }
  });
});

describe('aggregatePartners — paginação (meta canônico)', () => {
  it('limit 2, page 1 → 2 itens; totalItems 5; totalPages 3', () => {
    const r = aggregatePartners(seed(), { page: 1, limit: 2 });
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.items.length, 2);
    assert.deepEqual(r.value.meta, {
      itemCount: 2,
      totalItems: 5,
      itemsPerPage: 2,
      totalPages: 3,
      currentPage: 1,
    });
  });

  it('page além do total → items vazio, meta coerente', () => {
    const r = aggregatePartners(seed(), { page: 99, limit: 2 });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.items.length, 0);
      assert.equal(r.value.meta.totalItems, 5);
    }
  });
});

describe('aggregatePartners — safety cap', () => {
  it('soma > maxTotal → err partners-aggregate-too-large', () => {
    const r = aggregatePartners(seed(), DEFAULT_QUERY, { maxTotal: 2 });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'partners-aggregate-too-large');
  });
});

// CON-ACT-CONTRACTOR-RAZAO-SOCIAL — W0 RED — item de ACT identifica-se pela razão social.
// `actItem` deve projetar `name = act.corporateName ?? act.name` (a inclusão de contrato
// seleciona o ACT pela razão social). RED por inexistência: hoje `actItem` usa `act.name`
// (= objeto do acordo). O seed cria `anAct('Delta')` com `corporateName='Delta Instituição LTDA'`.
describe('aggregatePartners — ACT identificado pela razão social (corporateName)', () => {
  it('item de ACT tem name = corporateName (razão social), não o objeto do acordo', () => {
    const r = aggregatePartners(seed(), { ...DEFAULT_QUERY, type: 'act' });
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.items.length, 1);
    const act = r.value.items[0];
    assert.equal(act?.type, 'act');
    assert.equal(act?.name, 'Delta Instituição LTDA');
    assert.notEqual(act?.name, 'Delta');
  });
});
