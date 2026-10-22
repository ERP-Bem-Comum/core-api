/**
 * Resultado de uma operação que pode falhar: `{ ok: true, value }` no sucesso ou
 * `{ ok: false, error }` no erro, discriminados pela chave `ok`.
 *
 * Nem {@link ok} nem {@link err} congelam o objeto: o `Readonly` não impede mutação em runtime.
 *
 * @typeParam T - Tipo do valor no ramo de sucesso.
 * @typeParam E - Tipo do erro no ramo de erro.
 */
export type Result<T, E> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: E }>;

/**
 * Constrói o ramo de sucesso de um {@link Result}, com exatamente as chaves `ok` e `value`.
 *
 * Guarda o valor por referência, sem copiá-lo, e aceita `undefined` como valor de sucesso.
 *
 * @typeParam T - Tipo do valor.
 * @param value - Valor de sucesso.
 * @returns `{ ok: true, value }`, tipado como `Result<T, never>` e atribuível a qualquer
 * `Result<T, E>` com o mesmo `T`.
 * @example
 * ```ts
 * const r: Result<number, 'not-found'> = ok(7);
 * ```
 */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/**
 * Constrói o ramo de erro de um {@link Result}, com exatamente as chaves `ok` e `error`.
 *
 * Guarda o erro por referência, sem copiá-lo.
 *
 * @typeParam E - Tipo do erro. Um valor já tipado como string literal union mantém a união; um
 * literal escrito direto mantém o literal quando o destino anota o tipo do Result, e é alargado
 * para `string` sem essa anotação.
 * @param error - Erro a carregar.
 * @returns `{ ok: false, error }`, tipado como `Result<never, E>` e atribuível a qualquer
 * `Result<T, E>` com o mesmo `E`.
 * @example
 * ```ts
 * const r: Result<number, 'not-found'> = err('not-found');
 * ```
 */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * Indica se o {@link Result} é sucesso, estreitando o tipo para o ramo com `value` e, no `else`,
 * para o ramo com `error`.
 *
 * @typeParam T - Tipo do valor de sucesso.
 * @typeParam E - Tipo do erro.
 * @param r - Result a inspecionar.
 * @returns `true` para `ok(x)`; `false` para `err(e)`.
 */
export const isOk = <T, E>(r: Result<T, E>): r is Readonly<{ ok: true; value: T }> => r.ok;

/**
 * Indica se o {@link Result} é erro, estreitando o tipo para o ramo com `error`. É sempre o
 * oposto de {@link isOk} para o mesmo Result.
 *
 * @typeParam T - Tipo do valor de sucesso.
 * @typeParam E - Tipo do erro.
 * @param r - Result a inspecionar.
 * @returns `true` para `err(e)`; `false` para `ok(x)`.
 */
export const isErr = <T, E>(r: Result<T, E>): r is Readonly<{ ok: false; error: E }> => !r.ok;

/**
 * Transforma o erro de um {@link Result}, mantendo o sucesso intocado.
 *
 * Em erro, chama `f` uma única vez com o próprio erro de `r`, por referência e sem cópia; uma
 * exceção lançada por `f` não é capturada e se propaga ao chamador.
 *
 * @typeParam T - Tipo do valor de sucesso, preservado.
 * @typeParam E - Tipo do erro de entrada.
 * @typeParam F - Tipo do erro de saída.
 * @param r - Result de entrada; `mapErr` não o altera, mas uma mutação que `f` faça no erro
 * recebido aparece em `r`.
 * @param f - Mapper do erro, invocado somente no ramo de erro.
 * @returns Em sucesso, o próprio `r`, por referência, sem invocar `f`; em erro, um objeto novo
 * `err(f(r.error))`.
 * @example
 * ```ts
 * const r: Result<number, 'money-negative'> = err('money-negative');
 * const boundary = mapErr(r, (cause) => ({ tag: 'invalid-input' as const, cause }));
 * ```
 */
export const mapErr = <T, E, F>(r: Result<T, E>, f: (e: E) => F): Result<T, F> =>
  r.ok ? r : err(f(r.error));

/**
 * Junta uma tupla (ou um array de tamanho variável) de {@link Result} num único Result,
 * percorrendo todas as entradas sem parar no primeiro erro e sem alterá-las.
 *
 * @typeParam T - Tupla dos tipos de valor, posição a posição.
 * @typeParam E - Tipo do erro de cada entrada. Não é inferido de `results`: sem argumentos de
 * tipo explícitos o erro sai tipado `readonly unknown[]`.
 * @param results - Results a combinar; pode ser vazio.
 * @returns Sem erros, `ok` com um array novo (distinto da entrada e não congelado) dos valores,
 * na ordem de entrada e tipado como a tupla `T` — entrada vazia devolve `ok([])`. Com ao menos
 * um erro, `err` com todos os erros na ordem de entrada, descartando os valores de sucesso; o
 * array de erros é tipado `readonly`, mas não é congelado em runtime.
 * @example
 * ```ts
 * const input: Result<number, 'a-err'> = err('a-err');
 * const r = combine<readonly [number], 'a-err'>([input]);
 * ```
 */
export const combine = <T extends readonly unknown[], E>(results: {
  readonly [K in keyof T]: Result<T[K], E>;
}): Result<T, readonly E[]> => {
  const values: unknown[] = [];
  const errors: E[] = [];
  for (const r of results) {
    if (r.ok) values.push(r.value);
    else errors.push(r.error);
  }
  return errors.length > 0 ? err(errors as readonly E[]) : ok(values as unknown as T);
};
