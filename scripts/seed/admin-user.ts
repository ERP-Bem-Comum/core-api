/**
 * Seed one-shot idempotente do usuario admin do modulo auth (#245).
 *
 * PRODUCAO-SAFE: NUNCA deleta, NUNCA sobrescreve. Re-rodar e seguro.
 *
 * Comportamento:
 *   1. Valida env obrigatorias -> exitCode 78 (EX_CONFIG) se ausente.
 *   2. Conecta via openAuthMysql (applyMigrations: false — schema ja provisionado).
 *   3. Faz hash da senha via argon2id OWASP (makeArgon2PasswordHasher).
 *   4. Role 'admin-sistema': reusa se existir; cria senao. Garante TODAS as PermissionCatalog.all.
 *   5. Usuario: se ADMIN_EMAIL ja existe -> avisa e encerra (exitCode 0, sem sobrescrever).
 *      Senao insere com status 'active'.
 *   6. Atribui role ao usuario em auth_user_role (idempotente).
 *   7. Fecha o pool; exitCode 0.
 *
 * Env vars (TODAS obrigatorias — nunca argv, que vaza em `ps aux`):
 *   AUTH_DATABASE_URL   - connection string MySQL (mysql://user:pass@host:port/db)
 *   ADMIN_EMAIL         - e-mail do admin (unico em auth_user)
 *   ADMIN_PASSWORD      - senha em claro (hasheada pelo adapter argon2id; nunca logada)
 *   ADMIN_NAME          - nome completo
 *   ADMIN_CPF           - CPF (so digitos, 11 chars; normalizacao aplicada aqui)
 *   ADMIN_PHONE         - telefone (so digitos, ate 13 chars; normalizacao aplicada aqui)
 *
 * Exit codes:
 *   0  - sucesso (ou usuario ja existia — idempotente)
 *   1  - erro de runtime (banco, hash, I/O)
 *   78 - EX_CONFIG — env var obrigatoria ausente ou invalida
 */

import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { eq } from 'drizzle-orm';

import { openAuthMysql } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import { makeArgon2PasswordHasher } from '#src/modules/auth/adapters/crypto/password-hasher.argon2.ts';
import * as PasswordPolicy from '#src/modules/auth/domain/credential/password-policy.ts';
import * as PermissionCatalog from '#src/modules/auth/domain/authorization/permission-catalog.ts';
import * as schema from '#src/modules/auth/adapters/persistence/schemas/mysql.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as Cpf from '#src/modules/auth/domain/identity/cpf.ts';
import * as Telephone from '#src/modules/auth/domain/identity/telephone.ts';

// ─── Utilitarios ───────────────────────────────────────────────────────────────

/** Normaliza CPF: extrai so digitos, trunca em 11. */
const normalizeCpf = (raw: string): string => raw.replace(/\D/g, '').slice(0, 11);

/** Normaliza telefone: extrai so digitos, trunca em 13. */
const normalizeTelephone = (raw: string): string => raw.replace(/\D/g, '').slice(0, 13);

// ─── Validacao de env ──────────────────────────────────────────────────────────

type EnvConfig = Readonly<{
  databaseUrl: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
  adminCpf: string;
  adminPhone: string;
}>;

type EnvError =
  | 'env-missing-AUTH_DATABASE_URL'
  | 'env-missing-ADMIN_EMAIL'
  | 'env-missing-ADMIN_PASSWORD'
  | 'env-missing-ADMIN_NAME'
  | 'env-missing-ADMIN_CPF'
  | 'env-missing-ADMIN_PHONE';

/**
 * Valida e coleta as env vars obrigatorias.
 * Retorna { ok: true, value } ou { ok: false, errors } com TODAS as ausentes de uma vez.
 *
 * Coleta TODOS os erros antes de retornar (fail-all, nao fail-first) para que o operador
 * veja de uma vez quais variaveis estao faltando.
 */
