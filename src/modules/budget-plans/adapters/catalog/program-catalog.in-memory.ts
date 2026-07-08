import { ok } from '../../../../shared/primitives/result.ts';
import type {
  ProgramCatalogPort,
  ProgramSnapshot,
} from '../../application/ports/program-catalog.ts';

export const InMemoryProgramCatalog = (
  programs: readonly ProgramSnapshot[],
): ProgramCatalogPort => ({
  getByRef: async (ref) => ok(programs.find((p) => p.ref === String(ref)) ?? null),
  listActive: async () => ok(programs.filter((p) => p.active)),
});
