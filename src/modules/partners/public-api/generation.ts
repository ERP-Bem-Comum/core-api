/**
 * Recorte geracional (convenção Pew, pelo ANO de nascimento) do módulo `partners` — public-api.
 *
 * Irmão de `completed-years.ts` (idade por pessoa) e espelho de `AGE_RANGE_CATEGORIES`
 * (`collaborator-demographics.ts`): a geração entra na tabela "Equipe ABC" como CÓDIGO por pessoa
 * (REPORTS-TEAM-GENERATION · #1055). A P.O. decidiu derivá-la DENTRO do `partners` e expor só o
 * código — nem a data de nascimento nem o ano cruzam a fronteira LGPD (ADR-0006), igual à idade.
 *
 * PURA e sem clock: a geração depende SÓ do ano de nascimento, não de uma data de referência —
 * uma pessoa não muda de geração com o tempo. Diferente de `completedYears`, que precisa do "hoje".
 *
 * O ano sai dos campos UTC (`PlainDate.fromDate`), como todo o resto do `partners` trata
 * `dateOfBirth`: geração é conta de CALENDÁRIO, não de instante — extrair o ano no fuso local
 * jogaria um nascido em 31/12 para o ano seguinte (ou anterior) conforme a máquina.
 *
 * Recortes (Pew): Boomer 1946–1964, X 1965–1980, Millennial 1981–1996, Z 1997–2012. Sem data →
 * `NA`. Fora dos recortes (≤1945 ou ≥2013) → `OUTROS` (balde residual, nunca estica Boomer nem Z).
 * `NA`/`OUTROS` reusam os ids canônicos de `collaborator-demographics.ts` — fonte única.
 */
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import {
  type CategoryCount,
  NOT_AVAILABLE_ID,
  OTHERS_ID,
  notAvailable,
} from './collaborator-demographics.ts';

/**
 * Template zerado da distribuição geracional, no molde de `AGE_RANGE_CATEGORIES` (id + label +
 * count). `OUTROS` NÃO entra no template — é residual, acrescentado só quando há gente nele (igual
 * ao `distribute` dos demográficos). `NA` é bucket próprio do template.
 */
export const GENERATION_CATEGORIES: readonly CategoryCount[] = [
  { id: 'BOOMER', label: 'Baby Boomer', count: 0 },
  { id: 'GEN_X', label: 'Geração X', count: 0 },
  { id: 'MILLENNIAL', label: 'Millennial', count: 0 },
  { id: 'GEN_Z', label: 'Geração Z', count: 0 },
  notAvailable,
];

/**
 * Deriva o CÓDIGO da geração a partir da data de nascimento. `null` → `NA`; ano fora dos recortes
 * Pew → `OUTROS`. NUNCA devolve `null` — o contrato do campo `generation` é `string`.
 */
export const generationIdOf = (birth: Date | null): string => {
  if (birth === null) return NOT_AVAILABLE_ID;
  const year = PlainDate.fromDate(birth).year;
  if (year >= 1946 && year <= 1964) return 'BOOMER';
  if (year >= 1965 && year <= 1980) return 'GEN_X';
  if (year >= 1981 && year <= 1996) return 'MILLENNIAL';
  if (year >= 1997 && year <= 2012) return 'GEN_Z';
  return OTHERS_ID;
};
