// 009-contract-auto-expire — sweep de expiração automática (Active → Expired).
//
// Busca os contratos elegíveis (Active, vigência Fixed, current_period_end < hoje_BRT) e aplica
// a transição de domínio `Contract.expire` já existente, persistindo estado + evento (ContractEnded
// kind 'Expired') na mesma transação via `save(contract, [event])` (ADR-0015). Idempotente por
// construção: um contrato já expirado deixa de ser elegível. Reusa a regra; não duplica domínio.
//
// Borda D+1 no fuso de Brasília (UTC-3 fixo): o cutoff é a data-corrente em America/Sao_Paulo —
// um contrato é elegível quando seu fim de vigência é ESTRITAMENTE anterior ao "hoje em Brasília".
// O fluxo manual de encerramento (`endContract` / `/end {Expire}`) NÃO é alterado.

import { type Result, ok } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as PlainDate from '../../../../shared/kernel/plain-date.ts';
import { Contract } from '../../domain/contract/contract.ts';
import type { ContractError } from '../../domain/contract/errors.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
} from '../../domain/contract/repository.ts';

// Brasília = UTC-3 fixo (Brasil aboliu o horário de verão em 2019).
const SAO_PAULO_OFFSET_MIN = -180;

export type ExpireDueContractsFailure = Readonly<{
  contractId: string;
  error: ContractError | ContractRepositoryError;
}>;

export type ExpireDueContractsResult = Readonly<{
  scanned: number;
  expired: number;
  failures: readonly ExpireDueContractsFailure[];
}>;

type Deps = Readonly<{ contractRepo: ContractRepository; clock: Clock }>;

export const expireDueContracts =
  (deps: Deps) => async (): Promise<Result<ExpireDueContractsResult, ContractRepositoryError>> => {
    const now = deps.clock.now();
    const cutoff = PlainDate.fromDateAtOffsetMinutes(now, SAO_PAULO_OFFSET_MIN);

    const due = await deps.contractRepo.findExpirable(cutoff);
    if (!due.ok) return due; // falha de query = infra → propaga (o tick loga e tenta no próximo ciclo)

    let expired = 0;
    const failures: ExpireDueContractsFailure[] = [];
    for (const contract of due.value) {
      const transition = Contract.expire(contract, now);
      if (!transition.ok) {
        failures.push({ contractId: String(contract.id), error: transition.error });
        continue;
      }
      const saved = await deps.contractRepo.save(transition.value.contract, [
        transition.value.event,
      ]);
      if (!saved.ok) {
        // Isolamento (FR-007): falha individual não aborta o lote.
        failures.push({ contractId: String(contract.id), error: saved.error });
        continue;
      }
      expired += 1;
    }

    return ok({ scanned: due.value.length, expired, failures });
  };
