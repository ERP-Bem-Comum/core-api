/**
 * Mapper ETL: linha legada `users` → `ValidatedLegacyUser` (DTO intermediário).
 *
 * Diferente dos demais: NÃO chama `rehydrate`. `users` alimenta DOIS destinos —
 * `auth.User` (email, sem senha — D6) e `UserProfile` (par_user_profiles) — cuja montagem
 * depende de `userRef` (UUID do auth.User criado no WRITER) e `collaboratorRef` (resolvido
 * de `legacyCollaboratorId` via map no WRITER). Aqui apenas VALIDAMOS e carregamos os refs.
 *
 * ⚠️ `users.password` nunca é lido (D6 + segurança) — sequer existe em `LegacyUserRow`.
 */

import { type Result, ok, err, combine } from '#src/shared/primitives/result.ts';
import type { Cpf } from '#src/shared/kernel/cpf.ts';
import type { LegacyUserRow } from '../legacy/rows.ts';
import type { QuarantineReason } from '../quarantine/reason.ts';
import { requireField, requireEmail, parseCpfField } from './shared.ts';

export type ValidatedLegacyUser = Readonly<{
  legacyId: number;
  legacyCollaboratorId: number | null;
  email: string; // auth.User
  name: string; // UserProfile
  cpf: Cpf; // UserProfile
  telephone: string; // UserProfile
  avatarUrl: string | null; // UserProfile (de imageUrl)
  massApprove: boolean; // → grant contract:mass-approve no WRITER
}>;

export const mapLegacyUserRow = (
  row: LegacyUserRow,
): Result<ValidatedLegacyUser, readonly QuarantineReason[]> => {
  const fields = combine<readonly [string, string, Cpf, string], QuarantineReason>([
    requireEmail(row.email, 'email'),
    requireField(row.name, 'name'),
    parseCpfField(row.cpf, 'cpf'),
    requireField(row.telephone, 'telephone'),
  ]);
  if (!fields.ok) return err(fields.error);

  const [email, name, cpf, telephone] = fields.value;
  return ok({
    legacyId: row.id,
    legacyCollaboratorId: row.collaboratorId,
    email,
    name,
    cpf,
    telephone,
    avatarUrl: row.imageUrl,
    massApprove: row.massApprovalPermission === 1,
  });
};
