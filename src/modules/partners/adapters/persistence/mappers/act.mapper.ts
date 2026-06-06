// Mapper Act: row MySQL ↔ agregado Act (módulo partners).
//
//   - actToInsert(a, now): NewActRow — enums achatados em colunas varchar;
//     active/deactivated_at derivados do soft-delete; `now` injetado.
//   - actFromRow(row): Result<Act, ActMapperError> — reidrata id/cpf/enums
//     na borda, valida registration_status, delega a Act.rehydrate
//     (reaplica coerência registro × soft-delete).
//
// ADR-0020: enums são varchar (sem ENUM nativo). ADR-0014: só par_*. Zero throw na borda.

import { type Result, err } from '#src/shared/primitives/result.ts';
import * as Cpf from '#src/shared/kernel/cpf.ts';
import * as ActId from '#src/modules/partners/domain/act/act-id.ts';
import * as OccupationArea from '#src/modules/partners/domain/collaborator/occupation-area.ts';
import * as EmploymentRelationship from '#src/modules/partners/domain/collaborator/employment-relationship.ts';
import * as Act from '#src/modules/partners/domain/act/act.ts';
import type {
  Act as ActEntity,
  RegistrationStatus,
} from '#src/modules/partners/domain/act/types.ts';
import type { ActRow, NewActRow } from '../schemas/mysql.ts';

export type ActMapperError =
  | 'act-mapper-invalid-id'
  | 'act-mapper-invalid-cpf'
  | 'act-mapper-invalid-enum'
  | 'act-mapper-invalid-state';

const REGISTRATION_STATUSES: ReadonlySet<string> = new Set<RegistrationStatus>([
  'PreRegistration',
  'Complete',
]);

export const actToInsert = (a: ActEntity, now: Date): NewActRow => ({
  id: a.id as unknown as string,
  name: a.name,
  email: a.email,
  cpf: a.cpf as unknown as string,
  occupationArea: a.occupationArea,
  role: a.role,
  startOfContract: a.startOfContract,
  employmentRelationship: a.employmentRelationship,
  registrationStatus: a.registrationStatus,
  active: a.status === 'Active',
  deactivatedAt: a.status === 'Inactive' ? a.deactivatedAt : null,
  createdAt: now,
  updatedAt: now,
});

export const actFromRow = (row: Readonly<ActRow>): Result<ActEntity, ActMapperError> => {
  const id = ActId.rehydrate(row.id);
  if (!id.ok) return err('act-mapper-invalid-id');

  const cpf = Cpf.parse(row.cpf);
  if (!cpf.ok) return err('act-mapper-invalid-cpf');

  const occupationArea = OccupationArea.parse(row.occupationArea);
  if (!occupationArea.ok) return err('act-mapper-invalid-enum');

  const employmentRelationship = EmploymentRelationship.parse(row.employmentRelationship);
  if (!employmentRelationship.ok) return err('act-mapper-invalid-enum');

  if (!REGISTRATION_STATUSES.has(row.registrationStatus)) {
    return err('act-mapper-invalid-state');
  }

  const rehydrated = Act.rehydrate({
    id: id.value,
    name: row.name,
    email: row.email,
    cpf: cpf.value,
    occupationArea: occupationArea.value,
    role: row.role,
    startOfContract: row.startOfContract,
    employmentRelationship: employmentRelationship.value,
    registrationStatus: row.registrationStatus as RegistrationStatus,
    status: row.active ? 'Active' : 'Inactive',
    deactivatedAt: row.deactivatedAt,
  });
  if (!rehydrated.ok) return err('act-mapper-invalid-state');
  return rehydrated;
};
