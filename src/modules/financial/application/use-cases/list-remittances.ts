import type { Result } from '../../../../shared/primitives/result.ts';
import type { Remittance } from '../../domain/remittance/types.ts';
import type { RemittanceRepository } from '../ports/remittance-repository.ts';

// #728: lista paginada da tela de acompanhamento de remessa. Orquestração pura — a ordenação
// (`generatedAt` DESC) e o total vivem no repositório; aqui só se encaminha o Result.
export type ListRemittancesDeps = Readonly<{
  remittances: Pick<RemittanceRepository, 'listPaged'>;
}>;

export type ListRemittancesInput = Readonly<{ limit: number; offset: number }>;

export type ListRemittancesOutput = Readonly<{
  items: readonly Remittance[];
  total: number;
}>;

export type ListRemittancesError = 'remittance-repository-unavailable';

export const listRemittances =
  (deps: ListRemittancesDeps) =>
  async (
    input: ListRemittancesInput,
  ): Promise<Result<ListRemittancesOutput, ListRemittancesError>> =>
    deps.remittances.listPaged({ limit: input.limit, offset: input.offset });
