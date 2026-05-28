/**
 * Port RefreshTokenMinter (modulo auth) - gera o refresh token opaco do login.
 *
 * `token` (claro) vai ao cliente; `tokenHash` persiste (DD-LOGIN-02). Refresh e alta-entropia
 * aleatoria -> sha256 basta (nao argon2). `mint` e total (randomBytes nao falha). ASCII puro.
 *
 * `hash` (DD-SESSION-05) reaplica a mesma funcao do `mint` ao refresh em claro recebido, para o
 * lookup `findByTokenHash` no fluxo de refresh/rotacao. Invariante: hash(mint().token) === mint().tokenHash.
 */

export type RefreshTokenSecret = Readonly<{ token: string; tokenHash: string }>;

export type RefreshTokenMinter = Readonly<{
  mint: () => RefreshTokenSecret;
  hash: (rawToken: string) => string;
}>;
