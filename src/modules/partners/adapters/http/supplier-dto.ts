/**
 * Mapper read-record → DTO HTTP de fornecedor. Serialização pura. Detalhe e item de lista
 * compartilham o shape (schema legado `Supplier`). Espelha `collaborator-dto.ts`.
 */

import type { SupplierReadRecord } from '#src/modules/partners/application/ports/supplier-reader.ts';
import type { SupplierDetailDto } from './supplier-schemas.ts';

export const supplierToDetailDto = (record: SupplierReadRecord): SupplierDetailDto => {
  const s = record.supplier;
  return {
    id: String(s.id),
    legacyId: record.legacyId,
    name: s.name,
    email: s.email,
    cnpj: String(s.cnpj),
    corporateName: s.corporateName,
    fantasyName: s.fantasyName,
    serviceCategory: s.serviceCategory,
    bankAccount: s.bankAccount,
    pixKey: s.pixKey,
    serviceRating: s.serviceRating,
    ratingComment: s.ratingComment,
    active: s.status === 'Active',
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
};
