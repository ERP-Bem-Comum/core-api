/**
 * Mensagem pública de erro: o texto PT-BR que vai no `message` do envelope 4xx/5xx no lugar do
 * código interno. Cada módulo mantém a SUA tabela código → frase; o mecanismo de consulta, as
 * frases genéricas por classe de status e as frases dos erros do shared kernel vivem aqui.
 */

import type { Result } from '../primitives/result.ts';
import type { MoneyError } from '../kernel/money.ts';
import type { UserRefError } from '../kernel/user-ref.ts';

/** Classe pública de um erro, derivada do status HTTP por {@link publicErrorClassOf}. */
export type PublicErrorClass =
  | 'not-found'
  | 'conflict'
  | 'bad-request'
  | 'unprocessable'
  | 'internal';

/** Frase PT-BR genérica de cada {@link PublicErrorClass}. */
export const GENERIC_PUBLIC_MESSAGES: Readonly<Record<PublicErrorClass, string>> = {
  'not-found': 'Recurso não encontrado.',
  conflict: 'A operação conflita com o estado atual do recurso.',
  'bad-request': 'Requisição inválida.',
  unprocessable: 'Não foi possível processar a requisição.',
  internal: 'Ocorreu um erro interno.',
};

/**
 * Classe pública de um status HTTP.
 *
 * @param status - Status HTTP da resposta de erro.
 * @returns `'bad-request'` para 400 e 413; `'not-found'` para 404; `'conflict'` para 409;
 *   `'internal'` para 500 ou mais; `'unprocessable'` para os demais, como 422.
 */
export const publicErrorClassOf = (status: number): PublicErrorClass => {
  if (status >= 500) return 'internal';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 413) return 'bad-request';
  return 'unprocessable';
};

/** Frases PT-BR dos erros do `Money` e do `UserRef` do shared kernel. */
export const KERNEL_PUBLIC_MESSAGES: Readonly<Record<MoneyError | UserRefError, string>> = {
  'money-negative-value': 'Valores monetários não podem ser negativos.',
  'money-non-integer-value': 'Valores monetários devem ser inteiros (em centavos).',
  'money-exceeds-safe-integer': 'Valor monetário excede o limite permitido.',
  'money-negative-result': 'O resultado da operação geraria um valor negativo.',
  'user-ref-invalid': 'Identificador de usuário inválido.',
};

/** Mensagem pública de um código de erro na resposta com o status dado. */
export type PublicMessage = (code: string, status: number) => string;

const isOwnKey = <C extends string>(table: Readonly<Record<C, string>>, key: string): key is C =>
  Object.hasOwn(table, key);

/**
 * Monta a consulta código → mensagem pública sobre a tabela de um módulo.
 *
 * @param messages - Tabela do módulo, código interno → frase PT-BR.
 * @returns Função que, com status 500 ou mais, devolve a frase genérica `internal` mesmo para
 *   código da tabela; abaixo de 500, devolve a frase da tabela quando o código é chave própria
 *   dela e, quando não é, a frase genérica da classe do status. Nome herdado do protótipo de
 *   `Object`, como `constructor`, não conta como chave da tabela.
 */
export const publicMessageResolver =
  <C extends string>(messages: Readonly<Record<C, string>>): PublicMessage =>
  (code, status) => {
    if (status >= 500) return GENERIC_PUBLIC_MESSAGES.internal;
    if (isOwnKey(messages, code)) return messages[code];
    return GENERIC_PUBLIC_MESSAGES[publicErrorClassOf(status)];
  };

/**
 * Mantém cada literal de `T` e troca por `'non-literal-error-code'` o membro que não é literal
 * (`string` ou padrão de template literal), que de outro modo colapsaria a união e deixaria um
 * `Record<código, string>` aceitar qualquer objeto.
 */
type LiteralCode<T extends string> = T extends string
  ? Record<never, never> extends Record<T, unknown>
    ? 'non-literal-error-code'
    : T
  : never;

/**
 * Código de um erro de domínio: a própria string literal, ou o `tag` da variante registro
 * `{ tag, ... }`. Membro ou `tag` não literal vira `'non-literal-error-code'`.
 */
export type ErrorCodeOf<E> = E extends string
  ? LiteralCode<E>
  : E extends Readonly<{ tag: infer T extends string }>
    ? LiteralCode<T>
    : never;

/**
 * União dos erros `E` de cada membro de `D` que é função devolvendo `Promise<Result<_, E>>`; os
 * demais membros não contribuem.
 */
export type UseCaseErrorOf<D> = {
  [K in keyof D]: D[K] extends (...args: never[]) => Promise<Result<unknown, infer E>> ? E : never;
}[keyof D];
