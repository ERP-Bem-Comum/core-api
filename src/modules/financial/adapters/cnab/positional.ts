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

// Campo que o domínio pode guardar COM máscara — documento, agência, conta, CEP. Tirar a pontuação
// é tradução de formato, papel legítimo da ACL: "12.345.678/0001-99" e "12345678000199" são o mesmo
// CNPJ. A borda HTTP já normaliza na entrada (`adapters/http/schemas.ts`), mas dado vindo de ETL
// legado não passa por ela — e falhar a remessa inteira por causa de um ponto seria defeito bobo.
// Continua sendo erro o que sobrar vazio ou não couber: normalizar não é engolir.
export const digits = (value: string, size: number): Result<string, PositionalFieldError> =>
  num(value.replace(/\D/g, ''), size);

// ── Combinadores de registro ────────────────────────────────────────────────────────────────────
// Vivem aqui, e não no módulo de registros, porque envelope (header/trailer) e detalhe (segmentos)
// montam linha da mesma forma: uma lista de campos posicionais concatenada, com o primeiro erro
// vencendo. Duplicá-los em cada módulo seria a terceira cópia da mesma regra.

export const blanks = (size: number): Result<string, PositionalFieldError> => ok(' '.repeat(size));

export const text = (value: string, size: number): Result<string, PositionalFieldError> =>
  ok(alpha(value, size));

// Propaga o primeiro erro. Sem isto, cada registro viraria uma escada de trinta `if (isErr(...))` —
// e a escada é onde se esquece de checar um.
export const joinFields = (
  fields: readonly Result<string, PositionalFieldError>[],
): Result<string, PositionalFieldError> => {
  const parts: string[] = [];
  for (const field of fields) {
    if (!field.ok) return field;
    parts.push(field.value);
  }
  return ok(parts.join(''));
};
