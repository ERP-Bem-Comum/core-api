// Erros do agregado Document — string literal union EN kebab-case (.claude/rules/domain.md).
// Cresce conforme as stories (aprovação, cancelamento, etc.).
export type DocumentError =
  | 'net-value-not-positive'
  | 'retention-not-allowed-for-type'
  | 'document-incomplete'
  | 'invalid-state-transition'
  // #223: baixa manual por título.
  | 'payable-not-found'
  | 'payable-not-approved'
  // #115: chave de acesso da DANFE.
  | 'invalid-access-key'
  | 'access-key-required-for-danfe'
  // #197: competência contábil.
  | 'invalid-competencia';
