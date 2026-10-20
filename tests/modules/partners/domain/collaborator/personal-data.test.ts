/**
 * #1072 — dado pessoal do colaborador: normalização e "preenche uma vez" num ponto único do
 * agregado, valendo para TODO comando que escreve (register, edit, completeRegistration).
 *
 * Os asserts conferem o VALOR gravado, não só o `ok`: o defeito que originou a issue passava
 * verde justamente por um teste que só olhava `r.ok`.
 *
 * Fixtures sintéticas: RG, datas e CPF de teste, nenhum dado de pessoa real.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { is } from 'drizzle-orm';
import { MySqlVarChar } from 'drizzle-orm/mysql-core';

import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as PersonalData from '#src/modules/partners/domain/collaborator/personal-data.ts';
import { diffCollaborator } from '#src/modules/partners/domain/collaborator/collaborator-history.ts';
import type { Collaborator as CollaboratorEntity } from '#src/modules/partners/domain/collaborator/types.ts';
import { parCollaborators } from '#src/modules/partners/adapters/persistence/schemas/mysql.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const LATER = new Date('2026-06-02T12:00:00.000Z');

const baseRegister = () => ({
  id: CollaboratorId.generate(),
  name: 'Maria Teste',
  email: 'maria@example.org',
  cpf: '11144477735',
  occupationArea: 'PARC',
  role: 'Analista',
  startOfContract: new Date('2026-01-10T00:00:00.000Z'),
  employmentRelationship: 'CLT',
  registeredAt: NOW,
});

const editInput = (over: Record<string, unknown> = {}) => {
  const { id: _id, registeredAt: _at, ...cadastrais } = baseRegister();
  return { ...cadastrais, ...over };
};

const emptyComplete = {
  rg: null,
  dateOfBirth: null,
  genderIdentity: null,
  genderIdentityDescription: null,
  race: null,
  education: null,
  foodCategory: null,
  foodCategoryDescription: null,
  completeAddress: null,
  telephone: null,
  emergencyContactName: null,
  emergencyContactTelephone: null,
  allergies: null,
  biography: null,
  experienceInThePublicSector: null,
};

const preRegistered = (): CollaboratorEntity => {
  const r = Collaborator.register({ ...baseRegister() });
  assert.ok(r.ok, `fixture register: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

// PreRegistration com RG, nascimento e raça JÁ gravados pelo PUT (fluxo do #1070).
const preRegisteredWithPersonal = (): CollaboratorEntity => {
  const r = Collaborator.edit(
    preRegistered(),
    editInput({
      rg: '123',
      dateOfBirth: new Date('1990-05-10T00:00:00.000Z'),
      race: 'PARDO',
    }),
    NOW,
  );
  assert.ok(r.ok, `fixture edit: ${r.ok ? '' : r.error}`);
  assert.equal(r.value.collaborator.registrationStatus, 'PreRegistration');
  return r.value.collaborator;
};

const completed = (over: Record<string, unknown> = {}): CollaboratorEntity => {
  const r = Collaborator.completeRegistration(preRegistered(), { ...emptyComplete, ...over }, NOW);
  assert.ok(r.ok, `fixture complete: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

describe('#1072 CA1 — completeRegistration respeita o "preenche uma vez"', () => {
  it('rg null NÃO apaga o RG gravado', () => {
    const r = Collaborator.completeRegistration(preRegisteredWithPersonal(), emptyComplete, LATER);
    assert.ok(r.ok, r.ok ? '' : r.error);
    assert.equal(r.value.collaborator.rg, '123');
    assert.equal(r.value.collaborator.registrationStatus, 'Complete');
  });

  it('rg diferente do gravado → collaborator-personal-data-immutable', () => {
    const r = Collaborator.completeRegistration(
      preRegisteredWithPersonal(),
      { ...emptyComplete, rg: '999' },
      LATER,
    );
    assert.equal(r.ok ? null : r.error, 'collaborator-personal-data-immutable');
  });

  it('rg igual ao gravado (com espaços) mantém', () => {
    const r = Collaborator.completeRegistration(
      preRegisteredWithPersonal(),
      { ...emptyComplete, rg: ' 123 ' },
      LATER,
    );
    assert.ok(r.ok, r.ok ? '' : r.error);
    assert.equal(r.value.collaborator.rg, '123');
  });

  it('dateOfBirth null NÃO apaga a data gravada; diferente → recusa; mesmo dia → mantém', () => {
    const kept = Collaborator.completeRegistration(
      preRegisteredWithPersonal(),
      emptyComplete,
      LATER,
    );
    assert.ok(kept.ok, kept.ok ? '' : kept.error);
    assert.equal(kept.value.collaborator.dateOfBirth?.toISOString(), '1990-05-10T00:00:00.000Z');

    const changed = Collaborator.completeRegistration(
      preRegisteredWithPersonal(),
      { ...emptyComplete, dateOfBirth: new Date('1991-05-10T00:00:00.000Z') },
      LATER,
    );
    assert.equal(changed.ok ? null : changed.error, 'collaborator-personal-data-immutable');

    const same = Collaborator.completeRegistration(
      preRegisteredWithPersonal(),
      { ...emptyComplete, dateOfBirth: new Date('1990-05-10T18:00:00.000Z') },
      LATER,
    );
    assert.ok(same.ok, same.ok ? '' : same.error);
    assert.equal(same.value.collaborator.dateOfBirth?.toISOString(), '1990-05-10T00:00:00.000Z');
  });

  it('race null NÃO apaga a raça gravada; diferente → recusa', () => {
    const kept = Collaborator.completeRegistration(
      preRegisteredWithPersonal(),
      emptyComplete,
      LATER,
    );
    assert.ok(kept.ok, kept.ok ? '' : kept.error);
    assert.equal(kept.value.collaborator.race, 'PARDO');

    const changed = Collaborator.completeRegistration(
      preRegisteredWithPersonal(),
      { ...emptyComplete, race: 'BRANCO' },
      LATER,
    );
    assert.equal(changed.ok ? null : changed.error, 'collaborator-personal-data-immutable');
  });

  it('sem nada gravado, completeRegistration grava os três', () => {
    const r = Collaborator.completeRegistration(
      preRegistered(),
      {
        ...emptyComplete,
        rg: '456',
        dateOfBirth: new Date('1985-03-02T00:00:00.000Z'),
        race: 'PRETO',
      },
      LATER,
    );
    assert.ok(r.ok, r.ok ? '' : r.error);
    assert.equal(r.value.collaborator.rg, '456');
    assert.equal(r.value.collaborator.dateOfBirth?.toISOString(), '1985-03-02T00:00:00.000Z');
    assert.equal(r.value.collaborator.race, 'PRETO');
  });
});

describe("#1072 CA2 — `''` gravado conta como vazio", () => {
  for (const stored of ['', '   ']) {
    it(`rg gravado ${JSON.stringify(stored)} + PUT com rg → grava e o histórico registra`, () => {
      const before: CollaboratorEntity = { ...completed(), rg: stored };
      const r = Collaborator.edit(before, editInput({ rg: '12345' }), LATER);
      assert.ok(r.ok, r.ok ? '' : r.error);
      assert.equal(r.value.collaborator.rg, '12345');
      const rgChange = diffCollaborator(before, r.value.collaborator).find(
        (c) => c.fieldName === 'rg',
      );
      assert.equal(rgChange?.valueAfter, '12345');
    });
  }

  it("rg gravado '' + PUT sem rg → limpa para null (nunca mais grava '')", () => {
    const before: CollaboratorEntity = { ...completed(), rg: '' };
    const r = Collaborator.edit(before, editInput({ role: 'Coordenadora' }), LATER);
    assert.ok(r.ok, r.ok ? '' : r.error);
    assert.equal(r.value.collaborator.rg, null);
  });

  it("rg gravado '' + completeRegistration sem rg → null", () => {
    const before: CollaboratorEntity = { ...preRegistered(), rg: '' };
    const r = Collaborator.completeRegistration(before, emptyComplete, LATER);
    assert.ok(r.ok, r.ok ? '' : r.error);
    assert.equal(r.value.collaborator.rg, null);
  });
});

// A normalização na escrita não pode virar linha de auditoria: o histórico é atribuído a quem fez o
// PUT, e "RG: '' → null" diria que a pessoa de RH mexeu num dado que ela nem enviou.
describe('#1072 — normalizar não gera histórico fantasma', () => {
  const rgChanges = (before: CollaboratorEntity, after: CollaboratorEntity) =>
    diffCollaborator(before, after).filter((c) => c.fieldName === 'rg');

  for (const stored of ['', '   ']) {
    it(`rg gravado ${JSON.stringify(stored)} + PUT sem rg → nenhuma linha de RG`, () => {
      const before: CollaboratorEntity = { ...completed(), rg: stored };
      const r = Collaborator.edit(before, editInput({ role: 'Coordenadora' }), LATER);
      assert.ok(r.ok, r.ok ? '' : r.error);
      assert.deepEqual(rgChanges(before, r.value.collaborator), []);
    });
  }

  it("rg gravado ' 123 ' + PUT reenviando '123' → nenhuma linha de RG", () => {
    const before: CollaboratorEntity = { ...completed(), rg: ' 123 ' };
    const r = Collaborator.edit(before, editInput({ rg: '123' }), LATER);
    assert.ok(r.ok, r.ok ? '' : r.error);
    assert.deepEqual(rgChanges(before, r.value.collaborator), []);
  });

  it("rg gravado '' + PUT com rg → a linha diz que estava vazio (null), não ''", () => {
    const before: CollaboratorEntity = { ...completed(), rg: '' };
    const r = Collaborator.edit(before, editInput({ rg: '12345' }), LATER);
    assert.ok(r.ok, r.ok ? '' : r.error);
    assert.deepEqual(rgChanges(before, r.value.collaborator), [
      { fieldName: 'rg', valueBefore: null, valueAfter: '12345' },
    ]);
  });

  it('genderIdentityDescription não é campo rastreado (o PUT não a escreve) — nenhuma linha', () => {
    const before: CollaboratorEntity = { ...completed(), genderIdentityDescription: ' x ' };
    const after: CollaboratorEntity = { ...before, genderIdentityDescription: 'x' };
    assert.deepEqual(
      diffCollaborator(before, after).filter((c) => c.fieldName === 'genderIdentityDescription'),
      [],
    );
  });
});

describe("#1072 CA3 — branco grava null, nunca ''", () => {
  it('register nasce com rg e genderIdentityDescription null', () => {
    const c = preRegistered();
    assert.equal(c.rg, null);
    assert.equal(c.genderIdentityDescription, null);
  });

  it('edit com rg em branco e nada gravado → null', () => {
    const r = Collaborator.edit(completed(), editInput({ rg: '   ' }), LATER);
    assert.ok(r.ok, r.ok ? '' : r.error);
    assert.equal(r.value.collaborator.rg, null);
  });

  it('completeRegistration com rg e descrição em branco → null nos dois', () => {
    const r = Collaborator.completeRegistration(
      preRegistered(),
      { ...emptyComplete, rg: '  ', genderIdentity: 'OUTRO', genderIdentityDescription: ' ' },
      LATER,
    );
    assert.ok(r.ok, r.ok ? '' : r.error);
    assert.equal(r.value.collaborator.rg, null);
    assert.equal(r.value.collaborator.genderIdentityDescription, null);
  });
});

describe('#1072 CA4 — limites no domínio (sem a borda), erro nomeado', () => {
  const rg21 = '1'.repeat(PersonalData.RG_MAX_LENGTH + 1);
  const desc121 = 'x'.repeat(PersonalData.GENDER_IDENTITY_DESCRIPTION_MAX_LENGTH + 1);

  // Amarra o domínio ao schema de persistência sem que um importe o outro: quem liga os dois é o
  // teste. Comparar com literais (20, 120) só provaria que o número foi digitado duas vezes.
  it('o teto do RG é o varchar de par_collaborators.rg', () => {
    const column = parCollaborators.rg;
    assert.ok(is(column, MySqlVarChar), 'rg deveria ser varchar');
    assert.equal(PersonalData.RG_MAX_LENGTH, column.length);
  });

  it('o teto da descrição de gênero cabe no varchar de par_collaborators', () => {
    const column = parCollaborators.genderIdentityDescription;
    assert.ok(is(column, MySqlVarChar), 'gender_identity_description deveria ser varchar');
    assert.ok(column.length !== undefined, 'varchar sem length declarado');
    assert.ok(
      PersonalData.GENDER_IDENTITY_DESCRIPTION_MAX_LENGTH <= column.length,
      `${String(PersonalData.GENDER_IDENTITY_DESCRIPTION_MAX_LENGTH)} > ${String(column.length)}`,
    );
  });

  it('rg com 21 caracteres no edit → collaborator-rg-too-long', () => {
    const r = Collaborator.edit(completed(), editInput({ rg: rg21 }), LATER);
    assert.equal(r.ok ? null : r.error, 'collaborator-rg-too-long');
  });

  it('rg com 21 caracteres no completeRegistration → collaborator-rg-too-long', () => {
    const r = Collaborator.completeRegistration(
      preRegistered(),
      { ...emptyComplete, rg: rg21 },
      LATER,
    );
    assert.equal(r.ok ? null : r.error, 'collaborator-rg-too-long');
  });

  it('rg com 20 caracteres e espaços nas pontas é aceito (conta depois do trim)', () => {
    const rg20 = '2'.repeat(20);
    const r = Collaborator.edit(completed(), editInput({ rg: `  ${rg20}  ` }), LATER);
    assert.ok(r.ok, r.ok ? '' : r.error);
    assert.equal(r.value.collaborator.rg, rg20);
  });

  it('descrição com 121 caracteres → collaborator-gender-identity-description-too-long', () => {
    const r = Collaborator.completeRegistration(
      preRegistered(),
      { ...emptyComplete, genderIdentity: 'OUTRO', genderIdentityDescription: desc121 },
      LATER,
    );
    assert.equal(r.ok ? null : r.error, 'collaborator-gender-identity-description-too-long');
  });

  it('descrição com 120 caracteres é aceita', () => {
    const desc120 = 'y'.repeat(120);
    const r = Collaborator.completeRegistration(
      preRegistered(),
      { ...emptyComplete, genderIdentity: 'OUTRO', genderIdentityDescription: desc120 },
      LATER,
    );
    assert.ok(r.ok, r.ok ? '' : r.error);
    assert.equal(r.value.collaborator.genderIdentityDescription, desc120);
  });
});

describe('#1072 CA5 — nascimento é dia civil', () => {
  it('instante com hora é gravado como meia-noite UTC do mesmo dia', () => {
    const r = Collaborator.edit(
      completed(),
      editInput({ dateOfBirth: new Date('1990-05-10T15:30:00.000Z') }),
      LATER,
    );
    assert.ok(r.ok, r.ok ? '' : r.error);
    assert.equal(r.value.collaborator.dateOfBirth?.toISOString(), '1990-05-10T00:00:00.000Z');
  });

  it('data futura (dia seguinte a `at`) → collaborator-date-of-birth-in-future', () => {
    const r = Collaborator.edit(
      completed(),
      editInput({ dateOfBirth: new Date('2026-06-03T00:00:00.000Z') }),
      LATER,
    );
    assert.equal(r.ok ? null : r.error, 'collaborator-date-of-birth-in-future');
  });

  it('data futura também é recusada no completeRegistration', () => {
    const r = Collaborator.completeRegistration(
      preRegistered(),
      { ...emptyComplete, dateOfBirth: new Date('2090-01-01T00:00:00.000Z') },
      LATER,
    );
    assert.equal(r.ok ? null : r.error, 'collaborator-date-of-birth-in-future');
  });

  it('o próprio dia de `at` não é futuro', () => {
    const r = Collaborator.edit(
      completed(),
      editInput({ dateOfBirth: new Date('2026-06-02T00:00:00.000Z') }),
      LATER,
    );
    assert.ok(r.ok, r.ok ? '' : r.error);
  });

  it('Date inválida → collaborator-date-of-birth-invalid (Result, não RangeError)', () => {
    const r = Collaborator.edit(
      completed(),
      editInput({ dateOfBirth: new Date('não é data') }),
      LATER,
    );
    assert.equal(r.ok ? null : r.error, 'collaborator-date-of-birth-invalid');
  });

  it('ano abaixo do piso do DATETIME do MySQL → collaborator-date-of-birth-invalid (não 503)', () => {
    for (const year of [500, 50]) {
      const d = new Date(0);
      d.setUTCFullYear(year, 0, 1); // `Date.UTC(50, …)` daria 1950 — o caso tem de ser o ano 50.
      const r = Collaborator.edit(completed(), editInput({ dateOfBirth: d }), LATER);
      assert.equal(r.ok ? null : r.error, 'collaborator-date-of-birth-invalid', `ano ${year}`);
    }
  });

  it('civilDayIso é o helper único do dia civil (comparação e histórico)', () => {
    assert.equal(PersonalData.civilDayIso(new Date('1990-05-10T23:59:59.999Z')), '1990-05-10');
    const before = completed({ dateOfBirth: null });
    const after: CollaboratorEntity = {
      ...before,
      dateOfBirth: new Date('1990-05-10T00:00:00.000Z'),
    };
    const change = diffCollaborator(before, after).find((c) => c.fieldName === 'dateOfBirth');
    assert.equal(change?.valueAfter, '1990-05-10');
  });
});
