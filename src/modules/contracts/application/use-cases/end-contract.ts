import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as ContractId from '../../domain/shared/contract-id.ts';
import type { ContractIdError } from '../../domain/shared/contract-id.ts';
import { Contract } from '../../domain/contract/contract.ts';
import type {
  ActiveContract,
  ExpiredContract,
  TerminatedContract,
} from '../../domain/contract/types.ts';
import type { ContractEvent } from '../../domain/contract/events.ts';
import type { ContractError } from '../../domain/contract/errors.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
} from '../../domain/contract/repository.ts';

// UC-07 (handbook/domain/contratos/03-gestao-contratos-context.md:70-74):
// "Encerrar Contrato — Sistema (chegada da data fim) ou Gestor (distrato).
//  Status → Encerrado ou Distratado. Evento publicado: ContratoEncerrado."
//
// O domínio já expõe as transições refinadas (Contract.expire / Contract.terminate).
// Este use case apenas orquestra: validar → fetch → parseActive → transição → save.
// `at` vem do clock (MVP) — sem agendamento automático de expiração por data.

export type EndContractKind = 'Expire' | 'Terminate';

export type EndContractCommand = Readonly<{
  contractId: string;
  kind: EndContractKind;
}>;

export type EndContractError =
  | ContractIdError
  | 'contract-not-found'
  | ContractError
  | ContractRepositoryError;

export type EndContractOutput = Readonly<{
  contract: ExpiredContract | TerminatedContract;
  event: ContractEvent;
}>;

type Deps = Readonly<{
  contractRepo: ContractRepository;
  clock: Clock;
}>;

const applyTransition = (
  active: ActiveContract,
  kind: EndContractKind,
  at: Date,
): Result<
  { contract: ExpiredContract | TerminatedContract; event: ContractEvent },
  ContractError
> => {
  switch (kind) {
    case 'Expire':
      return Contract.expire(active, at);
    case 'Terminate':
      return Contract.terminate(active, at);
  }
};

export const endContract =
  (deps: Deps) =>
  async (cmd: EndContractCommand): Promise<Result<EndContractOutput, EndContractError>> => {
    const idResult = ContractId.rehydrate(cmd.contractId);
    if (!idResult.ok) return idResult;

    const load = await deps.contractRepo.findById(idResult.value);
    if (!load.ok) return load;
    if (load.value === null) return err('contract-not-found');

    const active = Contract.parseActive(load.value);
    if (!active.ok) return active;

    const ended = applyTransition(active.value, cmd.kind, deps.clock.now());
    if (!ended.ok) return ended;

    // Evento passado no 2º argumento de save — persiste state + outbox atomicamente (ADR-0015).
    const saveResult = await deps.contractRepo.save(ended.value.contract, [ended.value.event]);
    if (!saveResult.ok) return saveResult;

    return ok({ contract: ended.value.contract, event: ended.value.event });
  };
