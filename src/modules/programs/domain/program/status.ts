// VO ProgramStatus: conjunto fechado. Transicoes (deactivate/reactivate) vivem no
// agregado (program.ts) e retornam Result. Persistido como varchar(16) + CHECK (ADR-0020).

export type ProgramStatus = 'ATIVO' | 'INATIVO';

export const isActive = (status: ProgramStatus): boolean => status === 'ATIVO';
export const isInactive = (status: ProgramStatus): boolean => status === 'INATIVO';
