/**
 * Mapeamento de erro de domínio do financial → contrato HTTP público (#52, OWASP API8:2023).
 *
 * O slug interno (string-literal union EN kebab-case, ex.: `document-version-conflict`) NUNCA
 * vaza no body 4xx: vira um `code` público estável e uma `message` PT-BR ao humano. O slug fica
 * só no log do servidor (responsabilidade do caller). 5xx é ocultado pelo caller como `internal`.
 */

const NOT_FOUND_CODES: ReadonlySet<string> = new Set([
  'document-not-found',
  'timeline-document-not-found',
  'bank-statement-not-found',
  // Conciliação (US2/3/4).
  'statement-transaction-not-found',
  'reconciliation-not-found',
  'cedente-account-not-found',
  'payable-not-found',
]);

const CONFLICT_CODES: ReadonlySet<string> = new Set([
  'invalid-state-transition',
  'document-version-conflict',
  // Conciliação: pré-condições de estado.
  'transaction-already-reconciled',
  'reconciliation-already-undone',
  'account-closed',
]);

const BAD_REQUEST_CODES: ReadonlySet<string> = new Set([
  'financial-ref-invalid',
  'partner-ref-invalid',
  'document-id-invalid',
  'user-ref-invalid',
  // Importação de extrato (US1): formato/conteúdo inválido vindo do parser.
  'malformed-statement',
  'unsupported-format',
  'empty-content',
  // Conciliação: id malformado.
  'reconciliation-id-invalid',
]);

const UNAVAILABLE_CODES: ReadonlySet<string> = new Set([
  'document-repository-failure',
  'timeline-repository-failure',
  'outbox-append-failed',
  'bank-statement-repository-failure',
  // Conciliação.
  'reconciliation-repository-failure',
  'payable-view-failure',
  'cedente-account-store-unavailable',
  // Match/sugestão (US2).
  'suggestion-view-failure',
  'rejected-suggestion-repository-failure',
]);

/** Status HTTP para um slug interno de erro. Default 422 (regra de negócio inválida). */
export const writeErrorStatus = (code: string): number => {
  if (NOT_FOUND_CODES.has(code)) return 404;
  if (CONFLICT_CODES.has(code)) return 409;
  if (BAD_REQUEST_CODES.has(code)) return 400;
  if (UNAVAILABLE_CODES.has(code)) return 503;
  return 422;
};

export type PublicErrorCode =
  | 'not-found'
  | 'conflict'
  | 'bad-request'
  | 'unprocessable'
  | 'internal';

/** Colapsa o slug interno num `code` público estável (não revela o mecanismo interno). */
export const toPublicCode = (code: string): PublicErrorCode => {
  if (UNAVAILABLE_CODES.has(code)) return 'internal';
  if (NOT_FOUND_CODES.has(code)) return 'not-found';
  if (CONFLICT_CODES.has(code)) return 'conflict';
  if (BAD_REQUEST_CODES.has(code)) return 'bad-request';
  return 'unprocessable';
};

const PUBLIC_FALLBACK: Record<PublicErrorCode, string> = {
  'not-found': 'Recurso não encontrado.',
  conflict: 'A operação conflita com o estado atual do recurso.',
  'bad-request': 'Requisição inválida.',
  unprocessable: 'Não foi possível processar a requisição.',
  internal: 'Ocorreu um erro interno.',
};

const SLUG_MESSAGES: Record<string, string> = {
  'document-not-found': 'Documento não encontrado.',
  'timeline-document-not-found': 'Documento não encontrado.',
  'document-version-conflict':
    'O documento foi modificado por outra operação. Atualize e tente novamente.',
  'invalid-state-transition': 'O documento não está no estado necessário para esta operação.',
  'financial-ref-invalid': 'Referência inválida: o valor informado não é um identificador válido.',
  'partner-ref-invalid': 'Referência de fornecedor inválida.',
  'document-id-invalid': 'Identificador de documento inválido.',
  'document-incomplete':
    'Dados insuficientes: a data de vencimento é obrigatória para documentos em aberto.',
  'net-value-not-positive': 'O valor líquido do documento deve ser positivo.',
  'retention-not-allowed-for-type': 'Retenção não permitida para este tipo de documento.',
  'money-negative-value': 'Valores monetários não podem ser negativos.',
  'money-non-integer-value': 'Valores monetários devem ser inteiros (em centavos).',
  'money-exceeds-safe-integer': 'Valor monetário excede o limite permitido.',
  'money-negative-result': 'O resultado da operação geraria um valor negativo.',
  'retention-type-invalid': 'Tipo de retenção inválido.',
  'retention-rate-invalid': 'Taxa de retenção inválida.',
  'retention-money-invalid': 'Valor monetário de retenção inválido.',
  'registered-tax-type-invalid': 'Tipo de imposto registrado inválido.',
  'registered-tax-rate-invalid': 'Taxa de imposto registrada inválida.',
  'registered-tax-money-invalid': 'Valor monetário de imposto registrado inválido.',
  'user-ref-invalid': 'Identificador de usuário inválido.',
  // Importação de extrato (US1 conciliação).
  'malformed-statement': 'Arquivo de extrato malformado: não foi possível interpretar o conteúdo.',
  'unsupported-format': 'Formato de extrato não suportado (esperado OFX ou CSV).',
  'empty-content': 'O conteúdo do extrato está vazio.',
  'empty-statement': 'O extrato não contém nenhuma transação para importar.',
  'bank-statement-not-found': 'Extrato bancário não encontrado.',
  // Conciliação (US2/3/4).
  'statement-transaction-not-found': 'Transação de extrato não encontrada.',
  'reconciliation-not-found': 'Conciliação não encontrada.',
  'cedente-account-not-found': 'Conta-cedente não encontrada para a transação.',
  'payable-not-found': 'Um ou mais títulos informados não foram encontrados.',
  'transaction-already-reconciled': 'A transação já está conciliada.',
  'reconciliation-already-undone': 'A conciliação já foi desfeita.',
  'account-closed': 'A conta-cedente está encerrada: não é possível conciliar.',
  'title-not-paid': 'Só é possível conciliar títulos no estado Pago.',
  'reconciliation-not-balanced':
    'O fechamento não bate: a soma dos títulos mais a diferença deve igualar o valor da transação.',
  'empty-reconciliation': 'Informe ao menos um título para conciliar.',
  'reconciliation-id-invalid': 'Identificador de conciliação inválido.',
  // Lançamento manual / lote (US5).
  'manual-entry-value-not-positive': 'O valor do lançamento manual deve ser positivo.',
  'empty-batch': 'Informe ao menos uma transação para o lote.',
};

/** Mensagem PT-BR ao humano para um slug; fallback por `code` público. Nunca retorna o slug. */
export const toPublicMessage = (code: string): string =>
  SLUG_MESSAGES[code] ?? PUBLIC_FALLBACK[toPublicCode(code)];
