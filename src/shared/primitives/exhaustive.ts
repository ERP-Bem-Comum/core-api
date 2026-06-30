/**
 * Helpers de exhaustividade ao nível de tipo.
 *
 * Motivação: `[...] as const satisfies readonly U[]` só garante "no extra" — cada
 * literal é atribuível à union `U`. NÃO garante "no missing": se um novo membro for
 * adicionado à union, a tupla pode ficar incompleta SEM erro de compilação. Este
 * helper fecha o gap, exigindo cobertura EXATA da union (no extra AND no missing).
 *
 * Referência canônica: handbook/reference/typescript/Type Manipulation/Conditional Types.md
 *   — "When the type on the left of the `extends` is assignable to the one on the right,
 *     then you'll get the type in the first branch [...]; otherwise [...] the latter."
 *   O guard `[U] extends [Tuple[number]]` testa "todo membro de U está presente na tupla".
 *   O wrap em `[...]` evita distributividade (queremos a union inteira, não membro a membro).
 */

/**
 * `IsExhaustive<Tuple, U>` — resolve para `Tuple` apenas se a tupla cobrir TODOS os
 * membros da union `U`; caso contrário resolve para `never` (que invalida o argumento
 * no `exhaustiveStringUnion`, quebrando o typecheck). Garante "no missing".
 */
type IsExhaustive<Tuple extends readonly string[], U extends string> = [U] extends [Tuple[number]]
  ? Tuple
  : never;

/**
 * `exhaustiveStringUnion<U>()(tuple)` — identidade em runtime, mas com dupla garantia
 * de compilação sobre a tupla literal passada:
 *
 *   - **no extra**: a constraint `Tuple extends readonly [U, ...U[]]` rejeita qualquer
 *     literal fora de `U`.
 *   - **no missing**: `IsExhaustive<Tuple, U>` rejeita a tupla se faltar algum membro de `U`.
 *
 * O retorno preserva os literais (`Tuple`), tornando-o utilizável diretamente como
 * input de `z.enum([...tupla])` (que exige `readonly [string, ...string[]]`).
 *
 * @example
 *   type Color = 'red' | 'green' | 'blue';
 *   const COLORS = exhaustiveStringUnion<Color>()(['red', 'green', 'blue'] as const);
 *   //                                              ^ remover 'blue' => erro de compilação
 */
export const exhaustiveStringUnion =
  <U extends string>() =>
  <Tuple extends readonly [U, ...U[]]>(tuple: IsExhaustive<Tuple, U>): Tuple =>
    tuple as Tuple;
