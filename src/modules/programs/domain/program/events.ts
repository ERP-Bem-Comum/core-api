import type { ProgramId } from '../shared/program-id.ts';

export type ProgramEvent = Readonly<
  | { type: 'ProgramCreated'; programId: ProgramId; occurredAt: Date }
  | { type: 'ProgramUpdated'; programId: ProgramId; occurredAt: Date }
  | { type: 'ProgramDeactivated'; programId: ProgramId; occurredAt: Date }
  | { type: 'ProgramReactivated'; programId: ProgramId; occurredAt: Date }
>;
