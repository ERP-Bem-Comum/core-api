/**
 * Congela o objeto raiz in-place com `Object.freeze`, sem copiar, e o tipa como `Readonly<T>`.
 *
 * O congelamento é raso: sub-objetos continuam mutáveis. Em módulo ESM, atribuir propriedade
 * existente, adicionar propriedade nova ou remover propriedade do objeto devolvido lança
 * `TypeError`; num array, `push` lança `TypeError`. Num `Map`, só as propriedades do objeto
 * ficam congeladas — `set` continua funcionando. Objeto já congelado é aceito e devolvido como
 * está. TypedArray não vazio, inclusive `Buffer`, não é congelável: a chamada lança `TypeError`;
 * TypedArray vazio é congelado.
 *
 * @typeParam T - Tipo do objeto; qualquer `object` é aceito pelo compilador.
 * @param value - Objeto a congelar; os valores das propriedades são preservados.
 * @returns A mesma referência recebida, congelada, tipada como `Readonly<T>` — o compilador
 *   recusa atribuição a propriedade dela.
 * @throws `TypeError` quando `value` é TypedArray não vazio, inclusive `Buffer`.
 * @see {@link deepImmutable | deepImmutable, para congelar todos os níveis}
 *
 * @example
 * ```ts
 * const raw = { id: 1, nested: { inner: 'a' } };
 * const frozen = immutable(raw);
 * frozen === raw; // true
 * Object.isFrozen(frozen.nested); // false
 * ```
 */
export const immutable = <T extends object>(value: T): Readonly<T> => Object.freeze(value);

/**
 * Congela recursivamente, in-place e sem copiar, um valor e cada objeto alcançável pelas suas
 * chaves próprias, enumeráveis e de tipo string (`Object.keys`), inclusive arrays e os objetos
 * dentro deles.
 *
 * Não desce em chave `symbol`, em propriedade não enumerável nem no protótipo. Função não é
 * congelada, nem na raiz nem aninhada. `Date` fica `Object.isFrozen`, mas `setTime` continua
 * mudando o valor interno. Estrutura cíclica lança `RangeError` por estouro de pilha. Propriedade
 * enumerável com getter é lida uma vez, invocando o getter, e o objeto devolvido nessa leitura é
 * o que fica congelado. TypedArray não vazio, inclusive `Buffer`, em qualquer posição faz a
 * chamada lançar `TypeError`; os objetos visitados antes dele ficam congelados e a raiz não. Em
 * módulo ESM, atribuir, adicionar ou remover propriedade de objeto congelado, na raiz ou
 * aninhado, lança `TypeError`.
 *
 * @typeParam T - Tipo do valor; o retorno tem exatamente o tipo `T`, sem `Readonly`.
 * @param value - Objeto ou array a congelar em profundidade, ou primitivo (`number`, `string`,
 *   `boolean`, `null`, `undefined`, `bigint`, `symbol`), devolvido sem alteração.
 * @returns A mesma referência recebida, tipada como `T` — o compilador aceita atribuição a
 *   propriedade, que só falha em runtime com `TypeError`.
 * @throws `TypeError` quando um TypedArray não vazio, inclusive `Buffer`, é alcançado.
 * @see {@link immutable | immutable, para congelar só a raiz com tipo `Readonly<T>`}
 *
 * @example
 * ```ts
 * const frozen = deepImmutable({ a: { b: { c: 1 } } });
 * Object.isFrozen(frozen.a.b); // true
 * ```
 */
export const deepImmutable = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value;
  for (const key of Object.keys(value)) {
    deepImmutable((value as Record<string, unknown>)[key]);
  }
  return Object.freeze(value);
};
