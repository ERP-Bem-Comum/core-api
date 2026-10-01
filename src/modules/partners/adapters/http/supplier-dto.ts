/**
 * Mapper read-record → DTO HTTP de fornecedor. Serialização pura. Detalhe e item de lista
 * compartilham o shape (schema legado `Supplier`). Espelha `collaborator-dto.ts`.
 */

import type { SupplierReadRecord } from '#src/modules/partners/application/ports/supplier-reader.ts';
import { documentOf } from '#src/modules/partners/domain/supplier/supplier.ts';
import type { SupplierIdentity } from '#src/modules/partners/domain/supplier/types.ts';
import type { SupplierDetailDto } from './supplier-schemas.ts';

type IdentityFields = Pick<SupplierDetailDto, 'personType' | 'corporateName' | 'fantasyName'>;

// Identidade PF × PJ (#1022) → JSON. Na PF a razão social e o nome fantasia não existem; o JSON
// diz "ausente" com `null`. `personType` é derivado do documento, nunca gravado.
const identityFields = (identity: SupplierIdentity): IdentityFields => {
  switch (identity.personType) {
    case 'individual':
      return { personType: 'PF', corporateName: null, fantasyName: null };
    case 'company':
      return {
        personType: 'PJ',
        corporateName: identity.corporateName,
        fantasyName: identity.fantasyName,
      };
  }
};

export const supplierToDetailDto = (
  record: SupplierReadRecord,
  contractCount: number,
): SupplierDetailDto => {
  const s = record.supplier;
  const document = documentOf(s);
  return {
    id: String(s.id),
    legacyId: record.legacyId,
    name: s.name,
    email: s.email,
    document,
    // DEPRECATED (#1022): alias de `document` por um ciclo, até o front migrar.
    cnpj: document,
    ...identityFields(s.identity),
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
