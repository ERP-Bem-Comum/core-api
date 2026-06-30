// Adapter Drizzle de RefreshTokenRepository (modulo auth).
//
// Blueprint DBA (001-query-blueprint.md) seguido a risca:
//   1. Sem Clock — o RefreshToken carrega todos os seus instantes (issued_at/expires_at/revoked_at).
//   2. Upsert por id: SELECT FOR UPDATE -> UPDATE (revoke/rotate: so revokedAt/replacedBy)
//      ou INSERT. ADR-0020 — sem ON DUPLICATE KEY. Colisao de token_hash UNIQUE -> catch generico.
//   3. findById: PK (type=const) via safe(). Null -> ok(null).
//   4. findByTokenHash: WHERE token_hash=? (auth_rt_token_hash_idx UNIQUE, type=const) via safe().
//   5. findRevocableByUserId: WHERE user_id=? AND revoked_at IS NULL (and()+isNull())
//      via safe(). Retorna readonly RefreshToken[]. Inclui rotated (replacedBy!=null, revokedAt=null).
//   6. buildRefreshToken: mapper refreshTokenFromRow -> Result; falha -> refresh-token-repo-unavailable.
//
// ADR-0020: sem ON DUPLICATE KEY. ADR-0014: so auth_*. Zero throw/class no dominio.
// Boundary: try/catch converte para Result antes de cruzar borda para application.

import { and, eq, isNull } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  RefreshTokenRepository,
  RefreshTokenRepositoryError,
} from '../../../domain/session/refresh-token-repository.ts';
import type { RefreshToken } from '../../../domain/session/refresh-token.ts';
import type { RefreshTokenId } from '../../../domain/session/refresh-token-id.ts';
import type { UserId } from '../../../domain/identity/user-id.ts';
import type { AuthMysqlHandle } from '../drivers/mysql-driver.ts';
import { refreshTokenFromRow, refreshTokenToInsert } from '../mappers/refresh-token.mapper.ts';

// ─── safe wrapper ──────────────────────────────────────────────────────────────
//
// Converte excecoes de I/O para refresh-token-repo-unavailable.
// Nao usado no save (o save tem tratamento proprio — necessidade de distinguir erros).

