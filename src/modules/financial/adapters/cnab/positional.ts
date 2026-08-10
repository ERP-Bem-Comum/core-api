// Primitivas de campo posicional do CNAB 240 (layout Multipag do Bradesco).
//
// O arquivo não tem separador: o que define um campo é a POSIÇÃO. As duas regras de preenchimento
// vêm do próprio layout — numérico alinha à direita com zeros à esquerda; alfanumérico alinha à
// esquerda com brancos à direita.
//
// A assimetria de tratamento no estouro é deliberada:
//   - numérico  → ERRO. Truncar valor, documento ou conta gera arquivo sintaticamente válido e
//                 semanticamente errado — o banco aceita e paga a quem não devia.
//   - alfanum.  → TRUNCA. Nome de empresa/favorecido maior que o campo é cortado pelo layout por
//                 desenho; recusar o arquivo inteiro por causa de um nome longo seria pior.
import { type Result, ok, err } from '../../../../shared/primitives/result.ts';

export type PositionalFieldError = 'numeric-field-overflow' | 'numeric-field-invalid';

const DIGITS_ONLY = /^\d+$/;

export const num = (value: number | string, size: number): Result<string, PositionalFieldError> => {
  const raw =
    typeof value === 'number'
      ? Number.isInteger(value) && value >= 0
        ? String(value)
        : ''
      : value.trim();

  if (raw === '' || !DIGITS_ONLY.test(raw)) return err('numeric-field-invalid');
  if (raw.length > size) return err('numeric-field-overflow');

  return ok(raw.padStart(size, '0'));
};

// Acento não sobrevive ao trânsito até o mainframe do banco; a normalização acontece aqui, na
// fronteira, e não no domínio — que continua guardando o nome como o humano escreveu.
const stripDiacritics = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '');

export const alpha = (value: string, size: number): string =>
  stripDiacritics(value).toUpperCase().slice(0, size).padEnd(size, ' ');

// Money no domínio já é bigint/number de centavos (ADR-0020); aqui só vira dígito sem separador.
export const cents = (valueCents: number, size: number): Result<string, PositionalFieldError> =>
  num(valueCents, size);

const two = (value: number): string => String(value).padStart(2, '0');

// Datas do arquivo são sempre em UTC: a geração é de máquina, não de fuso do operador.
export const dateDDMMYYYY = (at: Date): Result<string, PositionalFieldError> =>
  num(`${two(at.getUTCDate())}${two(at.getUTCMonth() + 1)}${String(at.getUTCFullYear())}`, 8);

export const timeHHMMSS = (at: Date): Result<string, PositionalFieldError> =>
  num(`${two(at.getUTCHours())}${two(at.getUTCMinutes())}${two(at.getUTCSeconds())}`, 6);
