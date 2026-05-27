import type { ContractStatus } from '../../domain/contract/types.ts';

// Lookup table substitui `switch + throw unreachable`. Tipagem
// `Record<ContractStatus, string>` força exaustividade em compile-time.
// Labels EN→PT. Realinhamento aos termos exatos da P.O. (Em Andamento/Finalizado/
// Distrato — ADR-0023) fica para o ticket de CLI/ACL; aqui apenas adiciona-se
// `Pending` para o Record cobrir o novo estado.
const STATUS_LABELS: Readonly<Record<ContractStatus, string>> = {
  Pending: 'Pendente',
  Active: 'Ativo',
  Expired: 'Encerrado',
  Terminated: 'Distratado',
};

export const formatStatus = (s: ContractStatus): string => STATUS_LABELS[s];
