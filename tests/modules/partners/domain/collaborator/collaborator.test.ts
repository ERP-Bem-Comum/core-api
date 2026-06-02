import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { isUuidV4 } from '#src/shared/utils/id.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as OccupationArea from '#src/modules/partners/domain/collaborator/occupation-area.ts';
import * as EmploymentRelationship from '#src/modules/partners/domain/collaborator/employment-relationship.ts';
import * as GenderIdentity from '#src/modules/partners/domain/collaborator/gender-identity.ts';
import * as Race from '#src/modules/partners/domain/collaborator/race.ts';
import * as FoodCategory from '#src/modules/partners/domain/collaborator/food-category.ts';
import * as Education from '#src/modules/partners/domain/collaborator/education.ts';
import * as DisableReason from '#src/modules/partners/domain/collaborator/disable-reason.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const LATER = new Date('2026-06-02T12:00:00.000Z');

const baseRegister = () => ({
  id: CollaboratorId.generate(),
  name: 'Maria Silva',
  email: 'maria@bemcomum.org',
  cpf: '11144477735',
  occupationArea: 'PARC',
  role: 'Analista',
  startOfContract: new Date('2026-01-10T00:00:00.000Z'),
  employmentRelationship: 'CLT',
  registeredAt: NOW,
});

const personal = () => ({
  rg: '12.345.678-9',
  dateOfBirth: new Date('1990-05-20T00:00:00.000Z'),
  genderIdentity: 'MULHER_CIS',
  race: 'PARDO',
  education: 'ENSINO_SUPERIOR',
  foodCategory: 'VEGETARIANO',
  foodCategoryDescription: null,
  completeAddress: 'Rua X, 100',
  telephone: '+5511999998888',
  emergencyContactName: 'João',
  emergencyContactTelephone: '+5511888887777',
  allergies: 'nenhuma',
  biography: 'bio',
  experienceInThePublicSector: true,
});

const registerActive = () => {
  const r = Collaborator.register({ ...baseRegister() });
  assert.ok(r.ok, `fixture register: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

describe('CollaboratorId', () => {
  it('generate produz UUID v4', () => {
    assert.equal(isUuidV4(CollaboratorId.generate() as unknown as string), true);
  });
});

describe('enums — parse aceita legado e rejeita desconhecido', () => {
  const cases = [
    { ns: OccupationArea, valid: 'PARC', err: 'invalid-occupation-area' },
    { ns: EmploymentRelationship, valid: 'CLT', err: 'invalid-employment-relationship' },
    { ns: GenderIdentity, valid: 'NAO_BINARIO', err: 'invalid-gender-identity' },
    { ns: Race, valid: 'INDIGENA', err: 'invalid-race' },
    { ns: FoodCategory, valid: 'VEGANO', err: 'invalid-food-category' },
    { ns: Education, valid: 'DOUTORADO', err: 'invalid-education' },
    { ns: DisableReason, valid: 'FALECIMENTO', err: 'invalid-disable-reason' },
  ] as const;

  for (const c of cases) {
    it(`${c.valid} aceito; desconhecido → ${c.err}`, () => {
      assert.equal(isOk(c.ns.parse(c.valid)), true);
      const r = c.ns.parse('NAO_EXISTE');
      assert.equal(isErr(r), true);
      if (!r.ok) assert.equal(r.error, c.err);
    });
  }
});

describe('Collaborator.register', () => {
  it('cria Active + PreRegistration e emite CollaboratorRegistered', () => {
    const r = Collaborator.register({ ...baseRegister() });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.collaborator.status, 'Active');
      assert.equal(r.value.collaborator.registrationStatus, 'PreRegistration');
      assert.equal(r.value.collaborator.cpf as unknown as string, '11144477735');
      assert.equal(r.value.event.type, 'CollaboratorRegistered');
    }
  });

  it('rejeita cpf inválido', () => {
    assert.equal(isErr(Collaborator.register({ ...baseRegister(), cpf: '11144477700' })), true);
  });

  it('rejeita email inválido', () => {
    assert.equal(isErr(Collaborator.register({ ...baseRegister(), email: 'sem-arroba' })), true);
  });

  it('rejeita occupationArea inválida', () => {
    assert.equal(isErr(Collaborator.register({ ...baseRegister(), occupationArea: 'XPTO' })), true);
  });

  it('rejeita name vazio', () => {
    assert.equal(isErr(Collaborator.register({ ...baseRegister(), name: '  ' })), true);
  });
});

describe('Collaborator.completeRegistration', () => {
  it('PreRegistration → Complete, faz merge dos pessoais e emite evento', () => {
    const r = Collaborator.completeRegistration(registerActive(), { ...personal() }, LATER);
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.collaborator.registrationStatus, 'Complete');
      assert.equal(r.value.collaborator.race, 'PARDO');
      assert.equal(r.value.event.type, 'CollaboratorRegistrationCompleted');
    }
  });

  it('rejeita enum pessoal inválido (race)', () => {
    const r = Collaborator.completeRegistration(
      registerActive(),
      { ...personal(), race: 'ROXO' },
      LATER,
    );
    assert.equal(isErr(r), true);
  });

  it('já Complete → collaborator-already-complete', () => {
    const done = Collaborator.completeRegistration(registerActive(), { ...personal() }, LATER);
    assert.ok(done.ok);
    const again = Collaborator.completeRegistration(
      done.value.collaborator,
      { ...personal() },
      LATER,
    );
    assert.equal(isErr(again), true);
    if (!again.ok) assert.equal(again.error, 'collaborator-already-complete');
  });
});

describe('Collaborator.deactivate / reactivate', () => {
  it('deactivate exige disableBy → Inactive (disableBy+deactivatedAt) + evento', () => {
    const r = Collaborator.deactivate(registerActive(), 'DESLIGAMENTO_ABC', LATER);
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.collaborator.status, 'Inactive');
      if (r.value.collaborator.status === 'Inactive') {
        assert.equal(r.value.collaborator.disableBy, 'DESLIGAMENTO_ABC');
        assert.equal(r.value.collaborator.deactivatedAt.getTime(), LATER.getTime());
      }
      assert.equal(r.value.event.type, 'CollaboratorDeactivated');
    }
  });

  it('deactivate rejeita disableBy inválido', () => {
    assert.equal(isErr(Collaborator.deactivate(registerActive(), 'INVENTADO', LATER)), true);
  });

  it('deactivate em já Inactive → collaborator-already-inactive', () => {
    const off = Collaborator.deactivate(registerActive(), 'FALECIMENTO', LATER);
    assert.ok(off.ok);
    const again = Collaborator.deactivate(off.value.collaborator, 'FALECIMENTO', LATER);
    assert.equal(isErr(again), true);
    if (!again.ok) assert.equal(again.error, 'collaborator-already-inactive');
  });

  it('reactivate → Active limpando disableBy + evento', () => {
    const off = Collaborator.deactivate(registerActive(), 'FALECIMENTO', LATER);
    assert.ok(off.ok);
    const on = Collaborator.reactivate(off.value.collaborator, LATER);
    assert.equal(isOk(on), true);
    if (on.ok) {
      assert.equal(on.value.collaborator.status, 'Active');
      assert.equal(on.value.event.type, 'CollaboratorReactivated');
    }
  });

  it('reactivate em já Active → collaborator-already-active', () => {
    const again = Collaborator.reactivate(registerActive(), LATER);
    assert.equal(isErr(again), true);
    if (!again.ok) assert.equal(again.error, 'collaborator-already-active');
  });
});
