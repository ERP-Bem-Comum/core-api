// Amendment mapper para MySQL (dialeto único — ADR-0020).

import { type Result, ok, err } from '../../../../../shared/result.ts';
import type { Amendment, AmendmentKind, AmendmentStatus } from '../../../domain/amendment/types.ts';
import { AmendmentId, ContractId, DocumentId, UserRef } from '../../../domain/shared/ids.ts';
import { moneyFromCents } from './money.mapper.ts';
import type { amendments as amendmentsTable } from '../schemas/mysql.ts';

export type AmendmentRow = typeof amendmentsTable.$inferSelect;
export type AmendmentInsert = typeof amendmentsTable.$inferInsert;

export type AmendmentMapperError =
  | 'amendment-mapper-invalid-id'
  | 'amendment-mapper-invalid-contract-id'
  | 'amendment-mapper-invalid-kind'
  | 'amendment-mapper-invalid-status'
  | 'amendment-mapper-invalid-money'
  | 'amendment-mapper-missing-impact-value'
  | 'amendment-mapper-missing-new-end-date'
  | 'amendment-mapper-invalid-document-ref'
  | 'amendment-mapper-invalid-user-ref';

const KINDS: readonly AmendmentKind[] = ['Addition', 'Suppression', 'TermChange', 'Misc'];
const STATUSES: readonly AmendmentStatus[] = ['Pending', 'Homologated'];

const isKind = (v: string): v is AmendmentKind => (KINDS as readonly string[]).includes(v);
const isStatus = (v: string): v is AmendmentStatus => (STATUSES as readonly string[]).includes(v);

export const amendmentToInsert = (a: Amendment): AmendmentInsert => {
  const base = {
    id: a.id as unknown as string,
    contractId: a.contractId as unknown as string,
    amendmentNumber: a.amendmentNumber,
    description: a.description,
    createdAt: a.createdAt,
    kind: a.kind,
    status: a.status,
    signedDocumentRef:
      a.signedDocumentRef === null ? null : (a.signedDocumentRef as unknown as string),
    homologatedAt: a.homologatedAt,
    homologatedBy: a.homologatedBy === null ? null : (a.homologatedBy as unknown as string),
  };
  switch (a.kind) {
    case 'Addition':
    case 'Suppression':
      return { ...base, impactValueCents: a.impactValue.cents, newEndDate: null };
    case 'TermChange':
      return { ...base, impactValueCents: null, newEndDate: a.newEndDate };
    case 'Misc':
      return { ...base, impactValueCents: null, newEndDate: null };
    default: {
      const _exhaustive: never = a;
      return _exhaustive;
    }
  }
};

export const amendmentFromRow = (
  row: Readonly<AmendmentRow>,
): Result<Amendment, AmendmentMapperError> => {
  const idR = AmendmentId.rehydrate(row.id);
  if (!idR.ok) return err('amendment-mapper-invalid-id');
  const contractIdR = ContractId.rehydrate(row.contractId);
  if (!contractIdR.ok) return err('amendment-mapper-invalid-contract-id');
  if (!isKind(row.kind)) return err('amendment-mapper-invalid-kind');
  if (!isStatus(row.status)) return err('amendment-mapper-invalid-status');

  let signedDocumentRef: Amendment['signedDocumentRef'] = null;
  if (row.signedDocumentRef !== null) {
    const r = DocumentId.rehydrate(row.signedDocumentRef);
    if (!r.ok) return err('amendment-mapper-invalid-document-ref');
    signedDocumentRef = r.value;
  }
  let homologatedBy: Amendment['homologatedBy'] = null;
  if (row.homologatedBy !== null) {
    const r = UserRef.rehydrate(row.homologatedBy);
    if (!r.ok) return err('amendment-mapper-invalid-user-ref');
    homologatedBy = r.value;
  }

  const base = {
    id: idR.value,
    contractId: contractIdR.value,
    amendmentNumber: row.amendmentNumber,
    description: row.description,
    createdAt: row.createdAt,
    status: row.status,
    signedDocumentRef,
    homologatedAt: row.homologatedAt,
    homologatedBy,
  };

  switch (row.kind) {
    case 'Addition':
    case 'Suppression': {
      if (row.impactValueCents === null) return err('amendment-mapper-missing-impact-value');
      const m = moneyFromCents(row.impactValueCents);
      if (!m.ok) return err('amendment-mapper-invalid-money');
      return ok({ ...base, kind: row.kind, impactValue: m.value } as unknown as Amendment);
    }
    case 'TermChange': {
      if (row.newEndDate === null) return err('amendment-mapper-missing-new-end-date');
      return ok({
        ...base,
        kind: 'TermChange' as const,
        newEndDate: row.newEndDate,
      } as unknown as Amendment);
    }
    case 'Misc':
      return ok({ ...base, kind: 'Misc' as const } as unknown as Amendment);
    default: {
      const _exhaustive: never = row.kind;
      return _exhaustive;
    }
  }
};
