import type { Result } from '../../../../shared/primitives/result.ts';
import type { ProgramRef } from '../../domain/shared/refs.ts';

// ACL/projeção mínima do módulo programs (Vernon p.158 — mesmo padrão do
// AuthUserReadPort #207): o budget-plans só enxerga o snapshot plano, nunca o
// agregado Program. Adapter real embrulha buildProgramsReadPort (public-api).

export type ProgramSnapshot = Readonly<{
  ref: string;
  name: string;
  abbreviation: string;
  active: boolean;
}>;

export type ProgramCatalogError = 'program-catalog-unavailable';

export type ProgramCatalogPort = Readonly<{
  getByRef: (ref: ProgramRef) => Promise<Result<ProgramSnapshot | null, ProgramCatalogError>>;
  listActive: () => Promise<Result<readonly ProgramSnapshot[], ProgramCatalogError>>;
}>;
