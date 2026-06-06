/**
 * PARTNERS-ACT-PLACEHOLDER — W0 (RED) — Entity Act (placeholder espelhando Collaborator núcleo,
 * ADR-0036). DEVE FALHAR: o domínio `act` ainda não existe. Status duplo + soft-delete, como o
 * Collaborator — sem os fluxos avançados (import/complete-27/filtros) até as regras reais.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Act from '#src/modules/partners/domain/act/act.ts';

const NOW = new Date('2026-06-06T12:00:00.000Z');

const VALID = {
  name: 'Maria Silva',
  email: 'maria@bemcomum.org',
  cpf: '11144477735',
  occupationArea: 'PARC',
  role: 'Analista',
  startOfContract: NOW,
  employmentRelationship: 'CLT',
} as const;

describe('Act — Entity placeholder (espelha Collaborator núcleo)', () => {
  it('register: nasce Active + PreRegistration', () => {
    const r = Act.register({ id: 'act-1' as never, ...VALID, registeredAt: NOW });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.act.status, 'Active');
    assert.equal(r.value.act.registrationStatus, 'PreRegistration');
  });

  it('register: rejeita CPF inválido (DV)', () => {
    const r = Act.register({
      id: 'act-1' as never,
      ...VALID,
      cpf: '11111111111',
      registeredAt: NOW,
    });
    assert.equal(r.ok, false);
  });

  it('deactivate: Active → Inactive carrega deactivatedAt (soft-delete)', () => {
    const r = Act.register({ id: 'act-1' as never, ...VALID, registeredAt: NOW });
    assert.ok(r.ok);
    if (!r.ok) return;
    const d = Act.deactivate(r.value.act, NOW);
    assert.equal(d.status, 'Inactive');
    if (d.status === 'Inactive') assert.deepEqual(d.deactivatedAt, NOW);
  });

  it('reactivate: Inactive → Active', () => {
    const r = Act.register({ id: 'act-1' as never, ...VALID, registeredAt: NOW });
    assert.ok(r.ok);
    if (!r.ok) return;
    const d = Act.deactivate(r.value.act, NOW);
    const a = Act.reactivate(d);
    assert.equal(a.status, 'Active');
  });
});
