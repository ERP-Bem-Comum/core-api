/**
 * Composição de leitura do NOME de um usuário na borda HTTP (#207 — ADR-0032).
 *
 * O nome de quem executou a conciliação (`reconciledBy`, #175) e de quem fechou o período
 * (`closedBy`, #173) é resolvido server-side via o `AuthUserReadPort` (cross-módulo só por
 * public-api — ADR-0006), gated por `reconciliation:read` na rota — sem exigir `user:read`.
 *
 * Degradação graciosa: port nulo, id nulo, usuário inexistente, nome nulo, IO/erro → `null`.
 * A indisponibilidade do auth NÃO derruba a leitura da conciliação (sem 5xx).
 *
 * @transient — composição síncrona provisória até BFF v2 assumir (ADR-0032).
 */

import type { AuthUserReadPort } from '#src/modules/auth/public-api/read.ts';

export const resolveUserName = async (
  port: AuthUserReadPort | null,
  id: string | null,
): Promise<string | null> => {
  if (port === null || id === null) return null;
  const result = await port.getUserName(id);
  if (!result.ok || result.value === null) return null;
  return result.value.name;
};
