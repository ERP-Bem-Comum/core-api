import { type Result, ok } from '../../../../../shared/primitives/result.ts';
import type {
  ProgramReadError,
  ProgramReadPort,
  ProgramView,
} from '../../../application/ports/program-read.ts';

// Read store in-memory (testes + stub do driver memory): devolve a lista seedada. Read-only.
// No driver mysql a fonte real é `programs/public-api` (program-read.from-programs.ts).
export const createInMemoryProgramReadStore = (
  programs: readonly ProgramView[] = [],
): ProgramReadPort => ({
  list: async (): Promise<Result<readonly ProgramView[], ProgramReadError>> => ok(programs),
});
