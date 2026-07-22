import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { type Money, type MoneyError, fromCents } from '../../../../shared/kernel/money.ts';
import type { LaunchType } from '../cost-structure/launch-type.ts';

// Modelo de cálculo do lançamento: discriminated union cujo discriminante É o LaunchType da
// subcategoria alvo. Paridade 1:1 com o legado `calc-total-value-result.ts`. Campos em EN idênticos
// ao legado para minimizar tradução (o "Qtd" da folha, `numberOfFinancialDirectors`, é metadado —
// não entra no cálculo, logo não faz parte deste input).
export type IpcaInput = Readonly<{ kind: 'IPCA'; baseValueInCents: number; ipca: number }>;

export type CaedInput = Readonly<{
  kind: 'CAED';
  numberOfEnrollments: number;
  baseValueInCents: number;
}>;

export type PersonalExpensesInput = Readonly<{
  kind: 'DESPESAS_PESSOAIS';
  salaryInCents: number;
  salaryAdjustment: number;
  inssEmployer: number;
  inss: number;
  fgtsCharges: number;
  pisCharges: number;
  foodVoucherInCents: number;
  transportationVouchersInCents: number;
  healthInsuranceInCents: number;
  lifeInsuranceInCents: number;
  holidaysAndChargesInCents: number;
  allowanceInCents: number;
  thirteenthInCents: number;
  fgtsInCents: number;
}>;

export type LogisticsExpensesInput = Readonly<{
  kind: 'DESPESAS_LOGISTICAS';
  numberOfPeople: number;
  totalTrips: number;
  airfareInCents: number;
  dailyAccommodation: number;
  accommodationInCents: number;
  dailyFood: number;
  foodInCents: number;
  dailyTransport: number;
  transportInCents: number;
  dailyCarAndFuel: number;
  carAndFuelInCents: number;
}>;

export type CalcModelInput = IpcaInput | CaedInput | PersonalExpensesInput | LogisticsExpensesInput;

export type CalcError = MoneyError;
export type CalcMismatchError = 'calc-model-mismatch';

// Soma bruta em centavos (float), reproduzindo case-a-case `calc-total-value-result.ts:10-55`.
const rawCents = (input: CalcModelInput): number => {
  switch (input.kind) {
    case 'IPCA':
      return input.baseValueInCents * (input.ipca / 100) + input.baseValueInCents;
    case 'CAED':
      return input.numberOfEnrollments * input.baseValueInCents;
    case 'DESPESAS_PESSOAIS': {
      const totalSalary = input.salaryInCents * (1 + input.salaryAdjustment / 100);
      const totalCharges =
        ((input.inssEmployer + input.inss + input.fgtsCharges + input.pisCharges) / 100) *
        totalSalary;
      const totalBenefits =
        input.foodVoucherInCents +
        input.transportationVouchersInCents +
        input.healthInsuranceInCents +
        input.lifeInsuranceInCents;
      const totalProvisions =
        input.holidaysAndChargesInCents +
        input.allowanceInCents +
        input.thirteenthInCents +
        input.fgtsInCents;
      return totalSalary + totalCharges + totalBenefits + totalProvisions;
    }
    case 'DESPESAS_LOGISTICAS': {
      const trips = input.numberOfPeople * input.totalTrips;
      const airfare = trips * input.airfareInCents; // passagem: sem diária
      const accommodation = trips * input.dailyAccommodation * input.accommodationInCents;
      const expenses =
        trips * input.dailyFood * input.foodInCents +
        trips * input.dailyTransport * input.transportInCents +
        trips * input.dailyCarAndFuel * input.carAndFuelInCents;
      return airfare + accommodation + expenses;
    }
    default: {
      const _: never = input;
      return _;
    }
  }
};

// Legado calcula em float e grava em coluna `bigint` → MySQL arredonda na inserção. Reproduzimos
// com Math.round no ponto de conversão para Money (custos positivos: round-half-up ≡ round-half-
// away-from-zero do MySQL). É a invariante de paridade — não trocar por trunc/floor.
export const calculate = (input: CalcModelInput): Result<Money, CalcError> =>
  fromCents(Math.round(rawCents(input)));

// A subcategoria alvo define o launchType; um lançamento com modelo divergente é inválido (CA2).
export const ensureMatchesLaunchType = (
  input: CalcModelInput,
  launchType: LaunchType,
): Result<CalcModelInput, CalcMismatchError> =>
  input.kind === launchType ? ok(input) : err('calc-model-mismatch');
