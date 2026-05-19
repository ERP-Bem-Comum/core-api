import type { Brand } from '../../../../shared/brand.ts';
import type { AmendmentId, ContractId } from '../shared/ids.ts';
import type { Money } from '../shared/money.ts';
import type { Period } from '../shared/period.ts';

export type ContractStatus = 'Active' | 'Expired' | 'Terminated';

type ContractShape = Readonly<{
  id: ContractId;
  sequentialNumber: string;
  title: string;
  objective: string;
  signedAt: Date;
  originalValue: Money;
  originalPeriod: Period;
  currentValue: Money;
  currentPeriod: Period;
  status: ContractStatus;
  homologatedAmendmentIds: readonly AmendmentId[];
  endedAt: Date | null;
}>;

export type Contract = Brand<ContractShape, 'Contract'>;

export type ContractAdjustment = Readonly<
  | { kind: 'ValueIncrease'; amount: Money; amendmentId: AmendmentId }
  | { kind: 'ValueDecrease'; amount: Money; amendmentId: AmendmentId }
  | { kind: 'PeriodExtension'; newEnd: Date; amendmentId: AmendmentId }
  | { kind: 'Acknowledgment'; amendmentId: AmendmentId }
>;

export type CreateContractInput = Readonly<{
  id: ContractId;
  sequentialNumber: string;
  title: string;
  objective: string;
  signedAt: Date;
  originalValue: Money;
  originalPeriod: Period;
}>;
