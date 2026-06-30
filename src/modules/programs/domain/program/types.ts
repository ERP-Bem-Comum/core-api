import type { ProgramId } from '../shared/program-id.ts';
import type { Sigla } from './sigla.ts';
import type { ProgramStatus } from './status.ts';

export type Program = Readonly<{
  id: ProgramId;
  // Numero sequencial interno legivel (ordem de criacao). Gerado pela aplicacao no
  // save (MAX+1 sob FOR UPDATE); UNIQUE. Nao e PK nem usado como FK cross-modulo.
  programNumber: number;
  name: string;
  sigla: Sigla;
  director: string | null;
  generalCharacteristics: string | null;
  logoKey: string | null;
  status: ProgramStatus;
  // Optimistic-lock: incrementado a cada escrita; o PUT exige a version esperada.
  version: number;
  createdAt: Date;
  updatedAt: Date;
}>;
