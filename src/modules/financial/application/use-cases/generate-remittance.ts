import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { CedenteAccountId } from '../../domain/cedente/cedente-account-id.ts';
import type { RemittanceId } from '../../domain/remittance/remittance-id.ts';
import { create as createRemittance } from '../../domain/remittance/remittance.ts';
import { distinctPaymentDays } from '../../domain/remittance/payment-dates.ts';
import {
  checkCedenteRemittanceReadiness,
  type CedenteRemittanceGap,
} from '../../domain/cedente/remittance-eligibility.ts';
import type { CedenteAccountStore } from '../ports/cedente-account-store.ts';
import type { RemittanceRepository } from '../ports/remittance-repository.ts';
import type { RemittancePaymentReader } from '../ports/remittance-payment-reader.ts';
import type { VanStoragePort } from '../ports/van-storage.ts';
import type { CnabRemittanceTranslator } from '../ports/cnab-remittance-translator.ts';

export type GenerateRemittanceDeps = Readonly<{
  cedenteAccounts: CedenteAccountStore;
  remittances: RemittanceRepository;
  payments: RemittancePaymentReader;
  translator: CnabRemittanceTranslator;
  storage: VanStoragePort;
  now: () => Date;
  newRemittanceId: () => RemittanceId;
  hashContent: (content: string) => string;
}>;

// Nem tipo de serviço nem forma de lançamento entram por aqui: a forma é derivada da rota de cada
// título, um lote por forma (#711, CA4). Recebê-la do chamador era aceitar uma afirmação que o
// conteúdo do arquivo podia contradizer — e com uma rota só, os dois concordavam por acidente.
export type GenerateRemittanceInput = Readonly<{
  cedenteAccountId: CedenteAccountId;
  documentIds: readonly string[];
}>;

export type GenerateRemittanceOutput = Readonly<{
  remittanceId: RemittanceId;
  fileName: string;
  objectKey: string;
  nsa: number;
  totalCents: number;
  lineCount: number;
}>;

export type GenerateRemittanceError =
  | 'remittance-empty-selection'
  | 'remittance-documents-already-held'
  | 'remittance-payments-unavailable'
  // Título não-`Approved` na seleção (#736). É a barreira que importa: impede pagar o que ninguém
  // aprovou, contornando a separação de funções que o `payable:approve` garante.
  | 'document-not-approved'
  | 'remittance-mixed-payment-dates'
  // Título de rota que o emissor ainda não cobre (PIX, guia). Não é dado faltando: é o arquivo que
  // ainda não sabe emitir aquela forma, e o operador não tem o que corrigir no cadastro.
  | 'remittance-launch-form-unsupported'
  // Conta-cedente sem convênio, ou com convênio ilegível (#722). É dado que o operador corrige, e
  // por isso viaja com nome próprio em vez de virar falha interna do montador do nome.
  | CedenteRemittanceGap
  | 'remittance-nsa-unavailable'
  | 'remittance-file-name-failed'
  | 'remittance-build-failed'
  | 'remittance-malformed-file'
  | 'remittance-persist-failed'
  | 'remittance-upload-failed';

