// Erros do agregado Document — string literal union EN kebab-case (.claude/rules/domain.md).
// Cresce conforme as stories (aprovação, cancelamento, etc.).
export type DocumentError =
  | 'net-value-not-positive'
  | 'retention-not-allowed-for-type'
  | 'document-incomplete'
  | 'invalid-state-transition';
