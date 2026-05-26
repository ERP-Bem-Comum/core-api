// CTR-DOMAIN-TAGGED-ERRORS — atualização do formatter.
//
// O dicionário precisa lidar com duas formas de erro que coexistem:
//
//   1. **Tagged record** (`{ tag: 'PascalCase', ...payload? }`) — saída dos
//      novos `ContractError`/`AmendmentError` do domínio (Padrão D, DO D§22).
//
//   2. **String literal** — saída de:
//        - VOs folha (`'money-non-integer-value'`, `'period-end-before-start'`,
//          `'contract-id-invalid'`).
//        - Use cases (`'contract-not-found'`, `'amendment-contract-mismatch'`).
//        - Mappers de persistência (`'contract-mapper-invalid-money'`).
//        - Repos (`'contract-repo-unavailable'`).
//        - State file (`'state-file-corrupted'`).
//        - CLI flag parsing (`'cli-driver-unknown'`).
//
// `formatErrorCode` aceita ambos: se for objeto com `tag` string, mapeia pelo
// tag; senão, mapeia pelo próprio code string.

const ERROR_DICTIONARY: Readonly<Record<string, string>> = {
  // ─── ContractError — string literal antigo (compat retrô) ─────────────────
  // Mantido para qualquer caller herdado que ainda usa o formato pré-D22.
  'contract-sequential-number-required': 'Número sequencial é obrigatório.',
  'contract-title-required': 'Título é obrigatório.',
  'contract-objective-required': 'Objetivo é obrigatório.',
  'contract-invalid-signed-at': 'Data de assinatura inválida.',
  'contract-invalid-event-date': 'Data do evento inválida.',
  'contract-not-active': 'Contrato já está encerrado — não aceita aditivos.',
  'contract-cannot-expire-yet': 'Contrato ainda não pode expirar (data fim não chegou).',
  'contract-cannot-expire-indefinite-period':
    'Contrato com vigência indefinida só pode ser distratado, não expirado.',
  'contract-cannot-extend-indefinite-period':
    'Contrato com vigência indefinida não pode ter prazo estendido.',
  'contract-value-would-go-negative':
    'Supressão excede o valor vigente — resultado ficaria negativo.',
  'contract-period-extension-not-after-current-end': 'Nova data fim precisa ser posterior à atual.',
  'contract-amendment-already-applied': 'Este aditivo já foi aplicado ao contrato.',
  'contract-original-value-zero': 'Valor original do contrato não pode ser zero.',
  // ─── ContractError — tagged PascalCase (CTR-DOMAIN-TAGGED-ERRORS) ─────────
  ContractSequentialNumberRequired: 'Número sequencial é obrigatório.',
  ContractSequentialNumberInvalidFormat:
    'Número sequencial inválido. Formato esperado: XXX/AAAA (ex.: 001/2026).',
  ContractTitleRequired: 'Título é obrigatório.',
  ContractObjectiveRequired: 'Objetivo é obrigatório.',
  ContractInvalidSignedAt: 'Data de assinatura inválida.',
  ContractOriginalValueZero: 'Valor original do contrato não pode ser zero.',
  ContractInvalidEventDate: 'Data do evento inválida.',
  ContractNotActive: 'Contrato já está encerrado — não aceita aditivos.',
  ContractCannotExpireYet: 'Contrato ainda não pode expirar (data fim não chegou).',
  ContractCannotExpireIndefinitePeriod:
    'Contrato com vigência indefinida só pode ser distratado, não expirado.',
  ContractCannotExtendIndefinitePeriod:
    'Contrato com vigência indefinida não pode ter prazo estendido.',
  ContractValueWouldGoNegative: 'Supressão excede o valor vigente — resultado ficaria negativo.',
  ContractPeriodExtensionNotAfterCurrentEnd: 'Nova data fim precisa ser posterior à atual.',
  ContractAmendmentAlreadyApplied: 'Este aditivo já foi aplicado ao contrato.',
  // ─── AmendmentError — string literal antigo (compat retrô) ────────────────
  'amendment-number-required': 'Número do aditivo é obrigatório.',
  'amendment-description-required': 'Descrição do aditivo é obrigatória.',
  'amendment-invalid-created-at': 'Data de criação do aditivo inválida.',
  'amendment-invalid-new-end-date': 'Nova data fim do aditivo inválida.',
  'amendment-impact-value-zero': 'Valor de impacto não pode ser zero.',
  'amendment-invalid-event-date': 'Data do evento inválida.',
  'amendment-not-pending': 'Aditivo não está em estado Pendente.',
  'amendment-document-already-attached': 'Documento assinado já foi anexado a este aditivo.',
  'amendment-without-signed-document':
    'Aditivo precisa ter documento assinado anexado para ser homologado.',
  'amendment-suppression-exceeds-current-value':
    'Supressão excede o valor vigente do contrato — não é possível criar este aditivo.',
  // ─── AmendmentError — tagged PascalCase (CTR-DOMAIN-TAGGED-ERRORS) ────────
  AmendmentNumberRequired: 'Número do aditivo é obrigatório.',
  AmendmentDescriptionRequired: 'Descrição do aditivo é obrigatória.',
  AmendmentInvalidCreatedAt: 'Data de criação do aditivo inválida.',
  AmendmentInvalidNewEndDate: 'Nova data fim do aditivo inválida.',
  AmendmentImpactValueZero: 'Valor de impacto não pode ser zero.',
  AmendmentInvalidEventDate: 'Data do evento inválida.',
  AmendmentNotPending: 'Aditivo não está em estado Pendente.',
  AmendmentDocumentAlreadyAttached: 'Documento assinado já foi anexado a este aditivo.',
  AmendmentWithoutSignedDocument:
    'Aditivo precisa ter documento assinado anexado para ser homologado.',
  // ─── MoneyError ───────────────────────────────────────────────────────────
  'money-negative-value': 'Valor monetário não pode ser negativo.',
  'money-exceeds-safe-integer':
    'Valor monetário excede o limite seguro de precisão (acima de Number.MAX_SAFE_INTEGER centavos).',
  // Defeito #6 — formato XXX/AAAA
  'contract-sequential-number-invalid-format':
    'Número sequencial inválido. Formato esperado: XXX/AAAA (ex.: 001/2026).',
  // Defeito #5 — unicidade
  'contract-sequential-number-duplicated': 'Já existe um contrato com este número sequencial.',
  // Defeito #12 — boundary I/O do state
  'state-file-not-readable':
    'Não foi possível ler o arquivo de estado (verifique permissões ou se o caminho aponta para um diretório).',
  'state-file-corrupted':
    'Arquivo de estado corrompido (JSON inválido). Restaure de um backup ou rode com --no-state.',
  'state-schema-invalid':
    'Arquivo de estado tem schema inválido (faltando contracts/amendments como arrays).',
  'state-entity-invalid':
    'Arquivo de estado contém entidade com schema inválido (status fora do enum, UUID inválido, valor negativo, etc.). Restaure de um backup ou rode com --no-state.',
  'state-concurrent-lock':
    'Outro processo está gravando o mesmo arquivo de estado. Tente novamente em alguns segundos ou rode com --no-state.',
  'state-file-not-writable':
    'Não foi possível escrever o arquivo de estado (verifique permissões ou se o diretório pai existe).',
  'money-non-integer-value': 'Valor monetário precisa ser número inteiro de centavos.',
  'money-negative-result': 'A operação resultaria em valor negativo.',
  // PeriodError
  'period-invalid-start-date': 'Data início inválida.',
  'period-invalid-end-date': 'Data fim inválida.',
  'period-end-before-start': 'A data fim é anterior à data início.',
  // ID errors
  'contract-id-invalid': 'ID de contrato inválido (formato UUID v4 esperado).',
  'amendment-id-invalid': 'ID de aditivo inválido (formato UUID v4 esperado).',
  'document-id-invalid': 'ID de documento inválido (formato UUID v4 esperado).',
  'user-ref-invalid': 'ID de usuário inválido (formato UUID v4 esperado).',
  // Use case errors
  'contract-not-found': 'Contrato não encontrado.',
  'amendment-not-found': 'Aditivo não encontrado.',
  'amendment-contract-mismatch': 'Aditivo pertence a outro contrato — verifique os IDs.',
  'amendment-retroactive-to-contract-start':
    'Aditivo tem data anterior à assinatura do contrato — não pode ser homologado (R4, cronologia).',
  'create-contract-invalid-signed-at': 'Data de assinatura inválida.',
  'create-contract-invalid-period-start': 'Data início inválida.',
  'create-contract-invalid-period-end': 'Data fim inválida.',
  'create-amendment-invalid-new-end-date': 'Nova data fim inválida.',
  // Repo/EventBus errors
  'contract-repo-unavailable': 'Repositório de contratos indisponível.',
  'contract-repo-conflict': 'Conflito ao salvar contrato (concorrência).',
  'amendment-repo-unavailable': 'Repositório de aditivos indisponível.',
  'amendment-repo-conflict': 'Conflito ao salvar aditivo (concorrência).',
  'event-bus-unavailable': 'Barramento de eventos indisponível.',
  // Driver flag parsing (CTR-CLI-DRIVER-FLAG)
  'cli-driver-unknown': 'Driver desconhecido. Use: memory ou mysql.',
  'cli-driver-flag-conflict':
    'Flags incompatíveis. Regras: --state e --no-state só valem com --driver memory; --connection-string só vale com --driver mysql. Use apenas uma flag de cada par.',
  'cli-driver-missing-value': 'Flag requer valor (ex.: --driver mysql, --connection-string <url>).',
  'cli-flag-duplicated': 'Flag duplicada — esta flag foi informada mais de uma vez.',
  'cli-flag-unknown': 'Flag desconhecida.',
  'cli-flag-position-invalid':
    'Ordem inválida: flag global (--driver, --state, --no-state, --connection-string) não pode vir antes do subcomando. Use: contratos-cli <subcomando> [flags].',
  // MySQL driver (CTR-DB-DRIVER-MYSQL #4)
  'mysql-driver-connection-string-invalid':
    'Connection string MySQL inválida. Formato esperado: mysql://user:pass@host:port/database',
  'mysql-driver-connect-failed':
    'Não foi possível conectar ao MySQL. Verifique credenciais, host e que o servidor está rodando.',
  'mysql-driver-migrate-failed':
    'Falha ao aplicar migration MySQL. Confira o estado do schema e os logs do drizzle-orm/mysql2/migrator.',
};

// CTR-DOMAIN-TAGGED-ERRORS — input alargado para aceitar tanto string literal
// (use cases, mappers, repos, VOs folha) quanto tagged record do domínio
// (`{ tag: 'PascalCase', ...payload }`).
type ErrorCode = string | Readonly<{ tag: string }>;

const isTagged = (e: ErrorCode): e is Readonly<{ tag: string }> =>
  typeof e === 'object' && typeof e.tag === 'string';

export const formatErrorCode = (code: ErrorCode): string => {
  const lookupKey = isTagged(code) ? code.tag : code;
  const known = ERROR_DICTIONARY[lookupKey];
  if (known !== undefined) return known;
  return `Erro desconhecido (código interno: ${lookupKey}).`;
};
