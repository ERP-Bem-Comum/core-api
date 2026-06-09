import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { isValidDate } from '../../../../shared/utils/date.ts';
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
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';

// UC-07 (handbook/domain/contratos/03-gestao-contratos-context.md:70-74):
// "Encerrar Contrato — Sistema (chegada da data fim) ou Gestor (distrato).
//  Status → Encerrado ou Distratado. Evento publicado: ContratoEncerrado."
//
// O domínio já expõe as transições refinadas (Contract.expire / Contract.terminate).
// Este use case orquestra: validar → fetch → parseActive → transição → save.
//
// CTR-HTTP-DISTRATO-DOCUMENTO: o distrato (`Terminate`) passa a capturar a **data
// efetiva** (`terminatedAt`) e o **motivo** (`reason`), e exige um documento
// `signed_termination` Active vinculado ao contrato (análogo a `activate` exigir
// `signed_contract`). `endedAt` passa a ser a data efetiva (não mais o clock now),
// validada não-futura contra `clock.now()`. `Expire` segue usando o clock.

export type EndContractKind = 'Expire' | 'Terminate';

// Discriminated command: `Terminate` carrega `terminatedAt` + `reason`; `Expire` não.
export type EndContractCommand = Readonly<
  | { contractId: string; kind: 'Expire' }
  | { contractId: string; kind: 'Terminate'; terminatedAt: string; reason: string }
>;

export type EndContractError =
  | ContractIdError
  | 'contract-not-found'
  // Distrato: data efetiva ausente/malformada ou futura.
  | 'terminate-invalid-date'
  // Distrato: sem documento `signed_termination` Active vinculado.
  | 'terminate-no-signed-document'
  | ContractError
  | ContractRepositoryError
  | DocumentRepositoryError;

export type EndContractOutput = Readonly<{
  contract: ExpiredContract | TerminatedContract;
  event: ContractEvent;
}>;

type Deps = Readonly<{
  contractRepo: ContractRepository;
  documentRepo: DocumentRepository;
  clock: Clock;
}>;

const applyTransition = (
  active: ActiveContract,
  kind: EndContractKind,
  at: Date,
  reason?: string,
): Result<
  { contract: ExpiredContract | TerminatedContract; event: ContractEvent },
  ContractError
> => {
  switch (kind) {
    case 'Expire':
      return Contract.expire(active, at);
    case 'Terminate':
      return Contract.terminate(active, at, reason);
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

    // Distrato: valida data efetiva não-futura + exige documento assinado vinculado.
    // Para `Expire`, a data do evento segue do clock (chegada da data fim, MVP).
    let at = deps.clock.now();
    if (cmd.kind === 'Terminate') {
      const terminatedAt = new Date(cmd.terminatedAt);
      if (!isValidDate(terminatedAt)) return err('terminate-invalid-date');
      // Data efetiva futura é inválida (RN do distrato) — compara com o clock.
      if (terminatedAt.getTime() > deps.clock.now().getTime()) {
        return err('terminate-invalid-date');
      }

      const docs = await deps.documentRepo.findByParent('Contract', idResult.value);
      if (!docs.ok) return docs;
      const hasSignedTermination = docs.value.some(
        (d) => d.categoria === 'signed_termination' && d.status === 'Active',
      );
      if (!hasSignedTermination) return err('terminate-no-signed-document');

      at = terminatedAt;
    }

    const ended = applyTransition(
      active.value,
      cmd.kind,
      at,
      cmd.kind === 'Terminate' ? cmd.reason : undefined,
    );
    if (!ended.ok) return ended;

    // Evento passado no 2º argumento de save — persiste state + outbox atomicamente (ADR-0015).
    const saveResult = await deps.contractRepo.save(ended.value.contract, [ended.value.event]);
    if (!saveResult.ok) return saveResult;

    return ok({ contract: ended.value.contract, event: ended.value.event });
  };