const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, RefreshTokenRepositoryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[refresh-token-repo:${ctx}] ${String(cause)}\n`);
    return err('refresh-token-repo-unavailable');
  }
};

// ─── buildRefreshToken ─────────────────────────────────────────────────────────
//
// Constroi RefreshToken a partir de uma row. Falha do mapper -> refresh-token-repo-unavailable.
// Espelha buildUser em user-repository.drizzle.ts e buildContract em contract-repository.drizzle.ts.

const buildRefreshToken = (
  row: Parameters<typeof refreshTokenFromRow>[0],
): Result<RefreshToken, RefreshTokenRepositoryError> => {
  const r = refreshTokenFromRow(row);
  if (!r.ok) {
    process.stderr.write(`[refresh-token-repo:mapper] ${r.error.tag}\n`);
    return err('refresh-token-repo-unavailable');
  }
  return ok(r.value);
};

// ─── Factory ──────────────────────────────────────────────────────────────────
//
// createDrizzleRefreshTokenStore(handle) -> { repository }
// Sem Clock (blueprint §1 — token carrega seus instantes).

export const createDrizzleRefreshTokenStore = (
  handle: AuthMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): Readonly<{ repository: RefreshTokenRepository }> => {
  const { db, schema } = handle;

  // ── findById (PK, type=const) ───────────────────────────────────────────────

  const findById = async (
    id: RefreshTokenId,
  ): Promise<Result<RefreshToken | null, RefreshTokenRepositoryError>> =>
    safe('findById', async () => {
      // Q: auth_refresh_token por PK (type=const — blueprint §3)
      const rows = await db
        .select()
        .from(schema.authRefreshToken)
        .where(eq(schema.authRefreshToken.id, id as unknown as string))
        .limit(1);

      const row = rows[0];
      if (row === undefined) return null;

      const r = buildRefreshToken(row);
      // Dentro de safe(): throw e capturado e convertido para err (padrao).
      // Mas buildRefreshToken nunca lanca — ele retorna Result.
      // Precisa extrair o valor para retornar o tipo correto do safe().
      if (!r.ok) throw new Error(JSON.stringify(r.error));
      return r.value;
    });

  // ── findByTokenHash (auth_rt_token_hash_idx UNIQUE, type=const) ────────────

  const findByTokenHash = async (
    tokenHash: string,
  ): Promise<Result<RefreshToken | null, RefreshTokenRepositoryError>> =>
    safe('findByTokenHash', async () => {
      // Q: auth_refresh_token WHERE token_hash=? (UNIQUE index — type=const)
      const rows = await db
        .select()
        .from(schema.authRefreshToken)
        .where(eq(schema.authRefreshToken.tokenHash, tokenHash))
        .limit(1);

      const row = rows[0];
      if (row === undefined) return null;

      const r = buildRefreshToken(row);
      if (!r.ok) throw new Error(JSON.stringify(r.error));
      return r.value;
    });

  // ── findRevocableByUserId (auth_rt_user_revoked_idx composto) ───────────────
  //
  // Blueprint §3: WHERE user_id=? AND revoked_at IS NULL
  // Indice composto auth_rt_user_revoked_idx (user_id, revoked_at) — type=ref.
  // IS NULL usa o indice (Refman §8.2.1.1). Inclui rotated (replacedBy!=null, revokedAt=null).
  // Retorna readonly RefreshToken[] — nunca null (array vazio se nao encontrar).

  const findRevocableByUserId = async (
    userId: UserId,
  ): Promise<Result<readonly RefreshToken[], RefreshTokenRepositoryError>> =>
    safe('findRevocableByUserId', async () => {
      // Q: auth_refresh_token WHERE user_id=? AND revoked_at IS NULL
      const rows = await db
        .select()
        .from(schema.authRefreshToken)
        .where(
          and(
            eq(schema.authRefreshToken.userId, userId as unknown as string),
            isNull(schema.authRefreshToken.revokedAt),
          ),
        );

      const tokens: RefreshToken[] = [];
      for (const row of rows) {
        const r = buildRefreshToken(row);
        if (!r.ok) throw new Error(JSON.stringify(r.error));
        tokens.push(r.value);
      }
      return tokens;
    });

  // ── save (transacao: SELECT FOR UPDATE -> UPDATE/INSERT) ────────────────────
  //
  // Blueprint §2: Upsert via SELECT-then-UPDATE-or-INSERT (ADR-0020 — sem ODKU).
  // UPDATE toca so revokedAt/replacedBy (rotacao e revogacao — fields do ciclo de vida).
  // INSERT em emissao de novo token.
  // Colisao em token_hash UNIQUE (sha256): nao-evento — catch generico.
  // Colisao em PK (id): race condition extrema — catch generico.
  // O save NAO usa safe() pois qualquer erro se converte em refresh-token-repo-unavailable.

  const save = async (token: RefreshToken): Promise<Result<void, RefreshTokenRepositoryError>> => {
    try {
      await db.transaction(async (tx) => {
        // SELECT FOR UPDATE: adquire next-key lock se row existe ou gap lock se ausente.
        // Elimina janela de corrida (espelha user-repository.drizzle.ts §save).
        const existing = await tx
          .select({ id: schema.authRefreshToken.id })
          .from(schema.authRefreshToken)
          .where(eq(schema.authRefreshToken.id, token.id as unknown as string))
          .for('update');

        if (existing.length > 0) {
          // UPDATE: toca so revokedAt e replacedBy (campos do ciclo de vida do token).
          // issued_at/expires_at/token_hash/user_id sao imutaveis apos emissao.
          await tx
            .update(schema.authRefreshToken)
            .set({
              revokedAt: token.revokedAt,
              replacedBy:
                token.replacedBy !== null ? (token.replacedBy as unknown as string) : null,
            })
            .where(eq(schema.authRefreshToken.id, token.id as unknown as string));
        } else {
          // INSERT em emissao de novo token (token.revokedAt === null, token.replacedBy === null).
          await tx.insert(schema.authRefreshToken).values(refreshTokenToInsert(token));
        }
      });

      return ok(undefined);
    } catch (cause) {
      // Qualquer erro (FK, UNIQUE token_hash, network) -> refresh-token-repo-unavailable.
      // Sem distinguir ER_DUP_ENTRY aqui (blueprint: colisao sha256 = nao-evento -> generico).
      process.stderr.write(`[refresh-token-repo:save] ${String(cause)}\n`);
      return err('refresh-token-repo-unavailable');
    }
  };

  const repository: RefreshTokenRepository = {
    save,
    findById,
    findByTokenHash,
    findRevocableByUserId,
  };

  return { repository };
};
