export type AmendmentError =
  | 'amendment-number-required'
  | 'amendment-description-required'
  | 'amendment-invalid-created-at'
  | 'amendment-invalid-new-end-date'
  | 'amendment-impact-value-zero'
  | 'amendment-invalid-event-date'
  | 'amendment-not-pending'
  | 'amendment-document-already-attached'
  | 'amendment-without-signed-document';
