/**
 * Marcação nominal de tipos (Brand types / nominal typing).
 *
 * Origem: handbook/interviews/0001-functional-ddd-domain-refresh.md §Bloco B
 *   - DO B§11: shared/brand.ts modernizado: unique symbol global + literal K.
 *   - DON'T B§12: declare const brand espalhado em cada arquivo de VO — centraliza aqui.
 *   - CONSIDER B§3: BrandOf<T> útil em testes/diagnóstico.
 *
 * USO RESTRITO: apenas VOs folha (Money, Period, ContractId, etc).
 * NUNCA em agregados — vide Bloco A DON'T §1 do master doc.
 */
// Nome canônico `__brand` é prescrito literalmente pela entrevista 0001 §6 (followup
// L261-294) como pattern idiomático TS para brand symbols. O `naming-convention` da
// flat config aceita 1 leading underscore (`leadingUnderscore: 'allow'`), não 2 —
// disable cirúrgico aqui é mais conservador que ampliar a regra globalmente.
// eslint-disable-next-line @typescript-eslint/naming-convention
declare const __brand: unique symbol;

/**
 * Brand<T, K> — marca um tipo T com uma identidade nominal K.
 * O símbolo `__brand` é único globalmente (declare const com unique symbol),
 * impossibilitando colisão estrutural acidental entre dois Brand de K iguais.
 */
export type Brand<T, K extends string> = T & { readonly [__brand]: K };

/**
 * BrandOf<B> — recupera o literal K de um tipo brandado.
 * Útil em testes e mensagens de diagnóstico.
 *
 * @example
 *   type X = BrandOf<Money>;        // 'Money'
 *   type Y = BrandOf<ContractId>;   // 'ContractId'
 *   type Z = BrandOf<string>;       // never (tipo não-brandado)
 */
export type BrandOf<B> = B extends { readonly [__brand]: infer K } ? K : never;
