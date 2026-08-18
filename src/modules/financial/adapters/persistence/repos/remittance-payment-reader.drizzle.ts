// Adapter Drizzle do RemittancePaymentReader (#720): os títulos selecionados, prontos para emitir.
//
// É o irmão do reader de pré-voo — MESMA leitura, projeção diferente. Lá o dado sai cru, para o
// operador ver o que falta; aqui sai convertido, porque o próximo passo é escrever no arquivo.
//
// Duas diferenças de contrato, e ambas são deliberadas:
//
//   1. É TUDO-OU-NADA. Um título que não converte derruba a chamada inteira com
//      `remittance-payment-incomplete`. Montar a remessa com menos títulos do que o operador
//      selecionou pagaria parte e calaria sobre o resto — e o lugar de saber o que não sai é o
//      pré-voo, ANTES de alocar NSA.
//   2. Cada rota carrega o dado que ELA usa. Boleto e guia pagam por código de barras e não olham
//      conta bancária (#708, CA5); transferência precisa da conta decomposta; PIX ainda não tem
//      emissor e viaja apenas com valor e data, para ser recusado com nome próprio pelo montador.
//
// A conversão do bloco bancário é `decomposePayeeAccount`, do domínio — a mesma régua que o pré-voo
// usa para dizer o que falta. Uma segunda conversão aqui divergiria, e a divergência apareceria
// como título que o pré-voo aprova e o arquivo recusa.

import { inArray } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  RemittancePaymentData,
  RemittancePaymentReader,
  RemittancePaymentReaderError,
} from '#src/modules/financial/application/ports/remittance-payment-reader.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type {
  DocumentStatus,
  PayeeKind,
  PaymentMethod,
} from '#src/modules/financial/domain/document/types.ts';
import { isApprovedForRemittance } from '#src/modules/financial/domain/document/remittance-approval.ts';
import { decomposePayeeAccount } from '#src/modules/financial/domain/payout/payee-account.ts';
import { checkPayoutReadiness } from '#src/modules/financial/domain/payout/payout-readiness.ts';
import type { PayeeContractor } from '../../http/payee-bank-composition.ts';
import { finDocuments } from '../schemas/mysql.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-remittance-payment-reader] ${op} failed: ${String(cause)}\n`);
};

export type PayeeContractorLookup = (
  ref: Readonly<{ kind: PayeeKind | null; id: string | null }>,
) => Promise<Result<PayeeContractor | null, 'contractor-read-unavailable'>>;

// O tipo de inscrição sai do COMPRIMENTO: 11 posições é pessoa física, 14 é pessoa jurídica.
//
// A limpeza preserva letras de propósito — desde 07/2026 a inscrição de pessoa jurídica pode contê-las
// (ADR-0044). Filtrar só numerais encurtaria a string e faria uma inscrição válida ser classificada
// como física, gravando o tipo errado no arquivo.
const CPF_LENGTH = 11;
const cleanDocument = (raw: string): string => raw.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
const documentTypeOf = (raw: string): '1' | '2' => (raw.length === CPF_LENGTH ? '1' : '2');

// O DV de agência/conta (G012) tem descrição VAZIA no layout — nenhuma regra de preenchimento. Sendo
// campo `Alfa`, sai em branco. Fixado aqui para não virar palpite de quem escreve o próximo emissor.
const NO_AGENCY_ACCOUNT_DIGIT = '';

type DocumentRow = Readonly<{
  documentId: string;
  status: string | null;
  paymentMethod: string | null;
  paymentDetail: string | null;
  netValueCents: number | null;
  dueDate: Date | null;
  payeeKind: string | null;
  payeeId: string | null;
}>;

