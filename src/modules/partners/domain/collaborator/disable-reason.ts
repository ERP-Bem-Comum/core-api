import { type Result, ok, err } from '#src/shared/primitives/result.ts';

// Motivo de desligamento (soft-delete). ADR-0031 §D2: códigos legados LITERAIS
// (database.dbml Enum disable_by). Rótulo PT-BR no formatter da CLI, não aqui.
//
// `LEGACY_MIGRATION` NÃO é motivo de negócio — é marcador de PROVENIÊNCIA do ETL one-shot
// (D10): inativos legados sem `disableBy` recebem este valor no backfill, para satisfazer a
// invariante `InactiveCollaborator.disableBy` não-null sem fabricar causa de RH. Consumidores
// de estatística de desligamento devem excluí-lo.

export type DisableReason =
  | 'DESLIGAMENTO_ABC'
  | 'FALECIMENTO'
  | 'TEMPO_CONTRATO_FINALIZADO'
  | 'SOLICITACAO_RESCISAO_CONTRATUAL'
  | 'LEGACY_MIGRATION';
export type DisableReasonError = 'invalid-disable-reason';

const VALUES: ReadonlySet<string> = new Set<DisableReason>([
  'DESLIGAMENTO_ABC',
  'FALECIMENTO',
  'TEMPO_CONTRATO_FINALIZADO',
  'SOLICITACAO_RESCISAO_CONTRATUAL',
  'LEGACY_MIGRATION',
]);

export const parse = (raw: string): Result<DisableReason, DisableReasonError> =>
  VALUES.has(raw) ? ok(raw as DisableReason) : err('invalid-disable-reason');
