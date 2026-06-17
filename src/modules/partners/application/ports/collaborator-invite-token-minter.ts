/**
 * Port `CollaboratorInviteTokenMinter` (US5) — gera o token de convite opaco.
 *
 * Espelha `auth/application/ports/password-reset-token-minter.ts`: `token` (claro) vai no link
 * do e-mail; `tokenHash` persiste. Alta entropia aleatória → `sha256` basta (não argon2). `hash`
 * reaplica a função ao token recebido no fluxo público (lookup `findByTokenHash`).
 * Invariante: `hash(mint().token) === mint().tokenHash`. ASCII puro.
 */

export type CollaboratorInviteSecret = Readonly<{ token: string; tokenHash: string }>;

export type CollaboratorInviteTokenMinter = Readonly<{
  mint: () => CollaboratorInviteSecret;
  hash: (rawToken: string) => string;
}>;
