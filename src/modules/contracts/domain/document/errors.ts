/**
 * Errors do agregado ContractDocument.
 *
 * String literal union — segue padrão de Contract/Amendment (sem class de
 * Error). Errors sao valores, nao excecoes.
 *
 * ASCII puro.
 */

export type ContractDocumentError =
  | 'document-invalid-file-name'
  | 'document-empty-mime-type'
  | 'document-negative-size'
  | 'document-invalid-hash-sha256'
  | 'document-invalid-version'
  | 'document-retention-before-upload'
  // CTR-DOCUMENT-LIFECYCLE-DELETE: erros de exclusao logica.
  | 'document-empty-delete-reason'
  | 'document-delete-reason-too-long'
  | 'document-delete-before-upload'
  // CTR-DOCUMENT-LIFECYCLE-SUBSTITUTE: erros de substituicao.
  | 'document-supersede-self'
  | 'document-supersede-before-upload';
