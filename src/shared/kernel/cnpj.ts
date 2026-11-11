import { type Result, ok, err } from '../primitives/result.ts';
import type { Brand } from '../primitives/brand.ts';

/**
 * CNPJ validado: 14 caracteres em maiúsculas, sem máscara, com as 12 primeiras posições em
 * `[0-9A-Z]` e os 2 últimos dígitos verificadores numéricos.
 *
 * Uma `string` crua não é atribuível a `Cnpj`; o `Cnpj` devolvido por {@link parse} é
 * atribuível a `string`.
 */
export type Cnpj = Brand<string, 'Cnpj'>;

/**
 * Erro devolvido por {@link parse}: o único valor admitido é `'invalid-cnpj'`.
 */
export type CnpjError = 'invalid-cnpj';

/**
 * Pesos do módulo 11 aplicados às 12 primeiras posições para o primeiro dígito verificador.
 */
const DV1_WEIGHTS: readonly number[] = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Pesos do módulo 11 aplicados às 13 primeiras posições para o segundo dígito verificador.
 */
const DV2_WEIGHTS: readonly number[] = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Comprimento do CNPJ depois de removida a máscara.
 */
const CNPJ_LENGTH = 14;

/**
 * Código de caractere de `'0'`, subtraído de cada caractere para obter o seu valor no módulo 11.
 */
const ASCII_ZERO = 48;

/**
 * Doze caracteres em `[0-9A-Z]` seguidos de dois dígitos.
 */
const ALPHANUMERIC_BASE_THEN_NUMERIC_DVS = /^[0-9A-Z]{12}[0-9]{2}$/;

/**
 * Um único caractere repetido em toda a string.
 */
const SINGLE_REPEATED_CHAR = /^(.)\1*$/;

/**
 * Remove ponto, barra, hífen-menos ASCII (`-`, U+002D) e todo caractere casado pela classe `\s`
 * do JavaScript (entre eles espaço, tab, quebra de linha e U+00A0), em qualquer posição, e
 * converte o resultado para maiúsculas.
 *
 * @param raw - O CNPJ como recebido, com ou sem máscara.
 * @returns O texto sem separadores, em maiúsculas.
 */
const normalize = (raw: string): string => raw.replace(/[.\-/\s]/g, '').toUpperCase();

/**
 * Valor de um caractere no módulo 11: `ASCII(c) − 48`, de modo que `'0'..'9'` valem `0..9` e
 * `'A'..'Z'` valem `17..42`.
 *
 * @param chars - O texto que contém o caractere.
 * @param index - A posição do caractere em `chars`.
 * @returns O valor numérico do caractere.
 */
const charValueAt = (chars: string, index: number): number => chars.charCodeAt(index) - ASCII_ZERO;

/**
 * Converte uma soma ponderada em dígito verificador: `0` quando o resto da divisão por 11 é
 * menor que 2; caso contrário, `11 − resto`.
 *
 * @param sum - A soma ponderada dos valores dos caracteres.
 * @returns O dígito verificador, de 0 a 9.
 */
const moduleEleven = (sum: number): number => {
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
};

/**
 * Calcula um dígito verificador pelo módulo 11 sobre as primeiras posições de `chars`, uma por
 * peso.
 *
 * @param chars - O CNPJ normalizado.
 * @param weights - Os pesos, um por posição considerada.
 * @returns O dígito verificador esperado.
 */
const checkDigit = (chars: string, weights: readonly number[]): number =>
  moduleEleven(weights.reduce((acc, weight, i) => acc + charValueAt(chars, i) * weight, 0));

/**
 * Indica se os dois DVs do CNPJ normalizado conferem com o módulo 11.
 *
 * @param value - O CNPJ normalizado, já no formato de 12 alfanuméricos e 2 DVs numéricos.
 * @returns `true` se o primeiro e o segundo dígitos verificadores conferem.
 */
const hasMatchingCheckDigits = (value: string): boolean =>
  checkDigit(value, DV1_WEIGHTS) === Number(value[12]) &&
  checkDigit(value, DV2_WEIGHTS) === Number(value[13]);

/**
 * Indica se `raw` é um CNPJ válido, numérico ou alfanumérico.
 *
 * Antes de validar, remove ponto, barra, hífen-menos ASCII (`-`) e todo caractere casado pela
 * classe `\s` do JavaScript, em qualquer posição, e converte para maiúsculas; o comprimento é medido depois dessa normalização. Os dígitos
 * verificadores são os do módulo 11 com o valor de cada caractere igual a `ASCII(c) − 48`
 * (`'A'` vale 17, `'Z'` vale 42), o que coincide com o módulo 11 numérico para um CNPJ só de
 * dígitos. Mesma entrada, mesmo resultado.
 *
 * @param raw - O CNPJ com máscara ou sem ela, em maiúsculas ou minúsculas.
 * @returns `true` se o valor normalizado tem 14 caracteres, as 12 primeiras posições em
 * `[0-9A-Z]`, os 2 dígitos verificadores numéricos e corretos, e não é um único dígito repetido
 * 14 vezes; `false` caso contrário, inclusive para vazio e para texto só de separadores.
 *
 * @example
 * ```ts
 * isValidCnpj('12.abc.345/01de-35'); // true
 * ```
 */
export const isValidCnpj = (raw: string): boolean => {
  const value = normalize(raw);
  return (
    value.length === CNPJ_LENGTH &&
    ALPHANUMERIC_BASE_THEN_NUMERIC_DVS.test(value) &&
    !SINGLE_REPEATED_CHAR.test(value) &&
    hasMatchingCheckDigits(value)
  );
};

/**
 * Valida e normaliza um CNPJ, com máscara ou sem ela e em qualquer caixa.
 *
 * Devolve sucesso exatamente quando {@link isValidCnpj} devolve `true` para a mesma entrada.
 *
 * @param raw - O CNPJ como recebido.
 * @returns `ok` com o {@link Cnpj} de 14 caracteres em maiúsculas, sem ponto, barra, hífen nem
 * espaço em branco; ou `err('invalid-cnpj')` quando a entrada não é um CNPJ válido.
 *
 * @example
 * ```ts
 * parse('11.222.333/0001-81'); // { ok: true, value: '11222333000181' }
 * ```
 */
export const parse = (raw: string): Result<Cnpj, CnpjError> =>
  isValidCnpj(raw) ? ok(normalize(raw) as Cnpj) : err('invalid-cnpj');