export const generateRemittance =
  (deps: GenerateRemittanceDeps) =>
  async (
    input: GenerateRemittanceInput,
  ): Promise<Result<GenerateRemittanceOutput, GenerateRemittanceError>> => {
    if (input.documentIds.length === 0) return err('remittance-empty-selection');

    // 1. Quem já está preso. A pergunta vai ao BANCO porque outra instância pode ter enfileirado o
    // mesmo documento há segundos — e incluir de novo é pagar duas vezes.
    const held = await deps.remittances.findHeldDocumentIds(input.documentIds);
    if (!held.ok) return err('remittance-persist-failed');
    if (held.value.length > 0) return err('remittance-documents-already-held');

    // 2. Dados de pagamento. Faltar documento é erro: montar com menos do que foi selecionado
    // pagaria parte e calaria sobre o resto.
    const payments = await deps.payments.loadPayments(input.documentIds);
    if (!payments.ok) {
      // Não-aprovado sobe com nome próprio (409): é regra de negócio que o operador entende, não a
      // indisponibilidade genérica que os demais erros do reader viram. O pré-voo já mostra QUAIS.
      return err(
        payments.error === 'document-not-approved'
          ? 'document-not-approved'
          : 'remittance-payments-unavailable',
      );
    }
    if (payments.value.length !== input.documentIds.length) {
      return err('remittance-payments-unavailable');
    }

    // 3. Um arquivo, um dia. A checagem vem ANTES do NSA de propósito: o número não volta depois de
    // alocado, e queimar um por erro de seleção deixaria um gap na sequência sem nenhum arquivo do
    // outro lado. Sem isto, uma seleção com vencimentos distintos vira um arquivo bem-formado que o
    // banco processa com datas misturadas — sem erro, sem retorno negativo, sem sinal.
    const days = distinctPaymentDays(payments.value.map((p) => p.paymentDate));
    if (days.length > 1) return err('remittance-mixed-payment-dates');

    const account = await deps.cedenteAccounts.findById(input.cedenteAccountId);
    if (!account.ok || account.value === null) return err('remittance-nsa-unavailable');

    // 3.1. A conta serve para gerar? O convênio é opcional no cadastro e obrigatório aqui (#722).
    //
    // A verificação vem ANTES do NSA pelo mesmo motivo da checagem de datas: o número não volta
    // depois de alocado, e sem isto cada tentativa com conta incompleta queimava um da sequência —
    // falhando adiante, no montador do nome, e chegando ao operador como erro interno.
    const eligible = checkCedenteRemittanceReadiness(account.value);
    if (!eligible.ok) return err(eligible.error);

    // 4. NSA sob lock de linha. A partir daqui o número está CONSUMIDO — se algo falhar adiante,
    // ele não volta. É deliberado: um gap na sequência é inofensivo, reusar número é retransmissão
    // aos olhos do banco.
    const nsa = await deps.cedenteAccounts.allocateNsa(input.cedenteAccountId);
    if (!nsa.ok) return err('remittance-nsa-unavailable');

    const generatedAt = deps.now();

    // O tradutor devolve o arquivo JÁ verificado — nome, montagem e inspeção estrutural são dele.
    // A application não conhece layout: trocar de banco é trocar o adapter injetado aqui.
    const translated = deps.translator.translate({
      cedente: {
        bankCode: account.value.bankCode,
        documentType: '2',
        document: account.value.document,
        convenio: account.value.convenio,
        agency: account.value.agency,
        agencyDigit: '',
        accountNumber: account.value.accountNumber,
        accountDigit: account.value.accountDigit,
        accountAgencyDigit: '',
        companyName: account.value.bankName ?? '',
        bankName: account.value.bankName ?? '',
      },
      nsa: nsa.value,
      generatedAt,
      // O pagamento vai INTEIRO, como o reader o entregou: cada rota carrega os dados que ela usa,
      // e achatá-los aqui num formato único perderia o que distingue boleto de transferência.
      payments: payments.value,
    });
    if (!translated.ok) {
      switch (translated.error) {
        case 'cnab-file-name-failed':
          return err('remittance-file-name-failed');
        case 'cnab-malformed-file':
          return err('remittance-malformed-file');
        case 'cnab-launch-form-unsupported':
          return err('remittance-launch-form-unsupported');
        case 'cnab-translation-failed':
          return err('remittance-build-failed');
      }
    }

    const remittance = createRemittance({
      id: deps.newRemittanceId(),
      cedenteAccountId: input.cedenteAccountId,
      nsa: nsa.value,
      fileName: translated.value.fileName,
      contentHash: deps.hashContent(translated.value.content),
      documentIds: input.documentIds,
      generatedAt: generatedAt.toISOString(),
    });
    if (!remittance.ok) return err('remittance-build-failed');

    // 5. REGISTRAR ANTES DE ENFILEIRAR. A ordem é a decisão mais importante deste use case.
    //
    // Gravar no bucket é enfileirar pagamento. Se o upload viesse primeiro e a persistência
    // falhasse, existiria um pagamento a caminho do banco SEM registro nosso — invisível, e os
    // documentos continuariam livres para entrar noutra remessa.
    //
    // Nesta ordem, o pior caso é uma remessa `Queued` sem arquivo: visível, recuperável, e já
    // prendendo os documentos. Erra-se para menos, como no resto do fluxo.
    const persisted = await deps.remittances.save(remittance.value);
    if (!persisted.ok) return err('remittance-persist-failed');

    const uploaded = await deps.storage.putRemittance(
      translated.value.fileName,
      translated.value.content,
    );
    if (!uploaded.ok) return err('remittance-upload-failed');

    return ok({
      remittanceId: remittance.value.id,
      fileName: translated.value.fileName,
      objectKey: uploaded.value,
      nsa: nsa.value,
      totalCents: translated.value.totalCents,
      lineCount: translated.value.lineCount,
    });
  };
