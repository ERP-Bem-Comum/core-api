import type { ContractStatus } from '../../domain/contract/types.ts';

// Lookup table substitui `switch + throw unreachable`. Tipagem
// `Record<ContractStatus, string>` força exaustividade em compile-time.
const STATUS_LABELS: Readonly<Record<ContractStatus, string>> = {
  Active: 'Ativo',
  Expired: 'Encerrado',
  Terminated: 'Distratado',
};

export const formatStatus = (s: ContractStatus): string => STATUS_LABELS[s];
