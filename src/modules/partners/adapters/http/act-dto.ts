/**
 * Mapper ActReadRecord → DTO HTTP. Serialização pura (sem I/O). Detalhe e item de lista
 * compartilham o mesmo shape. Espelha `supplier-dto.ts` / `collaborator-dto.ts`.
 */

import type { ActReadRecord } from '#src/modules/partners/application/ports/act-reader.ts';
import type { ActDetailDto } from './act-schemas.ts';

export const actToDetailDto = (record: ActReadRecord): ActDetailDto => {
  const a = record.act;
  return {
    id: String(a.id),
    legacyId: record.legacyId,
    name: a.name,
    email: a.email,
    cpf: String(a.cpf),
    occupationArea: a.occupationArea,
    role: a.role,
    startOfContract: a.startOfContract.toISOString(),
    employmentRelationship: a.employmentRelationship,
    registrationStatus: a.registrationStatus,
    active: a.status === 'Active',
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
};