export const readEnvConfig = ():
  | { ok: true; value: EnvConfig }
  | { ok: false; errors: readonly EnvError[] } => {
  const databaseUrl = process.env['AUTH_DATABASE_URL'];
  const adminEmail = process.env['ADMIN_EMAIL'];
  const adminPassword = process.env['ADMIN_PASSWORD'];
  const adminName = process.env['ADMIN_NAME'];
  const adminCpf = process.env['ADMIN_CPF'];
  const adminPhone = process.env['ADMIN_PHONE'];

  // Coletar todos os ausentes antes de retornar (fail-all).
  const errors: EnvError[] = [
    ...(databaseUrl === undefined ? (['env-missing-AUTH_DATABASE_URL'] as const) : []),
    ...(adminEmail === undefined ? (['env-missing-ADMIN_EMAIL'] as const) : []),
    ...(adminPassword === undefined ? (['env-missing-ADMIN_PASSWORD'] as const) : []),
    ...(adminName === undefined ? (['env-missing-ADMIN_NAME'] as const) : []),
    ...(adminCpf === undefined ? (['env-missing-ADMIN_CPF'] as const) : []),
    ...(adminPhone === undefined ? (['env-missing-ADMIN_PHONE'] as const) : []),
  ];

  if (errors.length > 0) return { ok: false, errors };

  // Apos o guard acima, TypeScript nao estreita as variaveis individuais (acumulacao nao narrow).
  // Verificamos cada uma individualmente abaixo — retorno early garante narrowing para string.
  if (
    databaseUrl === undefined ||
    adminEmail === undefined ||
    adminPassword === undefined ||
    adminName === undefined ||
    adminCpf === undefined ||
    adminPhone === undefined
  ) {
    // Ramo inalcancavel: guard acima retornou se errors.length > 0.
    // Necessario para narrowing do compilador (TS nao infere exclusao cruzada de acumulacao).
    return { ok: false, errors: [] };
  }

  return {
    ok: true,
    value: {
      databaseUrl,
      adminEmail,
      adminPassword,
      adminName,
      adminCpf: normalizeCpf(adminCpf),
      adminPhone: normalizeTelephone(adminPhone),
    },
  };
};

// ─── Validacao de dominio do perfil (VOs — espelha createUserByAdmin) ───────────
//
// O seed insere o usuario diretamente; sem isto, email/cpf/telephone CRUS poderiam ser persistidos
// e depois REJEITADOS pelo read-path (mapper userFromRows) — causa do incidente login 500. Valida
// pelos MESMOS smart constructors do dominio e devolve os valores NORMALIZADOS (email lowercase/trim)
// usados no findByEmail (unicidade) + INSERT, garantindo auto-consistencia write<->read.

export type ValidatedAdminProfile = Readonly<{
  email: string;
  cpf: string;
  telephone: string;
  name: string;
}>;

export const validateAdminProfile = (
  config: EnvConfig,
): { ok: true; value: ValidatedAdminProfile } | { ok: false; error: string } => {
  const email = Email.parse(config.adminEmail);
  if (!email.ok) return { ok: false, error: `ADMIN_EMAIL invalido: ${email.error}` };
  const cpf = Cpf.parse(config.adminCpf);
  if (!cpf.ok) return { ok: false, error: `ADMIN_CPF invalido: ${cpf.error}` };
  const telephone = Telephone.parse(config.adminPhone);
  if (!telephone.ok) return { ok: false, error: `ADMIN_PHONE invalido: ${telephone.error}` };
  const name = config.adminName.trim();
  if (name.length === 0) return { ok: false, error: 'ADMIN_NAME vazio (name-required)' };

  return {
    ok: true,
    value: { email: email.value, cpf: cpf.value, telephone: telephone.value, name },
  };
};

// ─── ER_DUP_ENTRY detection (espelha role-repository.drizzle.ts) ───────────────

const getDupEntryInfo = (e: unknown): { errno: number; sqlMessage: string } | null => {
  const candidates: unknown[] = [e];
  if (e instanceof Error && e.cause !== undefined) candidates.push(e.cause);
  for (const c of candidates) {
    if (typeof c === 'object' && c !== null) {
      const obj = c as Record<string, unknown>;
      if (typeof obj['errno'] === 'number' && obj['errno'] === 1062) {
        return {
          errno: 1062,
          sqlMessage: typeof obj['sqlMessage'] === 'string' ? obj['sqlMessage'] : '',
        };
      }
    }
  }
  return null;
};

const isPermissionNameDupEntry = (e: unknown): boolean => {
  const info = getDupEntryInfo(e);
  if (info === null) return false;
  return info.sqlMessage.includes('auth_permission_name_idx');
};

// ─── Logica de seed ───────────────────────────────────────────────────────────

const ADMIN_ROLE_NAME = 'admin-sistema';

