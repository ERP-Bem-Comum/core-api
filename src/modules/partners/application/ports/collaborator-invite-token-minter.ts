/**
 * Port `CollaboratorInviteTokenMinter` (#43) — gera o token de ativação opaco.
 *
 * Espelha `PasswordResetTokenMinter` do auth (DUPLICADO — ADR-0006). `token` (claro) vai no link
 * do e-mail; `tokenHash` persiste. Alta entropia aleatória → sha256 basta (não argon2). `hash`
 * reaplica a função ao token recebido no GET/POST (lookup `findByTokenHash`). Invariante:
 * hash(mint().token) === mint().tokenHash. ASCII puro.
 */

export type CollaboratorInviteSecret = Readonly<{ token: string; tokenHash: string }>;

export type CollaboratorInviteTokenMinter = Readonly<{
  mint: () => CollaboratorInviteSecret;
  hash: (rawToken: string) => string;
}>;
