import {
  KERNEL_PUBLIC_MESSAGES,
  type ErrorCodeOf,
  type UseCaseErrorOf,
} from '#src/shared/http/public-message.ts';
import type { ContractsHttpDeps } from './composition.ts';

/**
 * Erro que o plugin HTTP do contracts devolve: os dos seus use cases e os dois que o próprio plugin
 * emite, `'document-magic-bytes-mismatch'` e `'document-contract-mismatch'`.
 */
export type ContractsHttpError =
  | UseCaseErrorOf<ContractsHttpDeps>
  | 'document-magic-bytes-mismatch'
  | 'document-contract-mismatch';

/** Código de cada {@link ContractsHttpError}: a string literal ou o `tag` da variante registro. */
export type ContractsErrorCode = ErrorCodeOf<ContractsHttpError>;

/** Frase PT-BR de cada {@link ContractsErrorCode}, exibida no `message` do envelope de erro. */
export const CONTRACTS_PUBLIC_MESSAGES = {
  ...KERNEL_PUBLIC_MESSAGES,
  'contract-id-invalid': 'Identificador de contrato inválido.',
  'amendment-id-invalid': 'Identificador de aditivo inválido.',
  'document-id-invalid': 'Identificador de documento inválido.',
  'contractor-id-empty': 'Informe o contratado.',
  'contractor-id-invalid': 'Identificador de contratado inválido.',
  'contractor-type-unknown': 'Tipo de contratado desconhecido.',
  'contract-not-found': 'Contrato não encontrado.',
  'amendment-not-found': 'Aditivo não encontrado.',
  'document-not-found': 'Documento não encontrado.',
  'document-not-owned': 'Documento não encontrado.',
  'parent-not-found': 'O contrato ou aditivo do documento não foi encontrado.',
  'signed-document-not-found': 'Documento assinado não encontrado.',
  'supersede-target-not-found': 'O documento a substituir não foi encontrado.',
  'storage-not-found': 'O arquivo do documento não foi encontrado no armazenamento.',
  'contract-not-pending': 'O contrato não está pendente.',
  'contract-sequential-number-duplicated': 'Já existe um contrato com este número.',
  'contract-repo-conflict':
    'O contrato foi modificado por outra operação. Atualize e tente novamente.',
  'amendment-repo-conflict':
    'O aditivo foi modificado por outra operação. Atualize e tente novamente.',
  'amendment-contract-mismatch': 'O aditivo informado não pertence a este contrato.',
  'document-contract-mismatch': 'O documento informado não pertence a este contrato.',
  'amendment-retroactive-to-contract-start': 'O aditivo não pode retroagir ao início do contrato.',
  'amendment-suppression-exceeds-current-value':
    'A supressão do aditivo é maior que o valor vigente do contrato.',
  'activate-contract-no-signed-document': 'Anexe o documento assinado antes de ativar o contrato.',
  'activate-contract-invalid-signed-at': 'Data de assinatura inválida para ativar o contrato.',
  'create-contract-invalid-signed-at': 'Data de assinatura do contrato inválida.',
  'create-contract-invalid-period-start': 'Data de início da vigência inválida.',
  'create-contract-invalid-period-end': 'Data de término da vigência inválida.',
  'create-amendment-cannot-extend-indefinite':
    'Não é possível prorrogar um contrato de vigência indeterminada.',
  'create-amendment-invalid-new-end-date': 'Nova data de término do aditivo inválida.',
  'create-amendment-term-change-not-extending':
    'A alteração de prazo precisa estender o término atual do contrato.',
  'terminate-invalid-date': 'Data de encerramento inválida.',
  'terminate-no-signed-document': 'Anexe o documento assinado antes de encerrar o contrato.',
  'period-end-before-start': 'A data de término não pode ser anterior à de início.',
  'period-zero-duration': 'A vigência precisa ter ao menos um dia.',
  'contract-repo-unavailable': 'Erro ao consultar os contratos. Tente novamente.',
  'contract-sequential-number-generation-exhausted':
    'Não foi possível gerar o número do contrato agora. Tente novamente.',
  'amendment-repo-unavailable': 'Erro ao consultar os aditivos. Tente novamente.',
  'document-repository-unavailable': 'Erro ao consultar os documentos. Tente novamente.',
  'timeline-repo-unavailable': 'Erro ao consultar o histórico do contrato. Tente novamente.',
  'storage-unavailable': 'O armazenamento de documentos não respondeu. Tente novamente.',
  'storage-upload-failed': 'Falha ao enviar o arquivo ao armazenamento. Tente novamente.',
  'storage-permission-denied': 'O armazenamento recusou o acesso ao arquivo.',
  'storage-integrity-mismatch': 'O arquivo armazenado não confere com o enviado.',
  'storage-invalid-ttl': 'Prazo de validade do link de download inválido.',
  'storage-key-empty': 'Caminho do arquivo no armazenamento inválido.',
  'storage-key-too-long': 'Caminho do arquivo no armazenamento inválido.',
  'storage-key-leading-slash': 'Caminho do arquivo no armazenamento inválido.',
  'storage-key-double-slash': 'Caminho do arquivo no armazenamento inválido.',
  'storage-key-path-traversal': 'Caminho do arquivo no armazenamento inválido.',
  'storage-key-control-chars': 'Caminho do arquivo no armazenamento inválido.',
  'bucket-name-too-short': 'Configuração do armazenamento de documentos inválida.',
  'bucket-name-too-long': 'Configuração do armazenamento de documentos inválida.',
  'bucket-name-invalid-chars': 'Configuração do armazenamento de documentos inválida.',
  'bucket-name-consecutive-dots': 'Configuração do armazenamento de documentos inválida.',
  'bucket-name-ip-address-format': 'Configuração do armazenamento de documentos inválida.',
  'bucket-name-must-start-alphanumeric': 'Configuração do armazenamento de documentos inválida.',
  'bucket-name-must-end-alphanumeric': 'Configuração do armazenamento de documentos inválida.',
  'bucket-name-reserved-prefix': 'Configuração do armazenamento de documentos inválida.',
  'bucket-name-reserved-suffix': 'Configuração do armazenamento de documentos inválida.',
  'document-magic-bytes-mismatch': 'O conteúdo do arquivo não corresponde ao tipo informado.',
  'document-already-deleted': 'Este documento já foi excluído.',
  'document-already-superseded': 'Este documento já foi substituído por uma versão mais nova.',
  'document-supersede-self': 'Um documento não pode substituir a si mesmo.',
  'document-supersede-before-upload':
    'O documento substituto precisa ter sido enviado antes de substituir o anterior.',
  'document-delete-before-upload': 'A exclusão não pode ser anterior ao envio do documento.',
  'document-retention-before-upload': 'A retenção não pode ser anterior ao envio do documento.',
  'document-empty-delete-reason': 'Informe o motivo da exclusão.',
  'document-delete-reason-too-long': 'O motivo da exclusão é longo demais.',
  'document-empty-mime-type': 'Informe o tipo do arquivo.',
  'document-invalid-file-name': 'Nome de arquivo inválido.',
  'document-invalid-hash-sha256': 'O resumo SHA-256 do arquivo é inválido.',
  'document-invalid-version': 'Versão do documento inválida.',
  'document-negative-size': 'O tamanho do arquivo não pode ser negativo.',
  AmendmentDescriptionRequired: 'Informe a descrição do aditivo.',
  AmendmentDocumentAlreadyAttached: 'O aditivo já tem documento assinado anexado.',
  AmendmentImpactValueZero: 'O valor de impacto do aditivo não pode ser zero.',
  AmendmentInvalidCreatedAt: 'Data de criação do aditivo inválida.',
  AmendmentInvalidEventDate: 'Data do evento do aditivo inválida.',
  AmendmentInvalidNewEndDate: 'Nova data de término do aditivo inválida.',
  AmendmentNotPending: 'O aditivo não está pendente.',
  AmendmentNumberRequired: 'Informe o número do aditivo.',
  AmendmentWithoutSignedDocument: 'Anexe o documento assinado antes de homologar o aditivo.',
  ContractAmendmentAlreadyApplied: 'Este aditivo já foi aplicado ao contrato.',
  ContractCannotExpireIndefinitePeriod:
    'Um contrato de vigência indeterminada não expira automaticamente.',
  ContractCannotExpireYet: 'O contrato ainda está dentro da vigência.',
  ContractCannotExtendIndefinitePeriod:
    'Não é possível prorrogar um contrato de vigência indeterminada.',
  ContractClassificationInvalid: 'Classificação do contrato inválida.',
  ContractInvalidEventDate: 'Data do evento do contrato inválida.',
  ContractInvalidSignedAt: 'Data de assinatura do contrato inválida.',
  ContractNotActive: 'O contrato não está em andamento.',
  ContractNotPending: 'Só é possível cancelar um contrato pendente.',
  ContractObjectiveRequired: 'Informe o objeto do contrato.',
  ContractOriginalValueZero: 'O valor original do contrato não pode ser zero.',
  ContractPeriodExtensionNotAfterCurrentEnd:
    'A prorrogação precisa terminar depois do término atual do contrato.',
  ContractSequentialNumberInvalidFormat: 'Número do contrato em formato inválido.',
  ContractSequentialNumberRequired: 'Informe o número do contrato.',
  ContractTitleRequired: 'Informe o título do contrato.',
  ContractValueWouldExceedSafeInteger:
    'O aditivo elevaria o valor vigente do contrato acima do limite monetário permitido.',
  ContractValueWouldGoNegative: 'O aditivo deixaria o valor vigente do contrato negativo.',
  OutboxAppendDuplicateEventId: 'Erro ao registrar a operação. Tente novamente.',
  OutboxAppendSerializationFailed: 'Erro ao registrar a operação.',
  OutboxAppendUnavailable: 'Erro ao registrar a operação. Tente novamente.',
} as const satisfies Readonly<Record<ContractsErrorCode, string>>;
