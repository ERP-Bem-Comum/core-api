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
  'payable-not-found',
  // Período (US6).
  'reconciliation-period-not-found',
  // #62/Feature 2: documento sem comprovante-fonte (ou bytes ausentes no storage).
  'source-file-not-found',
  // Acompanhamento de remessa (#728): GET /financial/remittances/:id com id que não existe.
  'remittance-not-found',
  // Download (homologação): a remessa existe no banco, o objeto não está em nenhum prefixo do
  // agente. É 404 e não 500 porque não há defeito nosso — o objeto pode ser de antes do bucket
  // atual, ou ter sido movido para fora do combinado.
  'remittance-file-not-found',
]);

const CONFLICT_CODES: ReadonlySet<string> = new Set([
  'invalid-state-transition',
  'document-version-conflict',
  // O CAS por título não casou — outra escrita alcançou o título primeiro. É conflito de ESTADO,
  // como `document-version-conflict`, e não erro de dado: o mesmo pedido volta a valer se o título
  // retornar à pré-condição esperada.
  //
  // ⚠️ São DOIS slugs porque são duas mensagens ao operador, com ações diferentes — ver
  // `domain/payable/repository.ts`. Colapsá-los de volta num só reintroduz a frase que fala de
  // "baixa" para quem tentou reagendar.
  'payable-payment-conflict',
  'payable-reschedule-conflict',
  // #785 — o bucket contradiz o contrato de prefixos. É 409 e não 404 de propósito: 404 significa
  // "não existe, nada a fazer", e aqui há o que fazer. E não é 5xx porque o envelope esconde o
  // código em 5xx, e este é justamente o código que precisa chegar a quem pediu.
  'remittance-file-prefix-drift',
  // Descarte da remessa (#792, ADR-0065 §4). Os dois são conflito de ESTADO, não dado inválido:
  //
  //  - `requires-failure` — a remessa não está num estado descartável. Cobre a `Transmitted` (o
  //    agente entregou; não há o que devolver) e a `Queued` COM arquivo no bucket — esta última é a
  //    guarda que importa, porque o objeto em `saida/` é um pagamento que o agente ainda pode
  //    transmitir, e devolver o título ali o liberaria para entrar noutra remessa enquanto a
  //    primeira caminha para o banco.
  //  - `requires-reason` — descartar sem motivo registrado. É 409 e não 422 porque o pedido está
  //    bem-formado (o Zod já exigiu a string); o que falta é conteúdo de DECISÃO, e a operação
  //    inteira existe para deixar rastro de quem liberou valor para nova transmissão.
  'remittance-discard-requires-failure',
  'remittance-discard-requires-reason',
  // A remessa que o agente JÁ transmitiu não é descartável nem rebaixável — o desfecho positivo é o
  // mais caro de perder, e a ordem de chegada dos objetos de status não é garantida.
  'remittance-already-transmitted',
  // Conciliação: pré-condições de estado.
  'transaction-already-reconciled',
  'reconciliation-already-undone',
  'account-closed',
  'period-closed',
  // Exclusão de extrato: guarda — extrato com transação conciliada não pode ser excluído (desfaça antes).
  'statement-has-reconciled-transactions',
  // Reabertura (#203): reabrir período não-fechado é conflito de estado.
  'period-not-closed',
  // Contrapartida de transferência (#269/US2): casar uma contrapartida não-pendente é conflito de estado.
  'counterpart-not-pending',
  // Conta-cedente (019): conflitos de estado/unicidade.
  'cedente-account-already-closed',
  'cedente-account-duplicate',
  'cedente-account-bank-data-locked',
  // #722: convênio preenche uma vez. Trocar é conflito com o estado — ele identifica o contrato no
  // banco e viaja no nome de toda remessa já transmitida.
  'cedente-convenio-already-set',
  // Remessa (#720): documento já preso em remessa viva. Incluí-lo de novo pagaria duas vezes — é
  // conflito com o estado atual, não dado inválido.
  'remittance-payables-already-held',
  // Remessa (#736): título não-`Approved` na seleção. É conflito com o estado do documento (ainda
  // não aprovado), não dado malformado — 409, como o contrato original previa.
  'document-not-approved',
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
  // Período (US6): range/id/format inválidos.
  'invalid-period-range',
  'reconciliation-period-id-invalid',
  'unsupported-export-format',
  // Conta-cedente (019): id malformado.
  'cedente-account-id-invalid',
  // #62 ingestão: magic-bytes mentido / entrada vazia.
  'document-magic-bytes-mismatch',
  'empty-input',
  // Acompanhamento de remessa (#728): id malformado no GET /financial/remittances/:id.
  'remittance-id-invalid',
]);

