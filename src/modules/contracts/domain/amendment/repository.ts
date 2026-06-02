import type { Result } from '../../../../shared/primitives/result.ts';
import type { AmendmentId, ContractId } from '../shared/ids.ts';
import type { Amendment } from './types.ts';
import type { OutboxAppendError } from '../../application/ports/outbox.ts';
import type { ContractsModuleEvent } from '../../application/ports/event-bus.ts';

// Port do repositório de Amendment — posicionado em domain/ pelo Critério H2 (§3.H.2 DO H§34):
// este port é ditado pelo ciclo-de-vida do agregado Amendment.

// CA-2 (CTR-OUTBOX-INTEGRATION-IN-REPOS): OutboxAppendError integra o union de erros.
export type AmendmentRepositoryError =
  | 'amendment-repo-unavailable'
  | 'amendment-repo-conflict'
  | OutboxAppendError;

export type AmendmentRepository = Readonly<{
  findById: (id: AmendmentId) => Promise<Result<Amendment | null, AmendmentRepositoryError>>;
  // Leitura agregada (CTR-HTTP-CONTRACT-DETAIL-CHILDREN-FILES): todos os aditivos de um
  // contrato, ordenados por `amendmentNumber` asc. Read-only; não toca o agregado nem o
  // ciclo de escrita. Usado pela composição de detalhe na borda HTTP (ADR-0032).
  findByContractId: (
    contractId: ContractId,
  ) => Promise<Result<readonly Amendment[], AmendmentRepositoryError>>;
  // CA-2: 2º argumento `events` — adapter persiste state + outbox atomicamente (D2).
  save: (
    amendment: Amendment,
    events: readonly ContractsModuleEvent[],
  ) => Promise<Result<void, AmendmentRepositoryError>>;
}>;
