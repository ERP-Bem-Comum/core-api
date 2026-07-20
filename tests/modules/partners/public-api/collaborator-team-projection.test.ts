/**
 * W0 RED — REPORTS-TEAM-DEMOGRAPHIC-COLUMNS. Mapper PURO da projeção "Equipe ABC".
 *
 * Hoje `toProjection` é privado ao módulo e devolve 10 campos. Este ticket exige um mapper
 * EXPORTADO e puro — `toTeamProjection(collaborator, today)` — porque a idade precisa da data de
 * referência INJETADA (via `Clock.today()` na composição), nunca `Date.now()` dentro da função.
 *
 * RED esperado: `toTeamProjection` não existe em `partners/public-api/collaborator-projection.ts`
 * (import de namespace → `TypeError: ... is not a function`, um RED por teste).
 *
 * CA1: a projeção passa a ter genderIdentity, race e age.
 * CA2: `age` é anos COMPLETOS na data de referência; sem data de nascimento → null.
 * CA3: `dateOfBirth` não existe na projeção (só `age`).
 * CA4: nulos preservados (nunca string vazia).
 * CA6: os 10 campos atuais seguem idênticos.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import type { PlainDate as PlainDateType } from '#src/shared/kernel/plain-date.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import type { Collaborator as CollaboratorType } from '#src/modules/partners/domain/collaborator/types.ts';
import * as Projection from '#src/modules/partners/public-api/collaborator-projection.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const START = new Date('2025-02-01T00:00:00.000Z');

/** Data de referência do cálculo — injetada, jamais `Date.now()`. */
const today = (iso: string): PlainDateType => {
  const d = PlainDate.from(iso);
  assert.ok(d.ok, `fixture inválida: ${iso}`);
  return d.value;
};

const CURRENT_TEN_KEYS = [
  'id',
  'name',
  'program',
  'role',
  'employmentRelationship',
  'startOfContract',
  'registrationStatus',
  'active',
  'education',
  'experienceInPublicSector',
];

const NEW_KEYS = ['genderIdentity', 'race', 'age'];

