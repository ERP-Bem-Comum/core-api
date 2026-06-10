/**
 * Mapper ActReadRecord → DTO HTTP do Acordo. Serialização pura (sem I/O). Detalhe e item de
 * lista compartilham o shape. `startDate`/`endDate` derivados da vigência (Period Fixed).
 */

import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import type { ActReadRecord } from '#src/modules/partners/application/ports/act-reader.ts';
import type { ActDetailDto } from './act-schemas.ts';

export const actToDetailDto = (record: ActReadRecord): ActDetailDto => {
  const a = record.act;
  const v = a.validity;
  return {
    id: String(a.id),
    legacyId: record.legacyId,
    actNumber: String(a.actNumber),
    name: a.name,
    email: a.email,
    cnpj: String(a.cnpj),
    corporateName: a.corporateName,
    fantasyName: a.fantasyName,
    occupationArea: a.occupationArea,
    legalRepresentative: a.legalRepresentative,
    startDate: PlainDate.toISOString(v.start),
    endDate: PlainDate.toISOString(v.kind === 'Fixed' ? v.end : v.start),
    hasFinancialTransfer: a.hasFinancialTransfer,
    bankAccount: a.bankAccount,
    pixKey: a.pixKey,
    active: a.status === 'Active',
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
};