// #62 ingestão: entrada grande demais / bomba de descompressão → 413 Payload Too Large.
const PAYLOAD_TOO_LARGE_CODES: ReadonlySet<string> = new Set([
  'source-too-large',
  'decompression-limit-exceeded',
]);

const UNAVAILABLE_CODES: ReadonlySet<string> = new Set([
  'document-repository-failure',
  // #62 ingestão: falha ao gravar o comprovante no storage.
  'source-file-upload-failed',
  'timeline-repository-failure',
  'outbox-append-failed',
  'bank-statement-repository-failure',
  // Conciliação.
  'reconciliation-repository-failure',
  'payable-view-failure',
  'cedente-account-store-unavailable',
  'cedente-account-history-unavailable',
  // Match/sugestão (US2).
  'suggestion-view-failure',
  'rejected-suggestion-repository-failure',
  // Contrapartida de transferência (#269/US2): store indisponível.
  'expected-counterpart-store-unavailable',
  // Período (US6).
  'reconciliation-period-store-failure',
  // Dados de referência (020): reader indisponível → 503 (contracts/categorization-read.md).
  'category-read-unavailable',
  'cost-center-read-unavailable',
  'program-read-unavailable',
  // Export Nibo (#146): falhas de read-model/view necessários ao enriquecimento.
  'payable-document-view-failure',
  'supplier-view-store-unavailable',
  // Alçada do aprovador (#289 — CA9): leitura do `auth` indisponível.
  'approver-authority-unavailable',
  // Resolução em lote (#357): falha ao ler o JOIN fin_payables × fin_documents × fin_supplier_view.
  'payable-summary-by-ids-view-failure',
  // Remessa (#720): infraestrutura que não respondeu. Nenhum deles é culpa do operador — tentar de
  // novo é a ação certa, e mandá-lo procurar cadastro seria mandá-lo ao lugar errado.
  'remittance-preview-unavailable',
  'remittance-nsa-unavailable',
  'remittance-persist-failed',
  'remittance-upload-failed',
  // Defeito NOSSO de montagem do arquivo: o operador não tem o que corrigir. Fica como 503 e não
  // como 422 justamente para não sugerir que ele conserte algum dado.
  'remittance-file-name-failed',
  'remittance-build-failed',
  'remittance-malformed-file',
  // Download (homologação): o objeto existe mas não é o arquivo emitido. Fica no balde de 503, e não
  // em 404, porque o arquivo ESTÁ lá — o que falhou é a identidade dele, e isso é anomalia do
  // armazenamento, não pedido inválido do operador. Repetir também é a ação certa: se o objeto
  // estava sendo escrito, a próxima leitura confere.
  'remittance-file-corrupted',
  // Acompanhamento de remessa (#728): repositório de leitura indisponível → 503 (tentar de novo é a
  // ação certa; não é culpa do operador).
  'remittance-repository-unavailable',
  // Quarentena do retorno (#753): a tabela não respondeu. Sem esta linha o erro cairia no default
  // 422 — "regra de negócio inválida" —, mandando o operador procurar defeito num dado que está
  // certo, enquanto o problema é o banco.
  'van-quarantine-unavailable',
]);

