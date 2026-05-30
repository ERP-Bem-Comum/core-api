/**
 * Port PasswordResetTokenMinter (modulo auth, BE-REC-003) - gera o token de reset opaco.
 *
 * `token` (claro) vai no link do e-mail; `tokenHash` persiste. Alta-entropia aleatoria -> sha256
 * basta (nao argon2), igual ao refresh (DD-LOGIN-02). `hash` reaplica a funcao ao token recebido no
 * confirm (lookup `findByTokenHash`). Invariante: hash(mint().token) === mint().tokenHash. ASCII puro.
 */

export type PasswordResetSecret = Readonly<{ token: string; tokenHash: string }>;

export type PasswordResetTokenMinter = Readonly<{
  mint: () => PasswordResetSecret;
  hash: (rawToken: string) => string;
}>;
