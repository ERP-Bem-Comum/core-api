// Contract mapper para MySQL (dialeto único — ADR-0020).
// `DATETIME(3)` retorna `Date` nativo (schemas/mysql.ts: `datetime(..., { mode: 'date' })`).

import { type Result, ok, err } from '../../../../../shared/result.ts';
import type { Contract, ContractStatus } from '../../../domain/contract/types.ts';
import { AmendmentId, ContractId } from '../../../domain/shared/ids.ts';
import { moneyFromCents } from './money.mapper.ts';
import { periodFromColumns, periodToColumns, type PeriodKindRaw } from './period.mapper.ts';
import type { contracts as contractsTable } from '../schemas/mysql.ts';

export type ContractRow = typeof contractsTable.$inferSelect;
export type ContractInsert = typeof contractsTable.$inferInsert;

export type ContractMapperError =
  | 'contract-mapper-invalid-id'
  | 'contract-mapper-invalid-status'
  | 'contract-mapper-invalid-money'
  | 'contract-mapper-invalid-period'
  | 'contract-mapper-invalid-amendment-id';

const STATUSES: readonly ContractStatus[] = ['Active', 'Expired', 'Terminated'];
const isStatus = (v: string): v is ContractStatus => (STATUSES as readonly string[]).includes(v);

const isPeriodKind = (v: string): v is PeriodKindRaw => v === 'Fixed' || v === 'Indefinite';

export const contractToInsert = (
  c: Contract,
): { row: ContractInsert; homologatedAmendmentIds: readonly string[] } => {
  const orig = periodToColumns(c.originalPeriod);
  const curr = periodToColumns(c.currentPeriod);
  return {
    row: {
      id: c.id as unknown as string,
      sequentialNumber: c.sequentialNumber,
      title: c.title,
      objective: c.objective,
      signedAt: c.signedAt,
      originalValueCents: c.originalValue.cents,
      originalPeriodKind: orig.kind,
      originalPeriodStart: orig.start,
      originalPeriodEnd: orig.end,
      currentValueCents: c.currentValue.cents,
      currentPeriodKind: curr.kind,
      currentPeriodStart: curr.start,
      currentPeriodEnd: curr.end,
      status: c.status,
      endedAt: c.endedAt,
    },
    homologatedAmendmentIds: c.homologatedAmendmentIds.map((id) => id as unknown as string),
  };
};

export const contractFromRow = (
  row: Readonly<ContractRow>,
  homologatedAmendmentIdsRaw: readonly string[],
): Result<Contract, ContractMapperError> => {
  const idR = ContractId.rehydrate(row.id);
  if (!idR.ok) return err('contract-mapper-invalid-id');

  if (!isStatus(row.status)) return err('contract-mapper-invalid-status');
  if (!isPeriodKind(row.originalPeriodKind)) return err('contract-mapper-invalid-period');
  if (!isPeriodKind(row.currentPeriodKind)) return err('contract-mapper-invalid-period');

  const origValue = moneyFromCents(row.originalValueCents);
  if (!origValue.ok) return err('contract-mapper-invalid-money');
  const currValue = moneyFromCents(row.currentValueCents);
  if (!currValue.ok) return err('contract-mapper-invalid-money');

  const origPeriod = periodFromColumns({
    kind: row.originalPeriodKind,
    start: row.originalPeriodStart,
    end: row.originalPeriodEnd,
  });
  if (!origPeriod.ok) return err('contract-mapper-invalid-period');
  const currPeriod = periodFromColumns({
    kind: row.currentPeriodKind,
    start: row.currentPeriodStart,
    end: row.currentPeriodEnd,
  });
  if (!currPeriod.ok) return err('contract-mapper-invalid-period');

  const homologatedIds: AmendmentId[] = [];
  for (const raw of homologatedAmendmentIdsRaw) {
    const r = AmendmentId.rehydrate(raw);
    if (!r.ok) return err('contract-mapper-invalid-amendment-id');
    homologatedIds.push(r.value);
  }

  const contract = {
    id: idR.value,
    sequentialNumber: row.sequentialNumber,
    title: row.title,
    objective: row.objective,
    signedAt: row.signedAt,
    originalValue: origValue.value,
    originalPeriod: origPeriod.value,
    currentValue: currValue.value,
    currentPeriod: currPeriod.value,
    status: row.status,
    homologatedAmendmentIds: homologatedIds,
    endedAt: row.endedAt,
  } as unknown as Contract;

  return ok(contract);
};
