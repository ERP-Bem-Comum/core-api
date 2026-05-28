/**
 * Facade de imutabilidade canônica do projeto.
 *
 * Origem: handbook/interviews/0001-functional-ddd-domain-refresh.md §Bloco B
 *   - DO B§10: identidade fixa via facade `immutable()` / `deepImmutable()` em `shared/immutable.ts`.
 *   - DON'T B§5: `Object.freeze` direto no código de domínio é proibido — usa as facades.
 *   - CONSIDER B§2: `deepImmutable` para VOs compostos com sub-VOs aninhados.
 *
 * As facades escondem o mecanismo (`Object.freeze` hoje, Records & Tuples no futuro)
 * e documentam intenção no vocabulário do projeto, não no de implementação.
 *
 * Ticket: CTR-SHARED-IMMUTABLE (Frente A — Refactor radical do domínio, folha sem deps).
 */

/**
 * Constante "de verdade" — imutável em compile-time E runtime.
 *
 * Shallow: congela apenas o objeto raiz; sub-objetos permanecem mutáveis.
 * Para congelar recursivamente, use `deepImmutable`.
 *
 * Em ESM (strict mode implícito), tentativa de mutação em propriedade
 * congelada joga `TypeError` em runtime.
 *
 * @param value Objeto a ser congelado.
 * @returns O mesmo objeto, tipado como `Readonly<T>`, congelado in-place.
 */
export const immutable = <T extends object>(value: T): Readonly<T> => Object.freeze(value);

/**
 * Variante recursiva para VOs compostos com sub-objetos aninhados.
 *
 * `Object.freeze` é shallow por definição; esta função desce em cada propriedade
 * que seja objeto e aplica `freeze` em profundidade. Primitivos (`number`,
 * `string`, `boolean`, `null`, `undefined`, `bigint`, `symbol`) passam direto
 * sem alteração.
 *
 * Nota de tipo: o retorno preserva `T` (não há `DeepReadonly<T>` no projeto).
 * O ganho "deep" é puramente comportamental em runtime, complementando a
 * marcação `Readonly` que o autor do tipo já aplicou na definição do VO.
 *
 * @param value Valor a ser congelado recursivamente (ou primitivo, devolvido como é).
 * @returns O mesmo valor, congelado em todos os níveis se for objeto.
 */
export const deepImmutable = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value;
  for (const key of Object.keys(value)) {
    deepImmutable((value as Record<string, unknown>)[key]);
  }
  return Object.freeze(value);
};
