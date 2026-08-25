/**
 * Regra UNICA de idade do modulo `partners` (REPORTS-TEAM-DEMOGRAPHIC-COLUMNS).
 *
 * Extraida de `collaborator-demographics.ts` (REPORTS-TEAM-DEMOGRAPHICS), onde nasceu privada,
 * porque agora ha DOIS consumidores: a faixa etaria agregada (`aggregateTeamDemographics`) e a
 * idade por pessoa da tabela "Equipe ABC" (`toTeamProjection`). Duplicar a regra criaria drift
 * silencioso - alguem corrige o corte do aniversario num lugar e esquece o outro.
 *
 * PURA e sem clock ambiente: a data de referencia entra por parametro (injetada via `Clock.today`
 * na composicao), nunca `Date.now()` aqui dentro.
 *
 * Opera sobre `PlainDate` (dia/mes/ano, sem hora e sem timezone) porque idade e conta de
 * CALENDARIO, nao de instante: comparar `Date` obrigaria a escolher um fuso a cada comparacao.
 * Quem tem `Date` na mao converte com `PlainDate.fromDate` (extrai os campos UTC).
 *
 * Corte do aniversario: aniversario nao feito no ano de referencia conta a idade MENOR. O caso
 * 29/02 cai naturalmente da comparacao (mes, dia) - sem ramo especial: em ano nao-bissexto,
 * 28/02 ainda nao completou e 01/03 ja completou.
 */
import type { PlainDate } from '#src/shared/kernel/plain-date.ts';

export const completedYears = (birth: PlainDate, reference: PlainDate): number => {
  const difference = reference.year - birth.year;
  const hadBirthday =
    reference.month > birth.month ||
    (reference.month === birth.month && reference.day >= birth.day);
  return hadBirthday ? difference : difference - 1;
};
