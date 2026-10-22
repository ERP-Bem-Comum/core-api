import { type Result, ok, err } from '../primitives/result.ts';
import { isUuidV4 } from '../utils/id.ts';
import type { Brand } from '../primitives/brand.ts';

/**
 * String marcada com a brand `'UserRef'`, tipo do valor que {@link rehydrate}
 * devolve no `ok`. É atribuível a `string`, mas uma string crua não é
 * atribuível a `UserRef`.
 */
export type UserRef = Brand<string, 'UserRef'>;

/**
 * Erro de {@link rehydrate}: exatamente o literal `'user-ref-invalid'`.
 */
export type UserRefError = 'user-ref-invalid';

/**
 * Valida um texto como UUID v4 e o devolve como {@link UserRef}, sem alterar
 * o texto: não normaliza a caixa nem apara espaços.
 *
 * @param raw - Texto candidato a UUID v4 no formato canônico com hífens
 *   (`xxxxxxxx-xxxx-4xxx-Yxxx-xxxxxxxxxxxx`, `Y` em `8`, `9`, `a` ou `b`), em
 *   caixa baixa, alta ou mista.
 * @returns `ok` com o mesmo texto de `raw` como `UserRef` quando ele é UUID v4;
 *   `err('user-ref-invalid')` para string vazia, texto que não é UUID, UUID de
 *   outra versão (v1, v7), UUID nulo, variante fora de `8`/`9`/`a`/`b`, UUID sem
 *   hífens, entre chaves, com espaço nas bordas, seguido de quebra de linha ou
 *   com caractere não hexadecimal.
 * @example
 * ```ts
 * import * as UserRef from '#src/shared/kernel/user-ref.ts';
 *
 * UserRef.rehydrate('3f2b8c1e-9a4d-4e7f-8b2c-1d5e6f7a8b9c');
 * // { ok: true, value: '3f2b8c1e-9a4d-4e7f-8b2c-1d5e6f7a8b9c' }
 * UserRef.rehydrate('not-a-uuid');
 * // { ok: false, error: 'user-ref-invalid' }
 * ```
 */
export const rehydrate = (raw: string): Result<UserRef, UserRefError> =>
  isUuidV4(raw) ? ok(raw as UserRef) : err('user-ref-invalid');
