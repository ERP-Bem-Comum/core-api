/**
 * Adapter do `UserNameReader` (#1029) sobre o `AuthUserReadPort` — cross-módulo só pela
 * public-api do auth (ADR-0006). Erro, usuário inexistente ou nome nulo → `null` (o port degrada).
 * `null` no lugar do port (driver memory sem auth injetado) → sempre `null`.
 */

import type { AuthUserReadPort } from '#src/modules/auth/public-api/read.ts';
import type { UserNameReader } from '../../application/ports/user-name-reader.ts';

export const makeAuthUserNameReader = (port: AuthUserReadPort | null): UserNameReader => ({
  getUserName: async (userId) => {
    if (port === null) return null;
    const result = await port.getUserName(userId);
    if (!result.ok || result.value === null) return null;
    return result.value.name;
  },
});
