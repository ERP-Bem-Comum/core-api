/**
 * Resolve para `Tuple` quando todo membro da união `U` aparece em `Tuple`, e para `never`
 * quando falta algum, o que torna inválido o argumento de {@link exhaustiveStringUnion}.
 *
 * @typeParam Tuple - tupla de literais recebida por {@link exhaustiveStringUnion}.
 * @typeParam U - união de literais string que a tupla precisa cobrir.
 */
type IsExhaustive<Tuple extends readonly string[], U extends string> = [U] extends [Tuple[number]]
  ? Tuple
  : never;

/**
 * Fábrica curried que verifica em compilação se uma tupla de literais cobre exatamente os
 * membros da união `U` e a devolve sem alteração em runtime.
 *
 * Recusa em compilação, com ou sem `as const` no argumento, a tupla de literais à qual
 * falta um membro da união, a tupla de literais com literal fora da união e a tupla vazia.
 * Aceita os membros em qualquer ordem e aceita membro repetido desde que todos os membros
 * estejam presentes. Aceita a tupla anotada com a própria união, como `[U]` ou
 * `readonly [U, ...U[]]`, ainda que em runtime ela não contenha todos os membros.
 *
 * @typeParam U - união de literais string a cobrir; com `U = string`, toda tupla de
 *   literais é recusada.
 * @returns Função que recebe a tupla e devolve a mesma referência, com conteúdo e ordem
 *   intactos, tipada como a tupla de literais na ordem passada: `readonly` com `as const`,
 *   mutável sem ele.
 *
 * @example
 * ```ts
 * type Color = 'red' | 'green' | 'blue';
 * const COLORS = exhaustiveStringUnion<Color>()(['red', 'green', 'blue'] as const);
 * const ColorSchema = z.enum(COLORS);
 * ```
 */
export const exhaustiveStringUnion =
  <U extends string>() =>
  <Tuple extends readonly [U, ...U[]]>(tuple: IsExhaustive<Tuple, U>): Tuple =>
    tuple as Tuple;
