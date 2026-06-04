/**
 * Mapper read-record → DTO HTTP de financiador. Serialização pura. Espelha `supplier-dto.ts`.
 */

import type { FinancierReadRecord } from '#src/modules/partners/application/ports/financier-reader.ts';
import type { FinancierDetailDto } from './financier-schemas.ts';

export const financierToDetailDto = (record: FinancierReadRecord): FinancierDetailDto => {
  const f = record.financier;
  return {
    id: String(f.id),
    legacyId: record.legacyId,
    name: f.name,
    corporateName: f.corporateName,
    legalRepresentative: f.legalRepresentative,
    cnpj: String(f.cnpj),
    telephone: f.telephone,
    address: f.address,
    active: f.status === 'Active',
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
};
