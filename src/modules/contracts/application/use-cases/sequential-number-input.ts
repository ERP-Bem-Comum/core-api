import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import {
  normalizeSequentialNumber,
  parseSequentialNumber,
  sequentialNumberSpellings,
} from '../../domain/contract/sequential-number.ts';
import type { Contract } from '../../domain/contract/types.ts';
import type { ContractEvent } from '../../domain/contract/events.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
} from '../../domain/contract/repository.ts';

// CTR-CONTRACT-SEQUENTIAL-NUMBER (#1024, #1071): número, construção e gravação de um contrato NOVO,
// o mesmo critério para `createContract` (Active) e `createPendingContract` (Pending).
//
//   - informado → normalizado para `NNNN/AAAA` e recusado (409) se alguma grafia já existir, na
//     checagem prévia ou no `UNIQUE` do save;
//   - ausente ou vazio → `nextSequentialNumber(ano do clock)`. Se o save colidir, o número foi tomado
//     por uma criação concorrente com ele DIGITADO; quem deixou o campo vazio não digitou nada, então
//     gera o próximo, até `MAX_GENERATED_NUMBER_ATTEMPTS` vezes.
//
// Formato inválido NÃO é decidido aqui: volta intacto e o `Contract.create*` o recusa (422).

export type SequentialNumberError =
  | 'contract-sequential-number-duplicated'
  | 'contract-sequential-number-generation-exhausted'
  | ContractRepositoryError;

/**
 * Tentativas de gravar com número gerado antes de desistir. Cada colisão exige uma criação
 * concorrente com o número DIGITADO, commitando na janela entre a geração e o save — três seguidas é
 * contenção, não azar, e a resposta certa é parar (503) em vez de queimar o contador.
 */
export const MAX_GENERATED_NUMBER_ATTEMPTS = 3;

type Deps = Readonly<{
  contractRepo: ContractRepository;
  clock: Clock;
}>;

type Creation = Readonly<{ contract: Contract; event: ContractEvent }>;

type Build<O extends Creation, E> = (sequentialNumber: string) => Result<O, E>;

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

const createWithTypedNumber = async <O extends Creation, E>(
  deps: Deps,
  sequentialNumber: string,
  build: Build<O, E>,
): Promise<Result<O, E | SequentialNumberError>> => {
  // Unicidade (R4) antes do save; o `UNIQUE(sequential_number)` é a rede para a corrida.
  const taken = await isTaken(deps.contractRepo, sequentialNumber);
  if (!taken.ok) return taken;
  if (taken.value) return err('contract-sequential-number-duplicated');

  const built = build(sequentialNumber);
  if (!built.ok) return built;
  const saved = await deps.contractRepo.save(built.value.contract, [built.value.event]);
  if (saved.ok) return ok(built.value);
  // Duas criações com o mesmo número passam juntas pela checagem prévia; a perdedora bate no UNIQUE.
  // Para quem digitou, é número repetido — o mesmo 409 da checagem prévia.
  return err(
    saved.error === 'contract-repo-conflict'
      ? 'contract-sequential-number-duplicated'
      : saved.error,
  );
};

const createWithGeneratedNumber = async <O extends Creation, E>(
  deps: Deps,
  year: number,
  build: Build<O, E>,
  attempt: number,
): Promise<Result<O, E | SequentialNumberError>> => {
  if (attempt > MAX_GENERATED_NUMBER_ATTEMPTS) {
    return err('contract-sequential-number-generation-exhausted');
  }
  const next = await deps.contractRepo.nextSequentialNumber(year);
  if (!next.ok) return next;

  // Sem checagem prévia: o gerador já pulou os ocupados sob o lock do contador, e o que ele não viu
  // só o UNIQUE vê. `contract-repo-conflict` é exclusivo do índice de `sequential_number`
  // (`isSequentialNumberDup` no adapter Drizzle); qualquer outra falha sai como veio.
  const built = build(next.value);
  if (!built.ok) return built;
  const saved = await deps.contractRepo.save(built.value.contract, [built.value.event]);
  if (saved.ok) return ok(built.value);
  if (saved.error !== 'contract-repo-conflict') return err(saved.error);
  return createWithGeneratedNumber(deps, year, build, attempt + 1);
};

/**
 * Resolve o número do contrato novo, constrói com `build` e grava. `build` é a construção PURA do
 * agregado (validação + `Contract.create*`) — é chamada de novo a cada número gerado, porque o número
 * faz parte do agregado e do evento.
 */
export const createWithSequentialNumber = async <O extends Creation, E>(
  deps: Deps,
  requested: string | undefined,
  build: Build<O, E>,
): Promise<Result<O, E | SequentialNumberError>> => {
  const trimmed = requested?.trim() ?? '';
  return trimmed === ''
    ? createWithGeneratedNumber(deps, deps.clock.now().getFullYear(), build, 1)
    : createWithTypedNumber(deps, normalizeSequentialNumber(trimmed), build);
};
