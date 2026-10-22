import { type Result, ok, err } from '../primitives/result.ts';
import type { Brand } from '../primitives/brand.ts';

/**
 * CPF validado: string brandada com a marca literal `'Cpf'`. Uma string crua não é atribuível a
 * `Cpf`.
 */
export type Cpf = Brand<string, 'Cpf'>;

/** Erro de {@link parse}: exatamente o literal `'invalid-cpf'`. */
export type CpfError = 'invalid-cpf';

const CPF_LENGTH = 11;
const FIRST_CHECK_DIGIT_INDEX = 9;
const SECOND_CHECK_DIGIT_INDEX = 10;
const FIRST_CHECK_DIGIT_WEIGHTS: readonly number[] = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_CHECK_DIGIT_WEIGHTS: readonly number[] = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const ASCII_ZERO = 48;

const stripNonAsciiDigits = (raw: string): string => raw.replace(/\D/g, '');

const isSingleRepeatedDigit = (digits: string): boolean => /^(\d)\1+$/.test(digits);

const modulusElevenCheckDigit = (weightedSum: number): number => {
  const remainder = weightedSum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};

const expectedCheckDigit = (digits: string, weights: readonly number[]): number =>
  modulusElevenCheckDigit(
    weights.reduce((sum, weight, i) => sum + (digits.charCodeAt(i) - ASCII_ZERO) * weight, 0),
  );

const hasValidCheckDigits = (digits: string): boolean =>
  expectedCheckDigit(digits, FIRST_CHECK_DIGIT_WEIGHTS) ===
    Number(digits[FIRST_CHECK_DIGIT_INDEX]) &&
  expectedCheckDigit(digits, SECOND_CHECK_DIGIT_WEIGHTS) ===
    Number(digits[SECOND_CHECK_DIGIT_INDEX]);

const isValidCpfDigits = (digits: string): boolean =>
  digits.length === CPF_LENGTH && !isSingleRepeatedDigit(digits) && hasValidCheckDigits(digits);

/**
 * Valida e normaliza um CPF. Descarta todo caractere que não seja dígito ASCII, em qualquer
 * posição, sem conferir onde ficam os separadores: aceita a máscara `000.000.000-00`, o CPF sem
 * máscara e também letras, espaços e quebras de linha intercalados. Dígitos não-ASCII
 * (full-width, arábico-índicos) são descartados como não-dígitos. Os dígitos restantes passam pela
 * verificação dos dois dígitos verificadores em módulo 11, em que resto menor que 2 dá
 * verificador 0.
 *
 * @param raw - Texto de entrada, com ou sem máscara.
 * @returns `ok` com o {@link Cpf} igual aos 11 dígitos ASCII sem máscara; `err('invalid-cpf')` quando
 *   sobram menos ou mais de 11 dígitos (inclusive string vazia ou sem dígito), quando os 11
 *   dígitos são um único dígito repetido (`00000000000` a `99999999999`) ou quando o primeiro, o
 *   segundo ou os dois dígitos verificadores estão errados.
 * @example
 * ```ts
 * import * as Cpf from '#src/shared/kernel/cpf.ts';
 *
 * Cpf.parse('111.444.777-35'); // { ok: true, value: '11144477735' }
 * Cpf.parse('11144477736'); // { ok: false, error: 'invalid-cpf' }
 * ```
 */
export const parse = (raw: string): Result<Cpf, CpfError> => {
  const digits = stripNonAsciiDigits(raw);
  return isValidCpfDigits(digits) ? ok(digits as Cpf) : err('invalid-cpf');
};
