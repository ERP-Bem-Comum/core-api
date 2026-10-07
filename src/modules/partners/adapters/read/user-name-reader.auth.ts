/**
 * Adapter do `UserNameReader` (#1029) sobre o `AuthUserReadPort` — cross-módulo só pela
 * public-api do auth (ADR-0006). Erro, timeout, usuário inexistente ou nome nulo/vazio → `null`
 * (o port degrada). `null` no lugar do port (não injetado pelo composition root) → sempre `null`.
 *
 * O timeout existe porque a leitura roda DEPOIS do save, no caminho do PUT: um auth travado não
 * pode segurar a resposta de uma edição que já foi gravada.
 */

import type { AuthUserReadPort } from '#src/modules/auth/public-api/read.ts';
import type { UserNameReader } from '../../application/ports/user-name-reader.ts';

const DEFAULT_TIMEOUT_MS = 2_000;

export const makeAuthUserNameReader = (
  port: AuthUserReadPort | null,
  opts: Readonly<{ timeoutMs?: number }> = {},
): UserNameReader => ({
  getUserName: async (userId) => {
    if (port === null) return null;
    let timer: ReturnType<typeof setTimeout> | undefined = undefined;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => {
        resolve(null);
      }, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    });
    const read = port.getUserName(userId).then((result) => {
      if (!result.ok || result.value === null) return null;
      const name = result.value.name?.trim() ?? '';
      return name.length > 0 ? name : null;
    });
    try {
      return await Promise.race([read, timeout]);
    } finally {
      clearTimeout(timer);
    }
  },
});
