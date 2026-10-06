/**
 * Mapper read-record → DTO HTTP de fornecedor. Serialização pura. Detalhe e item de lista
 * compartilham o shape (schema legado `Supplier`). Espelha `collaborator-dto.ts`.
 */

import type { SupplierReadRecord } from '#src/modules/partners/application/ports/supplier-reader.ts';
import { companyNamesOf, documentOf } from '#src/modules/partners/domain/supplier/supplier.ts';
import type { SupplierDetailDto } from './supplier-schemas.ts';

export const supplierToDetailDto = (
  record: SupplierReadRecord,
  contractCount: number,
): SupplierDetailDto => {
  const s = record.supplier;
  const document = documentOf(s);
  // Identidade PF × PJ (#1022): na PF razão social e nome fantasia não existem, e o JSON diz
  // "ausente" com `null`. `personType` é derivado do documento, nunca gravado.
  const names = companyNamesOf(s.identity);
  return {
    id: String(s.id),
    legacyId: record.legacyId,
    name: s.name,
    email: s.email,
    document,
    // DEPRECATED (#1022): alias de `document` por um ciclo, até o front migrar.
    cnpj: document,
    personType: s.identity.personType === 'individual' ? 'PF' : 'PJ',
    corporateName: names?.corporateName ?? null,
    fantasyName: names?.fantasyName ?? null,
    serviceCategory: s.serviceCategory,
    bankAccount: s.bankAccount,
    pixKey: s.pixKey,
    serviceRating: s.serviceRating,
    ratingComment: s.ratingComment,
    active: s.status === 'Active',
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    contractCount,
  };
};
