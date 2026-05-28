// Mapper RefreshToken: row MySQL <-> agregado RefreshToken (modulo auth).
//
// Blueprint DBA (001-query-blueprint.md):
//   - refreshTokenFromRow(row): Result<RefreshToken, RefreshTokenMapperError>
//     Escalar (sem JOIN/agregacao). RefreshTokenId.rehydrate/UserId.rehydrate na borda.
//     replacedBy rehydrate so se nao-null. revokedAt Date|null (mode:'date' retorna Date direto).
//     Tagged errors (Padrao D — espelha user.mapper.ts).
//   - refreshTokenToInsert(token): NewRefreshTokenRow
//     Converte o agregado para row de INSERT/UPDATE. Sem Clock (token carrega seus instantes).
//
// ADR-0020: sem JSON, dialeto MySQL unico. ADR-0014: so auth_*.
// Zero throw/class no dominio.

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import * as RefreshTokenId from '../../../domain/session/refresh-token-id.ts';
import * as UserId from '../../../domain/identity/user-id.ts';
import type { RefreshToken } from '../../../domain/session/refresh-token.ts';
import type { RefreshTokenRow, NewRefreshTokenRow } from '../schemas/mysql.ts';

// ─── Tagged error variants (Padrao D — free functions, espelha user.mapper.ts) ─

export type RefreshTokenMapperInvalidId = Readonly<{
  tag: 'RefreshTokenMapperInvalidId';
  attemptedValue: string;
}>;

export type RefreshTokenMapperInvalidUserId = Readonly<{
  tag: 'RefreshTokenMapperInvalidUserId';
  attemptedValue: string;
}>;

export type RefreshTokenMapperInvalidReplacedBy = Readonly<{
  tag: 'RefreshTokenMapperInvalidReplacedBy';
  attemptedValue: string;
}>;

// ─── Union ────────────────────────────────────────────────────────────────────

export type RefreshTokenMapperError =
  | RefreshTokenMapperInvalidId
  | RefreshTokenMapperInvalidUserId
  | RefreshTokenMapperInvalidReplacedBy;

// ─── Case constructors ────────────────────────────────────────────────────────

const invalidId = (attemptedValue: string): RefreshTokenMapperInvalidId => ({
  tag: 'RefreshTokenMapperInvalidId',
  attemptedValue,
});

const invalidUserId = (attemptedValue: string): RefreshTokenMapperInvalidUserId => ({
  tag: 'RefreshTokenMapperInvalidUserId',
  attemptedValue,
});

const invalidReplacedBy = (attemptedValue: string): RefreshTokenMapperInvalidReplacedBy => ({
  tag: 'RefreshTokenMapperInvalidReplacedBy',
  attemptedValue,
});

// ─── refreshTokenFromRow ──────────────────────────────────────────────────────
//
// Blueprint §mapper: escalar, sem JOIN.
// mode:'date' em issuedAt/expiresAt/revokedAt ja retorna Date (ou null para revokedAt).
// replacedBy: varchar(36) sem FK (P0 Decisao 4) — rehydrate so se nao-null.
// tokenHash e opaco, sem validacao de conteudo (confiamos no CHECK auth_rt_hash_nonempty_chk).

export const refreshTokenFromRow = (
  row: Readonly<RefreshTokenRow>,
): Result<RefreshToken, RefreshTokenMapperError> => {
  // Reidratar id (branded RefreshTokenId)
  const idR = RefreshTokenId.rehydrate(row.id);
  if (!idR.ok) return err(invalidId(row.id));

  // Reidratar userId (branded UserId)
  const userIdR = UserId.rehydrate(row.userId);
  if (!userIdR.ok) return err(invalidUserId(row.userId));

  // Reidratar replacedBy: so se nao-null (campo sem FK, sem garantia DB alem de varchar(36))
  let replacedBy: RefreshTokenId.RefreshTokenId | null = null;
  if (row.replacedBy !== null) {
    const replacedByR = RefreshTokenId.rehydrate(row.replacedBy);
    if (!replacedByR.ok) return err(invalidReplacedBy(row.replacedBy));
    replacedBy = replacedByR.value;
  }

  const token: RefreshToken = {
    id: idR.value,
    userId: userIdR.value,
    // tokenHash opaco — armazenado e retornado como-esta (ASCII hex)
    tokenHash: row.tokenHash,
    // mode:'date' -> Drizzle ja deserializa para Date
    issuedAt: row.issuedAt,
    expiresAt: row.expiresAt,
    // revokedAt: nullable (null = token ativo; Date = token revogado)
    revokedAt: row.revokedAt,
    replacedBy,
  };

  return ok(token);
};

// ─── refreshTokenToInsert ─────────────────────────────────────────────────────
//
// Sem Clock — o RefreshToken ja carrega issued_at/expires_at/revoked_at do dominio.
// Mapeamento direto do agregado para NewRefreshTokenRow.
// id/userId: branded -> string via 'as unknown as string' (padrao do projeto).

export const refreshTokenToInsert = (token: RefreshToken): NewRefreshTokenRow => ({
  id: token.id as unknown as string,
  userId: token.userId as unknown as string,
  tokenHash: token.tokenHash,
  issuedAt: token.issuedAt,
  expiresAt: token.expiresAt,
  revokedAt: token.revokedAt,
  replacedBy: token.replacedBy !== null ? (token.replacedBy as unknown as string) : null,
});
