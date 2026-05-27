/**
 * Port RefreshTokenMinter (modulo auth) - gera o refresh token opaco do login.
 *
 * `token` (claro) vai ao cliente; `tokenHash` persiste (DD-LOGIN-02). Refresh e alta-entropia
 * aleatoria -> sha256 basta (nao argon2). `mint` e total (randomBytes nao falha). ASCII puro.
 */

export type RefreshTokenSecret = Readonly<{ token: string; tokenHash: string }>;

export type RefreshTokenMinter = Readonly<{
  mint: () => RefreshTokenSecret;
}>;