// NOTA (019): `cedente-account-not-found` NÃO está em NOT_FOUND_CODES de propósito → default 422.
// (1) No CRUD da conta-cedente, o smoke de existência da rota /close usa id ausente e exige ≠404
// (404 fica reservado a rota não-montada). (2) Em confirm/manual-entry é uma referência pendente
// (transação aponta p/ conta inexistente), não "recurso pedido pelo cliente" → 422 é defensável.

/** Status HTTP para um slug interno de erro. Default 422 (regra de negócio inválida). */
export const writeErrorStatus = (code: string): number => {
  if (NOT_FOUND_CODES.has(code)) return 404;
  if (CONFLICT_CODES.has(code)) return 409;
  if (BAD_REQUEST_CODES.has(code)) return 400;
  if (PAYLOAD_TOO_LARGE_CODES.has(code)) return 413;
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
  if (BAD_REQUEST_CODES.has(code) || PAYLOAD_TOO_LARGE_CODES.has(code)) return 'bad-request';
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
  // Remessa (#720). As duas primeiras dizem ao operador o que fazer, e são diferentes de propósito:
  // uma pede correção de cadastro, a outra avisa que o arquivo ainda não emite aquela forma — e não
  // há cadastro que resolva a segunda.
  'remittance-payments-unavailable':
    'Há títulos sem os dados necessários para a remessa. Confira o pré-voo do lote antes de gerar.',
  'remittance-launch-form-unsupported':
    'A remessa inclui título cuja forma de pagamento ainda não é emitida no arquivo. Retire-o da seleção.',
  'remittance-mixed-payment-dates':
    'A seleção mistura vencimentos diferentes. Uma remessa é de um único dia — gere por vencimento.',
  'remittance-payables-already-held':
    'Há título já incluído em outra remessa. Atualize a lista e refaça a seleção.',
  // #736: só título Aprovado entra em remessa. A mensagem diz o que fazer (aprovar), não "erro
  // interno" — e o pré-voo aponta QUAIS títulos estão pendentes.
  'document-not-approved':
    'Há título não aprovado na seleção. Só títulos aprovados podem entrar em remessa — confira o pré-voo.',
  // Acompanhamento de remessa (#728).
  'remittance-not-found': 'Remessa não encontrada.',
  // Descarte (#792, ADR-0065 §4). As mensagens dizem O QUE FAZER, porque o operador tem ação em
  // ambos os casos — e a primeira precisa explicar por que o sistema está recusando algo que parece
  // razoável ("quero cancelar esta remessa que ainda não saiu").
  'remittance-discard-requires-failure':
    'Esta remessa não pode ser descartada agora. O arquivo ainda está no armazenamento da VAN e pode ser transmitido a qualquer momento — descartar liberaria os títulos para outra remessa enquanto o pagamento segue para o banco. Aguarde o desfecho do transporte.',
  'remittance-discard-requires-reason':
    'Informe o motivo do descarte. Descartar devolve os títulos para a fila, e o motivo é o que permite auditar depois por que um pagamento foi refeito.',
  'remittance-already-transmitted':
    'O agente já transmitiu esta remessa — ela não pode ser descartada. Confira o pagamento no site da instituição e, se algum título precisar sair da VAN, use a baixa manual.',
  'remittance-file-not-found':
    'O arquivo desta remessa não está no armazenamento da VAN — provavelmente é uma remessa antiga, já expurgada.',
  'remittance-file-prefix-drift':
    'O arquivo não está nos prefixos do contrato, e o armazenamento tem prefixo fora do combinado com o agente de transporte. A fronteira mudou: consulte o log do servidor, que nomeia o prefixo inesperado.',
  // Mensagem deliberadamente alarmante: hash divergente significa que o objeto NÃO é o que foi
  // enviado ao banco. Servir assim mesmo entregaria evidência falsa numa conferência de pagamento.
  'remittance-file-corrupted':
    'O arquivo encontrado não confere com a remessa emitida (hash divergente). Nada foi entregue — não use este objeto como evidência do que foi enviado.',
  'remittance-id-invalid': 'Identificador de remessa inválido.',
  // #722: campo do CADASTRO da conta, não do título — por isso a mensagem diz onde corrigir. Sem
  // ela, o operador recebia "erro interno" para um dado que ele mesmo preenche.
  'cedente-convenio-missing':
    'A conta bancária selecionada está sem o convênio. Informe-o no cadastro da conta para gerar remessas.',
  'cedente-convenio-malformed':
    'O convênio da conta bancária selecionada não é numérico. Corrija-o no cadastro da conta.',
  // #804. A mensagem diz o limite E o motivo de propósito: acima de 6 posições o banco não recusa
  // o arquivo — ele descarta o excedente e processa a remessa sob outro contrato. Sem essa frase, o
  // operador tende a achar que o sistema é que está sendo restritivo, e procura contornar.
  'cedente-convenio-too-long':
    'O convênio da conta bancária selecionada tem mais de 6 dígitos. O banco lê apenas os 6 primeiros e descartaria o restante, processando a remessa sob outro convênio. Confirme o número junto ao banco e corrija-o no cadastro da conta.',
  'cedente-convenio-already-set':
    'Esta conta já tem convênio. Ele identifica o contrato junto ao banco e não pode ser trocado.',
  'document-not-found': 'Documento não encontrado.',
  'timeline-document-not-found': 'Documento não encontrado.',
  'document-version-conflict':
    'O documento foi modificado por outra operação. Atualize e tente novamente.',
  // As duas frases abaixo existem separadas de propósito: elas terminam em AÇÕES diferentes, e é a
  // ação que o operador precisa ler. Uma mensagem única que servisse às duas não diria o que fazer
  // em nenhuma — foi o que aconteceu enquanto o slug era um só, e quem reagendava lia sobre baixa.
  'payable-payment-conflict':
    'Este título já não estava aprovado quando a baixa foi gravada — outra operação o alterou antes. Atualize e confira se a baixa já foi registrada.',
  'payable-reschedule-conflict':
    'O vencimento deste título foi alterado por outra operação depois que esta tela foi carregada. Atualize e confira o vencimento atual antes de reagendar.',
  'invalid-state-transition': 'O documento não está no estado necessário para esta operação.',
  'financial-ref-invalid': 'Referência inválida: o valor informado não é um identificador válido.',
  'partner-ref-invalid': 'Referência de fornecedor inválida.',
  'document-id-invalid': 'Identificador de documento inválido.',
  'source-file-not-found': 'Documento sem arquivo anexado.',
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
  'cedente-account-not-found': 'Conta-cedente não encontrada.',
  // #293: não se lança pagamento contra conta encerrada.
  'cedente-account-closed': 'A conta-cedente está encerrada e não pode ser usada para pagamento.',
  // Conta-cedente (019 — CRUD).
  'cedente-account-duplicate':
    'Já existe uma conta-cedente com esta chave bancária (banco/agência/conta/dígito).',
  'cedente-account-already-closed': 'A conta-cedente já está encerrada.',
  'cedente-account-bank-data-locked':
    'A conta-cedente já tem histórico: os dados bancários não podem mais ser alterados.',
  'invalid-account-type': 'Tipo de conta inválido (esperado: corrente, poupanca ou investimento).',
  'opening-balance-requires-date': 'Saldo de abertura e data do saldo devem ser informados juntos.',
  'cedente-account-id-invalid': 'Identificador de conta-cedente inválido.',
  'payable-not-found': 'Um ou mais títulos informados não foram encontrados.',
  'paid-at-in-future': 'A data de pagamento não pode ser futura.',
  'invalid-access-key': 'Chave de acesso inválida: informe os 44 dígitos da DANFE.',
  'access-key-required-for-danfe': 'A chave de acesso (44 dígitos) é obrigatória para DANFE.',
  'invalid-competencia': 'Competência inválida: informe o mês no formato AAAA-MM.',
  'transaction-already-reconciled': 'A transação já está conciliada.',
  'reconciliation-already-undone': 'A conciliação já foi desfeita.',
  'account-closed': 'A conta-cedente está encerrada: não é possível conciliar.',
  'account-not-found': 'A conta-cedente informada não existe.',
  'title-not-paid': 'Só é possível conciliar títulos no estado Pago.',
  'reconciliation-not-balanced':
    'O fechamento não bate: a soma dos títulos mais a diferença deve igualar o valor da transação.',
  'difference-sign-invalid':
    'O sinal da diferença é incoerente com o tratamento: desconto/parcial devem ser negativos; juros/multa/tarifa, positivos.',
  'empty-reconciliation': 'Informe ao menos um título para conciliar.',
  'reconciliation-id-invalid': 'Identificador de conciliação inválido.',
  // Contrapartida de transferência (#269/US2).
  'counterpart-not-found': 'A contrapartida esperada informada não foi encontrada.',
  'counterpart-not-pending': 'A contrapartida esperada já foi casada ou descartada.',
  'counterpart-account-mismatch':
    'A transação não pertence à conta de destino da contrapartida esperada.',
  'counterpart-value-mismatch': 'O valor da transação não confere com o da contrapartida esperada.',
  'counterpart-value-invalid': 'O valor da contrapartida esperada deve ser positivo.',
  'counterpart-same-account': 'A conta de destino não pode ser igual à de origem.',
  // Lançamento manual / lote (US5).
  'manual-entry-value-not-positive': 'O valor do lançamento manual deve ser positivo.',
  'manual-entry-classification-required':
    'Informe categoria e centro de custo para conciliar (obrigatório, exceto em transferência, aplicação e resgate).',
  'empty-batch': 'Informe ao menos uma transação para o lote.',
  // Período (US6).
  'period-has-pending-transactions':
    'O período tem transações pendentes: concilie ou justifique todas antes de fechar.',
  'invalid-period-range': 'Intervalo de período inválido: a data inicial deve ser ≤ a final.',
  'period-closed': 'O período está fechado: não é possível importar/conciliar/desfazer nele.',
  'period-not-closed': 'O período não está fechado: não é possível reabri-lo.',
  'reconciliation-period-not-found': 'Período de conciliação não encontrado.',
  'reconciliation-period-id-invalid': 'Identificador de período inválido.',
  'unsupported-export-format': 'Formato de exportação não suportado (esperado OFX ou CSV).',
  // Export Nibo (#146): falhas de infraestrutura ocultadas pelo caller como 'internal' (5xx).
  'payable-document-view-failure': 'Erro ao consultar documentos dos títulos.',
  'supplier-view-store-unavailable': 'Erro ao consultar read-model de fornecedores.',
  // Alçada do aprovador (#289): create + submit (CA6/CA7). Os 3 primeiros são regra de negócio
  // (default 422); o 4º é falha de leitura do `auth` (UNAVAILABLE_CODES → 503).
  'approver-not-found': 'O aprovador informado não foi encontrado.',
  'approver-missing-permission': 'O aprovador informado não tem permissão de aprovação.',
  'approver-limit-exceeded': 'O aprovador não possui alçada suficiente para este valor.',
  'approver-authority-unavailable':
    'Não foi possível consultar a alçada do aprovador. Tente novamente.',
  // Cascata de alçada (#289 — CASCADE/US3, CA7): regra de negócio (default 422), não vaza o slug.
  'no-approver-with-sufficient-limit': 'Nenhum aprovador com alçada suficiente para este valor.',
  // Resolução em lote (#357): infraestrutura oculta pelo caller como 'internal' (5xx) — nunca chega
  // a este texto na prática (branch >=500 do sendDomainError), mantido por consistência de padrão.
  'payable-summary-by-ids-view-failure': 'Erro ao consultar resumo de títulos em lote.',
};

/** Mensagem PT-BR ao humano para um slug; fallback por `code` público. Nunca retorna o slug. */
export const toPublicMessage = (code: string): string =>
  SLUG_MESSAGES[code] ?? PUBLIC_FALLBACK[toPublicCode(code)];
