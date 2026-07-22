/**
 * W0 RED - REPORTS-TEAM-DEMOGRAPHICS (REP-1 . Equipe ABC . graficos demograficos).
 *
 * Logica PURA de agregacao demografica, dentro do `partners` (o backend agrega - Opcao A da P.O.).
 * RED por inexistencia de `src/modules/partners/public-api/collaborator-demographics.ts`.
 *
 * Contrato exercitado aqui (o W1 deve implementar exatamente isto):
 *   aggregateTeamDemographics(records, { referenceDate }): TeamDemographicsSummary
 *   - records: linha crua por colaborador (active, genderIdentity, race, dateOfBirth);
 *   - saida: SO contagem por categoria (`CategoryCount = { id, label, count }`), nunca linha.
 *
 * CA3 universo = so `active`.
 * CA4 8 generos + N/A, 6 racas (incl. INDIGENA) + N/A, 6 faixas etarias; N/A != PREFIRO_NAO_RESPONDER;
 *     soma das fatias = total de ativos nas 3 dimensoes.
 * CA5 valor fora da lista canonica -> `Outros` (nunca descarte silencioso).
 * CA6 REMOVIDO (P.O. 2026-07-20): sem k-anonimato — o grafico mostra a contagem real.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  aggregateTeamDemographics,
  GENDER_CATEGORIES,
  RACE_CATEGORIES,
  AGE_RANGE_CATEGORIES,
  OTHERS_ID,
  NOT_AVAILABLE_ID,
  type CategoryCount,
  type CollaboratorDemographicsRecord,
  type TeamDemographicsSummary,
} from '#src/modules/partners/public-api/collaborator-demographics.ts';

// Data de referencia fixa: idade e calculada NO SERVIDOR (clock injetado, sem Date.now).
const REFERENCE = new Date('2026-07-20T00:00:00.000Z');

const record = (
  over: Partial<CollaboratorDemographicsRecord> = {},
): CollaboratorDemographicsRecord => ({
  active: true,
  genderIdentity: 'MULHER_CIS',
  race: 'BRANCO',
  dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
  ...over,
});

const many = (n: number, over: Partial<CollaboratorDemographicsRecord> = {}) =>
  Array.from({ length: n }, () => record(over));

const aggregate = (records: readonly CollaboratorDemographicsRecord[]): TeamDemographicsSummary =>
  aggregateTeamDemographics(records, { referenceDate: REFERENCE });

const idsOf = (buckets: readonly CategoryCount[]): readonly string[] => buckets.map((b) => b.id);

const countOf = (buckets: readonly CategoryCount[], id: string): number =>
  buckets.find((b) => b.id === id)?.count ?? -1;

const sumOf = (buckets: readonly CategoryCount[]): number =>
  buckets.reduce((acc, b) => acc + b.count, 0);

// Aniversario ja passou em 2026-07-20 -> idade exata = 2026 - ano.
const bornForAge = (age: number): Date => new Date(`${String(2026 - age)}-01-01T00:00:00.000Z`);

describe('partners/demographics - listas canonicas (CA4)', () => {
  it('CA4: genero tem as 8 categorias canonicas + N/A, nessa ordem', () => {
    assert.deepEqual(idsOf(GENDER_CATEGORIES), [
      'PREFIRO_NAO_RESPONDER',
      'HOMEM_CIS',
      'HOMEM_TRANS',
      'MULHER_CIS',
      'MULHER_TRANS',
      'TRAVESTI',
      'NAO_BINARIO',
      'OUTRO',
      NOT_AVAILABLE_ID,
    ]);
  });

  it('CA4: raca tem as 6 categorias canonicas (incl. INDIGENA) + N/A', () => {
    assert.deepEqual(idsOf(RACE_CATEGORIES), [
      'AMARELO',
      'BRANCO',
      'PARDO',
      'INDIGENA',
      'PRETO',
      'PREFIRO_NAO_RESPONDER',
      NOT_AVAILABLE_ID,
    ]);
  });

  it('CA4: idade tem as 6 faixas do legado, com rotulos PT-BR', () => {
    assert.deepEqual(idsOf(AGE_RANGE_CATEGORIES), [
      'ATE_29',
      'DE_30_A_39',
      'DE_40_A_49',
      'DE_50_A_59',
      'MAIS_60',
      NOT_AVAILABLE_ID,
    ]);
    assert.deepEqual(
      AGE_RANGE_CATEGORIES.map((c) => c.label),
      ['Até 29', '30 a 39', '40 a 49', '50 a 59', '60+', 'N/A'],
    );
  });

  it('CA4: todo bucket canonico tem label nao-vazio (o front nao mantem mapa id->label)', () => {
    for (const c of [...GENDER_CATEGORIES, ...RACE_CATEGORIES, ...AGE_RANGE_CATEGORIES]) {
      assert.equal(typeof c.label, 'string');
      assert.ok(c.label.length > 0, `categoria sem label: ${c.id}`);
    }
    assert.equal(RACE_CATEGORIES.find((c) => c.id === 'INDIGENA')?.label, 'Indígena');
    assert.equal(RACE_CATEGORIES.find((c) => c.id === NOT_AVAILABLE_ID)?.label, 'N/A');
  });
});

describe('partners/demographics - universo (CA3)', () => {
  it('CA3: inativos ficam fora do total e das 3 distribuicoes', () => {
    const out = aggregate([
      ...many(6, { active: true, race: 'BRANCO' }),
      ...many(9, { active: false, race: 'PRETO' }),
    ]);

    assert.equal(out.totalActive, 6);
    assert.equal(countOf(out.race, 'BRANCO'), 6);
    assert.equal(countOf(out.race, 'PRETO'), 0, 'inativo nao pode contar');
    assert.equal(sumOf(out.race), 6);
  });

  it('CA3: universo vazio -> zeros, sem bucket Outros', () => {
    const out = aggregate([]);

    assert.equal(out.totalActive, 0);
    assert.equal(sumOf(out.gender), 0);
    assert.equal(sumOf(out.race), 0);
    assert.equal(sumOf(out.ageRange), 0);
    assert.equal(idsOf(out.race).includes(OTHERS_ID), false, 'Outros so aparece quando tem gente');
  });
});

describe('partners/demographics - N/A vs PREFIRO_NAO_RESPONDER (CA4)', () => {
  it('CA4: nulo cai em N/A e resposta cai em PREFIRO_NAO_RESPONDER - buckets distintos', () => {
    const out = aggregate([
      ...many(5, { genderIdentity: null, race: null, dateOfBirth: null }),
      ...many(5, {
        genderIdentity: 'PREFIRO_NAO_RESPONDER',
        race: 'PREFIRO_NAO_RESPONDER',
        dateOfBirth: bornForAge(45),
      }),
    ]);

    assert.equal(countOf(out.gender, NOT_AVAILABLE_ID), 5);
    assert.equal(countOf(out.gender, 'PREFIRO_NAO_RESPONDER'), 5);
    assert.equal(countOf(out.race, NOT_AVAILABLE_ID), 5);
    assert.equal(countOf(out.race, 'PREFIRO_NAO_RESPONDER'), 5);
    assert.equal(countOf(out.ageRange, NOT_AVAILABLE_ID), 5, 'sem data de nascimento -> N/A');
    assert.equal(countOf(out.ageRange, 'DE_40_A_49'), 5);
  });
});

describe('partners/demographics - invariante soma = total (CA4)', () => {
  it('CA4: soma das fatias = total de ativos nas 3 dimensoes', () => {
    const out = aggregate([
      ...many(6, { genderIdentity: 'MULHER_CIS', race: 'BRANCO', dateOfBirth: bornForAge(25) }),
      ...many(5, { genderIdentity: 'HOMEM_CIS', race: 'PARDO', dateOfBirth: bornForAge(35) }),
      ...many(5, { genderIdentity: 'NAO_BINARIO', race: 'PRETO', dateOfBirth: bornForAge(65) }),
      ...many(5, { genderIdentity: null, race: null, dateOfBirth: null }),
      ...many(3, { active: false, genderIdentity: 'TRAVESTI', race: 'INDIGENA' }),
    ]);

    assert.equal(out.totalActive, 21);
    assert.equal(sumOf(out.gender), 21, 'genero');
    assert.equal(sumOf(out.race), 21, 'raca');
    assert.equal(sumOf(out.ageRange), 21, 'faixa etaria');
  });

  it('CA4: todos os buckets canonicos aparecem, mesmo zerados', () => {
    const out = aggregate(many(5, { genderIdentity: 'MULHER_CIS', race: 'BRANCO' }));

    for (const c of GENDER_CATEGORIES) {
      assert.ok(idsOf(out.gender).includes(c.id), `bucket de genero ausente: ${c.id}`);
    }
    for (const c of RACE_CATEGORIES) {
      assert.ok(idsOf(out.race).includes(c.id), `bucket de raca ausente: ${c.id}`);
    }
    for (const c of AGE_RANGE_CATEGORIES) {
      assert.ok(idsOf(out.ageRange).includes(c.id), `faixa etaria ausente: ${c.id}`);
    }
    assert.equal(countOf(out.race, 'INDIGENA'), 0, 'INDIGENA existe no contrato mesmo zerada');
  });
});

describe('partners/demographics - faixa etaria calculada no servidor', () => {
  const cases: readonly (readonly [number, string])[] = [
    [0, 'ATE_29'],
    [29, 'ATE_29'],
    [30, 'DE_30_A_39'],
    [39, 'DE_30_A_39'],
    [40, 'DE_40_A_49'],
    [49, 'DE_40_A_49'],
    [50, 'DE_50_A_59'],
    [59, 'DE_50_A_59'],
    [60, 'MAIS_60'],
    [91, 'MAIS_60'],
  ];

  for (const [age, expected] of cases) {
    it(`idade ${String(age)} cai em ${expected}`, () => {
      const out = aggregate(many(5, { dateOfBirth: bornForAge(age) }));
      assert.equal(countOf(out.ageRange, expected), 5);
      assert.equal(sumOf(out.ageRange), 5);
    });
  }

  it('aniversario ainda nao feito no ano de referencia conta a idade menor', () => {
    // Nasceu em 1996-12-31: em 2026-07-20 ainda tem 29 (faz 30 em dezembro).
    const out = aggregate(many(5, { dateOfBirth: new Date('1996-12-31T00:00:00.000Z') }));
    assert.equal(countOf(out.ageRange, 'ATE_29'), 5);
    assert.equal(countOf(out.ageRange, 'DE_30_A_39'), 0);
  });
});

describe('partners/demographics - valor desconhecido vai para Outros (CA5)', () => {
  it('CA5: genero/raca fora da lista canonica nao some - cai em Outros e soma no total', () => {
    const out = aggregate([
      ...many(6, { genderIdentity: 'MULHER_CIS', race: 'BRANCO' }),
      ...many(5, { genderIdentity: 'AGENERO', race: 'XPTO' }),
    ]);

    assert.equal(out.totalActive, 11);
    assert.equal(countOf(out.gender, OTHERS_ID), 5);
    assert.equal(countOf(out.race, OTHERS_ID), 5);
    assert.equal(sumOf(out.gender), 11, 'nada pode ser descartado em silencio');
    assert.equal(sumOf(out.race), 11);
  });

  it('CA5: Outros e o ultimo bucket da lista', () => {
    const out = aggregate([...many(6, { race: 'BRANCO' }), ...many(5, { race: 'XPTO' })]);
    assert.equal(idsOf(out.race).at(-1), OTHERS_ID);
  });
});

describe('partners/demographics - a saida nao carrega pessoa (CA2)', () => {
  it('CA2: o resumo tem so as 4 chaves agregadas e cada bucket so {id,label,count}', () => {
    const out = aggregate(many(6, { dateOfBirth: bornForAge(41) }));

    assert.deepEqual(Object.keys(out).sort(), ['ageRange', 'gender', 'race', 'totalActive']);
    for (const bucket of [...out.gender, ...out.race, ...out.ageRange]) {
      assert.deepEqual(Object.keys(bucket).sort(), ['count', 'id', 'label']);
      assert.equal(typeof bucket.count, 'number');
    }
    const raw = JSON.stringify(out);
    for (const leak of ['dateOfBirth', 'birth', 'genderIdentity', 'idade', 'age"', 'cpf']) {
      assert.equal(raw.includes(leak), false, `vazou dado por pessoa: ${leak}`);
    }
    assert.equal(/\d{4}-\d{2}-\d{2}/.test(raw), false, 'nenhuma data pode atravessar a fronteira');
  });
});
