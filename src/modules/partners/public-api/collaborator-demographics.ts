/**
 * Agregacao demografica da equipe (REPORTS-TEAM-DEMOGRAPHICS - REP-1 . Equipe ABC) -
 * public-api do `partners`.
 *
 * PURO: zero infra, zero I/O, zero clock ambiente. O backend agrega (Opcao A da P.O.) e so a
 * ESTATISTICA atravessa a fronteira - dado sensivel (raca, identidade de genero, data de
 * nascimento) nunca sai como linha por pessoa (CA2).
 *
 * Decisoes de contrato:
 *  - `label` PT-BR viaja junto do `id` canonico: o front nao mantem mapa id->label (era ele que
 *    descartava em silencio `INDIGENA` e 5 das 8 identidades de genero).
 *  - `NA` (ausencia de resposta) e bucket proprio, DISTINTO de `PREFIRO_NAO_RESPONDER` (resposta).
 *  - Valor fora da lista canonica (lixo do legado) cai em `OUTROS` e continua somando (CA5) -
 *    por isso `race`/`genderIdentity` entram como `string | null`, e nao como VO do dominio:
 *    o VO rejeitaria o valor antes de conta-lo.
 *  - Sem k-anonimato (P.O. 2026-07-20): a contagem exibida e a real.
 *  - Faixa etaria = anos completos na `referenceDate` INJETADA (nunca `Date.now()`).
 *
 * Invariante: a soma das fatias de cada dimensao == `totalActive`.
 */

export type CategoryCount = Readonly<{
  id: string;
  label: string;
  count: number;
}>;

/** Linha crua por colaborador - entrada da agregacao (nunca sai da fronteira). */
export type CollaboratorDemographicsRecord = Readonly<{
  active: boolean;
  genderIdentity: string | null;
  race: string | null;
  dateOfBirth: Date | null;
}>;

export type TeamDemographicsSummary = Readonly<{
  totalActive: number;
  gender: readonly CategoryCount[];
  ageRange: readonly CategoryCount[];
  race: readonly CategoryCount[];
}>;

/** Balde residual: valor fora da lista canonica. Ultimo da lista, so quando ha gente nele. */
export const OTHERS_ID = 'OUTROS';
const OTHERS_LABEL = 'Outros';

/** Ausencia de resposta - distinto de `PREFIRO_NAO_RESPONDER`. */
export const NOT_AVAILABLE_ID = 'NA';
const NOT_AVAILABLE_LABEL = 'N/A';

const notAvailable: CategoryCount = { id: NOT_AVAILABLE_ID, label: NOT_AVAILABLE_LABEL, count: 0 };

// As listas canonicas sao o TEMPLATE zerado da distribuicao: todo bucket aparece na resposta
// mesmo com count 0 (CA4), entao o grafico do front nao muda de forma conforme a amostra.

/** 8 identidades de genero do formulario de cadastro + N/A. Campo-fonte: `gender_identity`. */
export const GENDER_CATEGORIES: readonly CategoryCount[] = [
  { id: 'PREFIRO_NAO_RESPONDER', label: 'Prefiro não responder', count: 0 },
  { id: 'HOMEM_CIS', label: 'Homem cis', count: 0 },
  { id: 'HOMEM_TRANS', label: 'Homem trans', count: 0 },
  { id: 'MULHER_CIS', label: 'Mulher cis', count: 0 },
  { id: 'MULHER_TRANS', label: 'Mulher trans', count: 0 },
  { id: 'TRAVESTI', label: 'Travesti', count: 0 },
  { id: 'NAO_BINARIO', label: 'Não binário', count: 0 },
  { id: 'OUTRO', label: 'Outro', count: 0 },
  notAvailable,
];

/** 6 categorias de raca/cor (incl. `INDIGENA`, omitida pelo front) + N/A. Campo-fonte: `race`. */
export const RACE_CATEGORIES: readonly CategoryCount[] = [
  { id: 'AMARELO', label: 'Amarelo', count: 0 },
  { id: 'BRANCO', label: 'Branco', count: 0 },
  { id: 'PARDO', label: 'Pardo', count: 0 },
  { id: 'INDIGENA', label: 'Indígena', count: 0 },
  { id: 'PRETO', label: 'Preto', count: 0 },
  { id: 'PREFIRO_NAO_RESPONDER', label: 'Prefiro não responder', count: 0 },
  notAvailable,
];

/** 6 faixas etarias do legado (o N/A ja e uma delas). Derivadas no servidor. */
export const AGE_RANGE_CATEGORIES: readonly CategoryCount[] = [
  { id: 'ATE_29', label: 'Até 29', count: 0 },
  { id: 'DE_30_A_39', label: '30 a 39', count: 0 },
  { id: 'DE_40_A_49', label: '40 a 49', count: 0 },
  { id: 'DE_50_A_59', label: '50 a 59', count: 0 },
  { id: 'MAIS_60', label: '60+', count: 0 },
  notAvailable,
];

/** Anos completos em `reference` (UTC) - aniversario nao feito no ano conta a idade menor. */
const completedYears = (birth: Date, reference: Date): number => {
  const difference = reference.getUTCFullYear() - birth.getUTCFullYear();
  const hadBirthday =
    reference.getUTCMonth() > birth.getUTCMonth() ||
    (reference.getUTCMonth() === birth.getUTCMonth() &&
      reference.getUTCDate() >= birth.getUTCDate());
  return hadBirthday ? difference : difference - 1;
};

const ageRangeIdOf = (birth: Date | null, reference: Date): string => {
  if (birth === null) return NOT_AVAILABLE_ID;
  const age = completedYears(birth, reference);
  if (age <= 29) return 'ATE_29';
  if (age <= 39) return 'DE_30_A_39';
  if (age <= 49) return 'DE_40_A_49';
  if (age <= 59) return 'DE_50_A_59';
  return 'MAIS_60';
};

/**
 * Distribui `values` sobre o template canonico. Nulo -> `NA`; desconhecido -> `OUTROS`
 * (acrescentado por ultimo, so com count > 0). Nada e descartado: soma == values.length.
 */
const distribute = (
  template: readonly CategoryCount[],
  values: readonly (string | null)[],
): readonly CategoryCount[] => {
  const canonicalIds = new Set(template.map((category) => category.id));
  const counts = new Map<string, number>();
  for (const value of values) {
    const id =
      value === null ? NOT_AVAILABLE_ID : canonicalIds.has(value) ? value : /* CA5 */ OTHERS_ID;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const canonical = template.map((category) => ({
    ...category,
    count: counts.get(category.id) ?? 0,
  }));
  const others = counts.get(OTHERS_ID) ?? 0;
  return others > 0
    ? [...canonical, { id: OTHERS_ID, label: OTHERS_LABEL, count: others }]
    : canonical;
};

export const aggregateTeamDemographics = (
  records: readonly CollaboratorDemographicsRecord[],
  options: Readonly<{ referenceDate: Date }>,
): TeamDemographicsSummary => {
  // CA3: universo = so `active` (soft-delete fora).
  const actives = records.filter((record) => record.active);
  return {
    totalActive: actives.length,
    gender: distribute(
      GENDER_CATEGORIES,
      actives.map((record) => record.genderIdentity),
    ),
    ageRange: distribute(
      AGE_RANGE_CATEGORIES,
      actives.map((record) => ageRangeIdOf(record.dateOfBirth, options.referenceDate)),
    ),
    race: distribute(
      RACE_CATEGORIES,
      actives.map((record) => record.race),
    ),
  };
};
