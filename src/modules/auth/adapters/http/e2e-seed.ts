/**
 * Seed RBAC via env para E2E/dev (CONTRACTS-HTTP-E2E-SMOKE, opção a).
 *
 * `parseE2eAuthSeed` é puro e tem **guarda dupla**: só devolve um `AuthSeed` quando
 * `CORE_API_E2E === '1'` E `AUTH_SEED_JSON` está presente e bem-formado. Em produção
 * (`CORE_API_E2E` ausente) devolve `undefined` — o seed é inerte, jamais lido.
 *
 * ⚠️ `CORE_API_E2E`/`AUTH_SEED_JSON` são EXCLUSIVOS de dev/test/E2E — nunca setados em produção.
 * JSON malformado ou shape inválido sob a flag → erro de boot (falha cedo, ambiente controlado).
 */

import type { AuthSeed, AuthSeedUser } from './composition.ts';

const isStringArray = (v: unknown): v is readonly string[] =>
  Array.isArray(v) && v.every((item) => typeof item === 'string');

const isAuthSeedUser = (v: unknown): v is AuthSeedUser => {
  if (typeof v !== 'object' || v === null) return false;
  const u = v as Record<string, unknown>;
  return (
    typeof u['email'] === 'string' &&
    typeof u['password'] === 'string' &&
    isStringArray(u['permissions'])
  );
};

const isAuthSeed = (v: unknown): v is AuthSeed => {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return Array.isArray(s['users']) && s['users'].every(isAuthSeedUser);
};

export const parseE2eAuthSeed = (
  env: Readonly<Record<string, string | undefined>>,
): AuthSeed | undefined => {
  if (env['CORE_API_E2E'] !== '1') return undefined;
  const raw = env['AUTH_SEED_JSON'];
  if (raw === undefined || raw === '') return undefined;

  const parsed: unknown = JSON.parse(raw); // lança SyntaxError em JSON malformado (boot dev/test)
  if (!isAuthSeed(parsed)) {
    throw new Error(
      'parseE2eAuthSeed: AUTH_SEED_JSON com shape inválido (esperado { users: [{ email, password, permissions[] }] })',
    );
  }
  return parsed;
};
