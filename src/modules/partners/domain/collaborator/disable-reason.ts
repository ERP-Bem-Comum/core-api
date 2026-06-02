import { type Result, ok, err } from '#src/shared/primitives/result.ts';

// Motivo de desligamento (soft-delete). ADR-0031 §D2: códigos legados LITERAIS
// (database.dbml Enum disable_by). Rótulo PT-BR no formatter da CLI, não aqui.

export type DisableReason =
  | 'DESLIGAMENTO_ABC'
  | 'FALECIMENTO'
  | 'TEMPO_CONTRATO_FINALIZADO'
  | 'SOLICITACAO_RESCISAO_CONTRATUAL';
export type DisableReasonError = 'invalid-disable-reason';

const VALUES: ReadonlySet<string> = new Set<DisableReason>([
  'DESLIGAMENTO_ABC',
  'FALECIMENTO',
  'TEMPO_CONTRATO_FINALIZADO',
  'SOLICITACAO_RESCISAO_CONTRATUAL',
]);

export const parse = (raw: string): Result<DisableReason, DisableReasonError> =>
  VALUES.has(raw) ? ok(raw as DisableReason) : err('invalid-disable-reason');
