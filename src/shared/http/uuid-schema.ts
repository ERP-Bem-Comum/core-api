/**
 * Schema Zod compartilhado para identificadores da borda HTTP (ADR-0027).
 *
 * Exige UUID **v4 estrito**, a mesma régua de `isUuidV4` (`shared/utils/id.ts`) que todo
 * `rehydrate` do domínio aplica. `z.uuid()` do Zod v4 aceita qualquer UUID bem formado
 * (nil `000…0`, max `fff…f`, v1/v3/v5), e esse id passava pela borda, era recusado pelo
 * smart constructor com `*-id-invalid` e, sem mapeamento no handler, virava 500.
 *
 * Todo id do sistema nasce de `newUuid()` (v4), então um UUID não-v4 nunca corresponde a
 * registro real: recusá-lo aqui devolve 400 `validation` pelo handler central, sem perder
 * lookup legítimo. A fonte da régua é única, e os módulos não escrevem `z.uuid()` solto.
 */

import * as z from 'zod/v4';

const UUID_V4_MESSAGE = 'Identificador inválido: esperado UUID v4';

/**
 * Schema de UUID v4. Encadeie `.meta({ description })`, `.optional()` e `.nullable()` no
 * ponto de uso, como em qualquer schema Zod.
 */
export const uuidV4 = (): z.ZodUUID => z.uuidv4({ error: UUID_V4_MESSAGE });
