import type { AmendmentId, ContractId } from '../shared/ids.ts';
import type { Money } from '../../../../shared/kernel/money.ts';
import type { Period } from '../../../../shared/kernel/period.ts';

export type ContractEvent = Readonly<
  | { type: 'ContractCreated'; contractId: ContractId; occurredAt: Date }
  // ADR-0023: transição Pending → Active (contrato passa a vigorar na assinatura).
  | { type: 'ContractActivated'; contractId: ContractId; occurredAt: Date }
  | {
      type: 'ContractStateUpdated';
      contractId: ContractId;
      occurredAt: Date;
      amendmentId: AmendmentId;
      // Snapshot do estado vigente após o ajuste — consumidores (ex.: Contas a Pagar)
      // não precisam fazer fetch adicional ao Contract para descobrir saldo/prazo.
      newCurrentValue: Money;
      newCurrentPeriod: Period;
    }
  | {
      type: 'ContractEnded';
      contractId: ContractId;
      occurredAt: Date;
      kind: 'Expired' | 'Terminated';
    }
>;
