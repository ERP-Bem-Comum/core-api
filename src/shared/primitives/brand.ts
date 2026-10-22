/**
 * Chave da marca nominal de {@link Brand}. Uma propriedade de chave textual `"__brand"` não a
 * reproduz: `string & { readonly __brand: 'ContractId' }` não satisfaz
 * `Brand<string, 'ContractId'>`.
 */
declare const __brand: unique symbol;

/**
 * Tipo `T` marcado com a identidade nominal `K`, sem efeito em runtime: o valor marcado é o
 * próprio valor de origem, e um objeto marcado não ganha chave nem símbolo adicional.
 *
 * `Brand<T, K>` é atribuível a `T` sem cast e preserva os membros de `T`; `T` puro não é
 * atribuível a `Brand<T, K>`. Dois Brand com o mesmo `T` e literais `K` disjuntos não são
 * atribuíveis entre si em nenhuma direção, assim como dois Brand com o mesmo `K` e tipos `T` sem
 * relação de subtipo (`number` e `string`). Com o mesmo `K`, `Brand<T1, K>` é atribuível a
 * `Brand<T2, K>` quando `T1` é atribuível a `T2`. Dois Brand declarados separadamente com o mesmo
 * `T` e o mesmo `K` são o mesmo tipo e se atribuem livremente.
 *
 * `Brand<T, K>` é atribuível a `Brand<T, K | Outro>`, mas não o inverso, e `Brand<T, string>`
 * aceita qualquer Brand do mesmo `T`. Marcar um `Brand<T, K>` com um segundo `K` disjunto do
 * primeiro reduz o tipo a `never`; marcá-lo de novo com o mesmo `K`, ou com uma união que contém
 * `K`, resolve para o próprio `Brand<T, K>`.
 *
 * @typeParam T - Tipo de origem que recebe a marca.
 * @typeParam K - Identidade nominal: qualquer subtipo de `string` (literal, união de literais,
 * template literal) ou o próprio `string`.
 * @example
 * ```ts
 * type ContractIdLike = Brand<string, 'ContractId'>;
 * const id = 'CTR-001' as ContractIdLike;
 * const plain: string = id;
 * ```
 */
export type Brand<T, K extends string> = T & { readonly [__brand]: K };

/**
 * Identidade `K` de um tipo marcado com {@link Brand}. Resolve para `never` quando o tipo é
 * `string`, `number`, objeto plano, `never` ou `unknown`, ou quando a marca é uma propriedade de
 * chave textual `"__brand"`.
 *
 * Distribui sobre uniões: uma união de Brand resolve para a união das identidades, um `K` união
 * resolve para a mesma união e os membros não marcados da união são descartados.
 *
 * @typeParam B - Tipo do qual a identidade da marca é extraída.
 * @example
 * ```ts
 * const kind: BrandOf<Money> = 'Money';
 * ```
 */
export type BrandOf<B> = B extends { readonly [__brand]: infer K } ? K : never;
