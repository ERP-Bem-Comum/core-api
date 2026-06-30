import { type Result, ok } from '../../../../../shared/primitives/result.ts';
import type { ProgramsReadPort } from '#src/modules/programs/public-api/index.ts';
import type {
  ProgramReadError,
  ProgramReadPort,
  ProgramView,
} from '../../../application/ports/program-read.ts';

// Adapta a public-api de programs (ADR-0006) → ProgramReadPort do financeiro: lista todos os
// programas e projeta `{id,name}` (descarta sigla/programNumber, que o select não usa). O erro de
// infra (`program-read-unavailable`) é o mesmo slug nos dois lados → repassado direto.
export const createProgramsApiReadStore = (programsRead: ProgramsReadPort): ProgramReadPort => ({
  list: async (): Promise<Result<readonly ProgramView[], ProgramReadError>> => {
    const r = await programsRead.listAll();
    if (!r.ok) return r;
    return ok(r.value.map((p) => ({ id: p.id, name: p.name })));
  },
});