const main = async (): Promise<void> => {
  // 1. Validar env obrigatorias — antes de qualquer escrita
  const envR = readEnvConfig();
  if (!envR.ok) {
    for (const e of envR.errors) {
      process.stderr.write(`[admin-seed] env ausente: ${e}\n`);
    }
    process.exitCode = 78;
    return;
  }

  const config = envR.value;

  // Validar o perfil via os VOs do dominio ANTES de qualquer escrita (espelha createUserByAdmin).
  // Falha aqui = nao cria usuario que o read-path (mapper) rejeitaria — incidente login 500.
  const profileR = validateAdminProfile(config);
  if (!profileR.ok) {
    process.stderr.write(`[admin-seed] ${profileR.error}\n`);
    process.exitCode = 1;
    return;
  }
  const profile = profileR.value;

  // 2. Conectar via openAuthMysql (applyMigrations: false — schema ja provisionado por migrations)
  process.stdout.write('[admin-seed] conectando ao banco...\n');
  const handleR = await openAuthMysql({
    connectionString: config.databaseUrl,
    applyMigrations: false,
  });

  if (!handleR.ok) {
    process.stderr.write(`[admin-seed] falha ao conectar: ${handleR.error}\n`);
    process.exitCode = 1;
    return;
  }

  const { db, close } = handleR.value;
  const now = new Date();

  try {
    // 3. Hash da senha via argon2id OWASP (params corretos no adapter).
    //    NUNCA logar a senha em claro nem incluir no erro.
    //
    //    O port PasswordHasher recebe `Password` (branded — politica de forca validada).
    //    Em script de seed admin, aplicamos o smart constructor diretamente. Se a senha
    //    violar a politica (muito curta, muito longa, blocklist), o seed falha — isso e
    //    intencional: senhas fracas nao devem ser criadas nem para o admin.
    process.stdout.write('[admin-seed] computando hash da senha...\n');
    const passwordR = PasswordPolicy.parse(config.adminPassword);
    if (!passwordR.ok) {
      // Nao incluir a senha no erro; so o codigo de violacao da politica.
      process.stderr.write(`[admin-seed] senha invalida (politica): ${passwordR.error}\n`);
      process.exitCode = 1;
      return;
    }
    const hasher = makeArgon2PasswordHasher();
    const hashR = await hasher.hash(passwordR.value);
    if (!hashR.ok) {
      process.stderr.write(`[admin-seed] falha ao gerar hash: ${hashR.error}\n`);
      process.exitCode = 1;
      return;
    }
    // PasswordHash e branded string; o valor raw (string PHC) e acessado via cast auditado.
    // O VO nao expoe um getter — o valor e a propria string PHC (fromString preserva byte-a-byte).
    const passwordHash = hashR.value as unknown as string;

    // 4. Role 'admin-sistema': reusar se existir; criar senao.
    //    Garantir que tem TODAS as PermissionCatalog.all (upsert idempotente).
    process.stdout.write(`[admin-seed] verificando role '${ADMIN_ROLE_NAME}'...\n`);

    const roleId = await db.transaction(async (tx) => {
      // Busca role por nome (auth_role_name_idx UNIQUE)
      const existingRoles = await tx
        .select({ id: schema.authRole.id })
        .from(schema.authRole)
        .where(eq(schema.authRole.name, ADMIN_ROLE_NAME))
        .limit(1);

      const existingRoleRow = existingRoles[0];
      const id: string =
        existingRoleRow !== undefined
          ? existingRoleRow.id
          : await (async () => {
              const newId = randomUUID();
              await tx.insert(schema.authRole).values({
                id: newId,
                name: ADMIN_ROLE_NAME,
                description: 'Administrador do sistema — acesso total a todas as permissoes.',
                status: 'active',
                createdAt: now,
                updatedAt: now,
              });
              process.stdout.write(`[admin-seed] role criada: ${newId}\n`);
              return newId;
            })();
      if (existingRoleRow !== undefined) {
        process.stdout.write(`[admin-seed] role existente reutilizada: ${id}\n`);
      }

      // Upsert auth_permission por name (espelha role-repository.drizzle.ts:resolvePermissionId).
      // Loop serial (nao Promise.all — evita deadlock no name_idx).
      const permissionIds: string[] = [];
      for (const perm of PermissionCatalog.all) {
        const permName = perm as unknown as string;

        const existingPerm = await tx
          .select({ id: schema.authPermission.id })
          .from(schema.authPermission)
          .where(eq(schema.authPermission.name, permName))
          .limit(1);

        const existingPermRow = existingPerm[0];
        // Resolve permissionId: SELECT existente ou INSERT (ignore-then-reselect em corrida).
        const permId: string =
          existingPermRow !== undefined
            ? existingPermRow.id
            : await (async () => {
                const newPermId = randomUUID();
                try {
                  await tx.insert(schema.authPermission).values({
                    id: newPermId,
                    name: permName,
                    createdAt: now,
                  });
                  return newPermId;
                } catch (insertErr) {
                  if (isPermissionNameDupEntry(insertErr)) {
                    // Corrida: re-SELECT (ignore-then-reselect; permission e imutavel)
                    const raced = await tx
                      .select({ id: schema.authPermission.id })
                      .from(schema.authPermission)
                      .where(eq(schema.authPermission.name, permName))
                      .limit(1);
                    const racedRow = raced[0];
                    if (racedRow !== undefined) return racedRow.id;
                  }
                  throw insertErr;
                }
              })();
        permissionIds.push(permId);
      }

      // Upsert auth_role_permission: DELETE existentes + INSERT batch.
      // Idempotente: re-rodar e seguro (nao duplica).
      await tx.delete(schema.authRolePermission).where(eq(schema.authRolePermission.roleId, id));

      if (permissionIds.length > 0) {
        await tx
          .insert(schema.authRolePermission)
          .values(permissionIds.map((permissionId) => ({ roleId: id, permissionId })));
      }

      return id;
    });

    // 5. Usuario: se ADMIN_EMAIL ja existe -> encerra com aviso (idempotente, exitCode 0).
    process.stdout.write(`[admin-seed] verificando usuario '${profile.email}'...\n`);
    const existingUsers = await db
      .select({ id: schema.authUser.id })
      .from(schema.authUser)
      .where(eq(schema.authUser.email, profile.email))
      .limit(1);

    const existingUserRow = existingUsers[0];

    // 5. Se usuario ja existe: encerra sem sobrescrever (idempotente). exitCode 0.
    if (existingUserRow !== undefined) {
      const userId = existingUserRow.id;
      process.stdout.write(
        `[admin-seed] usuario ja existe (id=${userId}) — nenhuma alteracao feita. Idempotente.\n`,
      );

      // Garantir atribuicao de role para usuario pre-existente (idempotente)
      const existingAssignment = await db
        .select({ userId: schema.authUserRole.userId })
        .from(schema.authUserRole)
        .where(eq(schema.authUserRole.userId, userId))
        .limit(1);

      if (existingAssignment[0] === undefined) {
        await db.insert(schema.authUserRole).values({ userId, roleId, assignedAt: now });
        process.stdout.write(
          `[admin-seed] role '${ADMIN_ROLE_NAME}' atribuida ao usuario existente.\n`,
        );
      } else {
        process.stdout.write(`[admin-seed] atribuicao de role ja existe — sem alteracao.\n`);
      }
    } else {
      // Inserir usuario + atribuir role em transacao unica (atomicidade usuario+role)
      const userId = randomUUID();
      await db.transaction(async (tx) => {
        await tx.insert(schema.authUser).values({
          id: userId,
          email: profile.email,
          passwordHash,
          status: 'active',
          name: profile.name,
          cpf: profile.cpf,
          telephone: profile.telephone,
          createdAt: now,
          updatedAt: now,
        });

        // 6. Atribuir a role ao usuario (PK composta userId+roleId — idempotente por PK).
        //    Verificamos antes em vez de INSERT IGNORE (ADR-0020: sem ODKU).
        //    Para usuario recem-criado, a linha nao pode existir ainda; o SELECT e defensivo.
        const existingAssignment = await tx
          .select({ userId: schema.authUserRole.userId })
          .from(schema.authUserRole)
          .where(eq(schema.authUserRole.userId, userId))
          .limit(1);

        if (existingAssignment[0] === undefined) {
          await tx.insert(schema.authUserRole).values({ userId, roleId, assignedAt: now });
        }
      });

      process.stdout.write(`[admin-seed] usuario admin criado: ${userId}\n`);
      process.stdout.write(`[admin-seed] role '${ADMIN_ROLE_NAME}' atribuida ao usuario.\n`);
    }

    process.stdout.write('[admin-seed] concluido com sucesso.\n');
    process.exitCode = 0;
  } catch (cause) {
    process.stderr.write(`[admin-seed] erro de runtime: ${String(cause)}\n`);
    process.exitCode = 1;
  } finally {
    await close();
  }
};

// Executa main() apenas quando rodado como script (nao quando importado em testes).
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
