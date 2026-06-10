// CTR-NUMBER-PROGRAM — Port de LEITURA (read-only) do programa, consumível cross-módulo
// SÓ pela public-api (ADR-0006/0014). Espelha o `ContractorReadPort` de Parceiros.
//
// Devolve a PROJEÇÃO plana (`ProgramView`) — nunca o agregado interno. BATCH (`getProgramViews`)
// para a coluna "Programa" do grid de Contratos compor sem N+1. ids inexistentes ficam ausentes
// do Map. Erro de infra → `err('program-read-unavailable')` (sem throw cruzando a borda).

import type { Result } from '../../../../shared/primitives/result.ts';

export type ProgramView = Readonly<{
  id: string;
  name: string;
  sigla: string;
  programNumber: number;
}>;

export type ProgramReadError = 'program-read-unavailable';

export type ProgramReadPort = Readonly<{
  getProgramViews: (
    ids: readonly string[],
  ) => Promise<Result<ReadonlyMap<string, ProgramView>, ProgramReadError>>;
}>;