/** Colaborador em pré-cadastro: campos pessoais todos null. */
const makeActive = (): CollaboratorType => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name: 'Maria Silva',
    email: 'maria.silva@bemcomum.org',
    cpf: '111.444.777-35',
    occupationArea: 'PARC',
    role: 'Educadora',
    startOfContract: START,
    employmentRelationship: 'CLT',
    registeredAt: NOW,
  });
  assert.ok(r.ok, `fixture inválida: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

const DEFAULT_BIRTH = new Date('1990-05-10T00:00:00.000Z');

/** Cadastro completo. `dateOfBirth` parametrizável para exercitar o corte do aniversário. */
const makeComplete = (dateOfBirth: Date | null = DEFAULT_BIRTH): CollaboratorType => {
  const r = Collaborator.completeRegistration(
    makeActive(),
    {
      rg: '12.345.678-9',
      dateOfBirth,
      genderIdentity: 'MULHER_CIS',
      race: 'PARDO',
      education: 'ENSINO_SUPERIOR',
      foodCategory: 'ONIVORO',
      foodCategoryDescription: null,
      completeAddress: 'Rua das Flores 123',
      telephone: '11999998888',
      emergencyContactName: 'João Silva',
      emergencyContactTelephone: '11988887777',
      allergies: null,
      biography: null,
      experienceInThePublicSector: true,
    },
    NOW,
  );
  assert.ok(r.ok, `fixture inválida: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

describe('partners/public-api — toTeamProjection (REPORTS-TEAM-DEMOGRAPHIC-COLUMNS)', () => {
  it('CA1: projeta genderIdentity e race do colaborador', () => {
    // Arrange
    const collaborator = makeComplete();

    // Act
    const p = Projection.toTeamProjection(collaborator, today('2026-06-01'));

    // Assert
    assert.equal(p.genderIdentity, 'MULHER_CIS');
    assert.equal(p.race, 'PARDO');
  });

  it('CA2: aniversário JÁ feito no ano → anos completos', () => {
    // Arrange — nasceu 1990-05-10, hoje 2026-06-01 (aniversário passou).
    const collaborator = makeComplete();

    // Act
    const p = Projection.toTeamProjection(collaborator, today('2026-06-01'));

    // Assert
    assert.equal(p.age, 36);
  });

  it('CA2: aniversário AINDA NÃO feito no ano → conta a idade menor', () => {
    // Arrange — nasceu 1990-05-10, hoje 2026-05-09 (véspera).
    const collaborator = makeComplete();

    // Act
    const p = Projection.toTeamProjection(collaborator, today('2026-05-09'));

    // Assert
    assert.equal(p.age, 35, 'na véspera do aniversário ainda tem a idade anterior');
  });

  it('CA2: exatamente no dia do aniversário → já conta o ano', () => {
    // Arrange — nasceu 1990-05-10, hoje 2026-05-10.
    const collaborator = makeComplete();

    // Act
    const p = Projection.toTeamProjection(collaborator, today('2026-05-10'));

    // Assert
    assert.equal(p.age, 36);
  });

  it('CA2: mês anterior ao de nascimento → idade menor', () => {
    // Arrange — nasceu 1990-05-10, hoje 2026-04-30.
    const collaborator = makeComplete();

    // Act
    const p = Projection.toTeamProjection(collaborator, today('2026-04-30'));

    // Assert
    assert.equal(p.age, 35);
  });

  it('CA2: nascido em 29/02 e ano de referência não-bissexto → conta em 01/03', () => {
    // Arrange — nasceu 2000-02-29; 2026 não é bissexto.
    const collaborator = makeComplete(new Date('2000-02-29T00:00:00.000Z'));

    // Act
    const emFevereiro = Projection.toTeamProjection(collaborator, today('2026-02-28'));
    const emMarco = Projection.toTeamProjection(collaborator, today('2026-03-01'));

    // Assert
    assert.equal(emFevereiro.age, 25, '28/02 de ano não-bissexto ainda não completou');
    assert.equal(emMarco.age, 26);
  });

  it('CA2: date_of_birth nulo → age null', () => {
    // Arrange
    const collaborator = makeComplete(null);

    // Act
    const p = Projection.toTeamProjection(collaborator, today('2026-06-01'));

    // Assert
    assert.equal(p.age, null);
  });

  it('CA2: a data de referência é INJETADA — mudar o "hoje" muda a idade', () => {
    // Arrange
    const collaborator = makeComplete();

    // Act
    const em2026 = Projection.toTeamProjection(collaborator, today('2026-06-01'));
    const em2030 = Projection.toTeamProjection(collaborator, today('2030-06-01'));

    // Assert
    assert.equal(em2030.age! - em2026.age!, 4, 'a função é pura: idade varia só com o "hoje"');
  });

  it('CA3: a projeção NÃO expõe dateOfBirth', () => {
    // Arrange
    const collaborator = makeComplete();

    // Act
    const keys = Object.keys(Projection.toTeamProjection(collaborator, today('2026-06-01')));

    // Assert
    assert.equal(keys.includes('dateOfBirth'), false, 'só a idade cruza a public-api');
    assert.equal(keys.includes('birthDate'), false);
  });

  it('CA4: sem race/genderIdentity → null, nunca string vazia', () => {
    // Arrange — pré-cadastro: campos pessoais não preenchidos.
    const collaborator = makeActive();

    // Act
    const p = Projection.toTeamProjection(collaborator, today('2026-06-01'));

    // Assert
    assert.equal(p.genderIdentity, null);
    assert.equal(p.race, null);
    assert.equal(p.age, null);
    assert.notEqual(p.genderIdentity, '', 'string vazia é valor inventado');
    assert.notEqual(p.race, '');
  });

  it('CA6: regressão zero — os 10 campos atuais seguem idênticos', () => {
    // Arrange
    const collaborator = makeComplete();

    // Act
    const p = Projection.toTeamProjection(collaborator, today('2026-06-01'));

    // Assert
    assert.equal(p.name, 'Maria Silva');
    assert.equal(p.role, 'Educadora');
    assert.equal(p.employmentRelationship, 'CLT');
    assert.equal(p.startOfContract, '2025-02-01', 'date-only YYYY-MM-DD');
    assert.equal(p.registrationStatus, 'Complete');
    assert.equal(p.active, true);
    assert.equal(p.program, null, 'programa não existe no core-api → null');
    assert.equal(p.education, 'ENSINO_SUPERIOR');
    assert.equal(p.experienceInPublicSector, true);
  });

  it('CA6: a projeção tem EXATAMENTE 13 chaves (10 atuais + 3 novas)', () => {
    // Arrange
    const collaborator = makeComplete();

    // Act
    const keys = [
      ...Object.keys(Projection.toTeamProjection(collaborator, today('2026-06-01'))),
    ].sort();

    // Assert
    assert.deepEqual(keys, [...CURRENT_TEN_KEYS, ...NEW_KEYS].sort());
  });
});