const toPaymentData = (
  row: DocumentRow,
  contractor: PayeeContractor | null,
): Result<RemittancePaymentData, RemittancePaymentReaderError> => {
  // Aprovação ANTES de tudo (#736): título não-`Approved` não é candidato a pagamento, tenha ou não
  // dados de cadastro. É a barreira que impede pagar o que ninguém aprovou — e é a regra do domínio,
  // não um `if` de status solto aqui. Vem primeiro para o erro dizer "falta aprovar", não "falta
  // dado", que mandaria o operador ao lugar errado.
  if (row.status === null || !isApprovedForRemittance(row.status as DocumentStatus)) {
    return err('document-not-approved');
  }

  // Sem forma de pagamento ou sem vencimento o título não é pagável — e o vencimento é a data que
  // o arquivo grava, porque a remessa é gerada POR vencimento (decisão da P.O. na #711).
  if (row.paymentMethod === null || row.dueDate === null || row.netValueCents === null) {
    return err('remittance-payment-incomplete');
  }

  const paymentDate = row.dueDate;
  const valueCents = row.netValueCents;

  // A régua de aptidão é a MESMA do pré-voo. Chamá-la aqui não é redundância: entre o pré-voo e a
  // geração o cadastro pode ter mudado, e a última palavra tem de ser dada no momento de emitir.
  const readiness = checkPayoutReadiness({
    paymentMethod: row.paymentMethod as PaymentMethod,
    paymentDetail: row.paymentDetail,
    payee:
      contractor === null
        ? null
        : {
            bank: contractor.bankAccount?.bank ?? null,
            agency: contractor.bankAccount?.agency ?? null,
            accountNumber: contractor.bankAccount?.accountNumber ?? null,
            checkDigit: contractor.bankAccount?.checkDigit ?? null,
            pixKey: contractor.pixKey,
          },
  });
  if (readiness.status !== 'ready') return err('remittance-payment-incomplete');

  switch (readiness.route) {
    case 'transfer': {
      const parts = decomposePayeeAccount({
        bank: contractor?.bankAccount?.bank ?? null,
        agency: contractor?.bankAccount?.agency ?? null,
        accountNumber: contractor?.bankAccount?.accountNumber ?? null,
        checkDigit: contractor?.bankAccount?.checkDigit ?? null,
        pixKey: null,
      });
      // Inalcançável: `ready` na rota de transferência JÁ significa que a decomposição passou. Fica
      // explícito porque as duas chamadas são independentes — se um dia divergirem, o erro aqui é
      // preferível ao campo vazio no arquivo.
      if (!parts.ok || contractor === null) return err('remittance-payment-incomplete');

      const document = cleanDocument(contractor.document);
      return ok({
        documentId: row.documentId,
        route: 'transfer',
        payee: {
          name: contractor.name,
          documentType: documentTypeOf(document),
          document,
          bankCode: parts.value.bankCode,
          agency: parts.value.agency,
          agencyDigit: parts.value.agencyDigit,
          accountNumber: parts.value.accountNumber,
          accountDigit: parts.value.accountDigit,
          accountAgencyDigit: NO_AGENCY_ACCOUNT_DIGIT,
        },
        valueCents,
        paymentDate,
      });
    }

    case 'billet': {
      // `ready` no boleto garante 44 dígitos — a régua já recusou linha digitável e código curto.
      const barcode = (row.paymentDetail ?? '').replace(/\D/g, '');
      return ok({
        documentId: row.documentId,
        route: 'billet',
        barcode,
        // Nome do CEDENTE do título: quem recebe. Sem favorecido resolvido o campo sai vazio — ele
        // é informativo, e o dinheiro segue o código de barras, não o nome.
        beneficiaryName: contractor?.name ?? '',
        dueDate: paymentDate,
        valueCents,
        paymentDate,
      });
    }

    // Rotas contratadas ainda sem emissor. Viajam com valor e data para o montador recusá-las com
    // nome próprio (`remittance-launch-form-unsupported`) — o que o operador precisa ler não é
    // "dado faltando", é "o arquivo ainda não emite esta forma".
    case 'pix':
    case 'tax-guide':
      return ok({
        documentId: row.documentId,
        route: readiness.route,
        valueCents,
        paymentDate,
      });
  }
};

export const createDrizzleRemittancePaymentReader = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  lookupPayeeContractor: PayeeContractorLookup,
): RemittancePaymentReader => {
  const { db } = handle;

  return {
    loadPayments: async (
      documentIds: readonly string[],
    ): Promise<Result<readonly RemittancePaymentData[], RemittancePaymentReaderError>> => {
      if (documentIds.length === 0) return ok([]);

      try {
        const rows = await db
          .select({
            documentId: finDocuments.id,
            status: finDocuments.status,
            paymentMethod: finDocuments.paymentMethod,
            paymentDetail: finDocuments.paymentDetail,
            netValueCents: finDocuments.netValue,
            dueDate: finDocuments.dueDate,
            payeeKind: finDocuments.payeeKind,
            payeeId: finDocuments.supplierRef,
          })
          .from(finDocuments)
          .where(inArray(finDocuments.id, [...documentIds]));

        // Uma leitura por favorecido, não por título — mesma razão do reader de pré-voo: o mesmo
        // fornecedor aparece em vários títulos e o pool é recurso escasso (#407).
        const cache = new Map<string, PayeeContractor | null>();
        const items: RemittancePaymentData[] = [];

        for (const row of rows) {
          const key = `${row.payeeKind ?? ''}:${row.payeeId ?? ''}`;
          if (!cache.has(key)) {
            const contractor = await lookupPayeeContractor({
              kind: (row.payeeKind as PayeeKind | null) ?? null,
              id: row.payeeId ?? null,
            });
            // Indisponibilidade do `partners` NÃO vira "título incompleto": o cadastro pode estar
            // perfeito. Erro de leitura sobe como indisponibilidade, e o operador tenta de novo em
            // vez de sair caçando cadastro que não tem defeito.
            if (!contractor.ok) {
              logStore('loadPayments:payee', contractor.error);
              return err('remittance-payment-reader-unavailable');
            }
            cache.set(key, contractor.value);
          }

          const mapped = toPaymentData(row, cache.get(key) ?? null);
          if (!mapped.ok) return err(mapped.error);
          items.push(mapped.value);
        }

        return ok(items);
      } catch (cause) {
        logStore('loadPayments', cause);
        return err('remittance-payment-reader-unavailable');
      }
    },
  };
};
