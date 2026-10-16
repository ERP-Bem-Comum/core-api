import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import {
  normalizeSequentialNumber,
  parseSequentialNumber,
  sequentialNumberSpellings,
} from '../../domain/contract/sequential-number.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
} from '../../domain/contract/repository.ts';

// CTR-CONTRACT-SEQUENTIAL-NUMBER (#1024): decide o número de um contrato NOVO, o mesmo critério
// para `createContract` (Active) e `createPendingContract` (Pending).
//
//   - ausente ou vazio → `nextSequentialNumber(ano do clock)`, que pula os números já ocupados;
//   - informado → normalizado para `NNNN/AAAA` e recusado se alguma grafia dele já existir.
//
// Formato inválido NÃO é decidido aqui: volta intacto e o `Contract.create*` o recusa (422).

export type PickSequentialNumberError =
  | 'contract-sequential-number-duplicated'
  | ContractRepositoryError;

type Deps = Readonly<{
  contractRepo: ContractRepository;
  clock: Clock;
}>;

const isTaken = async (
  repo: ContractRepository,
  sequentialNumber: string,
): Promise<Result<boolean, ContractRepositoryError>> => {
  const parsed = parseSequentialNumber(sequentialNumber);
  const spellings =
    parsed === null ? [sequentialNumber] : sequentialNumberSpellings(parsed.seq, parsed.year);
  for (const spelling of spellings) {
    const found = await repo.findBySequentialNumber(spelling);
    if (!found.ok) return found;
    if (found.value !== null) return ok(true);
  }
  return ok(false);
};

export const pickSequentialNumber = async (
  deps: Deps,
  requested: string | undefined,
): Promise<Result<string, PickSequentialNumberError>> => {
  const trimmed = requested?.trim() ?? '';
  const resolved =
    trimmed === ''
      ? await deps.contractRepo.nextSequentialNumber(deps.clock.now().getFullYear())
      : ok(normalizeSequentialNumber(trimmed));
  if (!resolved.ok) return resolved;
  const sequentialNumber = resolved.value;

  // Unicidade (R4) antes do save; o `UNIQUE(sequential_number)` é a rede para a corrida, e o
  // `contract-repo-conflict` que ela produz é traduzido pelo caller (ver `fromSaveError`).
  const taken = await isTaken(deps.contractRepo, sequentialNumber);
  if (!taken.ok) return taken;
  if (taken.value) return err('contract-sequential-number-duplicated');
  return ok(sequentialNumber);
};

/**
 * Duas criações com o mesmo número passam juntas pela checagem prévia; a perdedora bate no
 * `UNIQUE(sequential_number)` e o repositório devolve `contract-repo-conflict`. Para quem criou,
 * isso é número repetido — o mesmo 409 da checagem prévia, não um conflito genérico.
 */
export const fromSaveError = <E extends ContractRepositoryError>(
  e: E,
): E | 'contract-sequential-number-duplicated' =>
  e === 'contract-repo-conflict' ? 'contract-sequential-number-duplicated' : e;
