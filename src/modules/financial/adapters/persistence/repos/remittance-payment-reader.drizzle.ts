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

import { eq, inArray } from 'drizzle-orm';
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
import { resolveBarcode } from '#src/modules/financial/domain/payout/digitable-line.ts';
import { checkPayoutReadiness } from '#src/modules/financial/domain/payout/payout-readiness.ts';
import type { PayeeContractor } from '../../http/payee-bank-composition.ts';
import { finDocuments, finPayables } from '../schemas/mysql.ts';

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

type PayableRow = Readonly<{
  payableId: string;
  documentId: string;
  status: string | null;
  paymentMethod: string | null;
  paymentDetail: string | null;
  valueCents: number | null;
  dueDate: Date | null;
  payeeKind: string | null;
  payeeId: string | null;
}>;

const toPaymentData = (
  row: PayableRow,
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
  if (row.paymentMethod === null || row.dueDate === null || row.valueCents === null) {
    return err('remittance-payment-incomplete');
  }

  // Vencimento e valor DO TÍTULO. Era aqui que a data do arquivo divergia do que o operador via na
  // tela: o grid mostra o vencimento do título e a emissão lia o da nota, que a #270 permite alterar
  // isoladamente. Lendo o título, as duas pontas passam a citar a mesma linha.
  const paymentDate = row.dueDate;
  const valueCents = row.valueCents;

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
  // ⚠️ `no-issuer` ATRAVESSA de propósito, e é o que faz a CA2 da #837 valer: a rota tem todos os
  // dados, o que falta é emissor. Quem nomeia essa recusa é `batchProfileFor`, com
  // `remittance-launch-form-unsupported` — e a mensagem dela ("forma ainda não emitida no arquivo,
  // retire-o da seleção") é a MESMA que o pré-voo mostrou. Traduzi-la aqui em
  // `remittance-payment-incomplete` mandaria o operador procurar cadastro que não falta, com uma
  // mensagem diferente da que ele acabou de ler na tela — a divergência que a issue fechou.
  //
  // A negação é a forma segura da condição: status novo que ninguém previu cai na recusa, não na
  // passagem. Quem passa está enumerado; quem não está, não passa.
  if (readiness.status !== 'ready' && readiness.status !== 'no-issuer') {
    return err('remittance-payment-incomplete');
  }

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
        payableId: row.payableId,
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
        },
        valueCents,
        paymentDate,
      });
    }

    case 'billet': {
      // O G063 grava CÓDIGO DE BARRAS, e desde a #788 o cadastro aceita também a linha digitável —
      // `ready` já não significa "o `payment_detail` são os 44 dígitos". Converter aqui é o que
      // torna a CA4 verdadeira: os bytes que saem de uma linha digitável têm de ser IDÊNTICOS aos
      // que sairiam do código de barras equivalente.
      const barcode = resolveBarcode((row.paymentDetail ?? '').replace(/\D/g, ''));
      // Inalcançável pela mesma razão da transferência: a régua chamou `resolveBarcode` e só
      // aprovou porque a conversão passou. Fica explícito porque as duas chamadas são
      // independentes — se um dia divergirem, o erro aqui é preferível a gravar 47 dígitos num
      // campo de 44, que desloca todo o resto do registro.
      if (!barcode.ok) return err('remittance-payment-incomplete');

      // O CEDENTE do título deixou de ser informativo (#891).
      //
      // Enquanto o boleto emitia só o Segmento J, o nome era adorno — `contractor?.name ?? ''` — e
      // o comentário que estava aqui dizia a verdade: o dinheiro segue o código de barras, não o
      // nome. O Segmento J-52 muda o fato, não a opinião: o manual o declara obrigatório para
      // título de cobrança (p. 33) e ele identifica sacado e cedente por INSCRIÇÃO. Sem o
      // favorecido resolvido não há registro a emitir — só um bloco de 56 posições em branco, que é
      // arquivo bem-formado divergindo do modelo do banco em silêncio.
      //
      // Recusar aqui, e não no montador, é o que preserva o contrato tudo-ou-nada do cabeçalho: o
      // título sai da seleção ANTES de o NSA ser alocado, em vez de derrubar a remessa inteira
      // depois de queimar um número de sequência que não volta.
      if (contractor === null) return err('remittance-payment-incomplete');
      const beneficiaryDocument = cleanDocument(contractor.document);
      if (beneficiaryDocument === '') return err('remittance-payment-incomplete');

      return ok({
        payableId: row.payableId,
        documentId: row.documentId,
        route: 'billet',
        barcode: barcode.value,
        // Nome e inscrição do CEDENTE do título: quem emitiu e recebe.
        beneficiaryName: contractor.name,
        beneficiaryDocumentType: documentTypeOf(beneficiaryDocument),
        beneficiaryDocument,
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
        payableId: row.payableId,
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
      payableIds: readonly string[],
    ): Promise<Result<readonly RemittancePaymentData[], RemittancePaymentReaderError>> => {
      if (payableIds.length === 0) return ok([]);

      try {
        const rows = await db
          .select({
            payableId: finPayables.id,
            documentId: finPayables.documentId,
            // Status, forma, complemento, valor e vencimento são DO TÍTULO — o mesmo grão que o
            // pré-voo lê e que o grid de Contas a Pagar exibe.
            status: finPayables.status,
            paymentMethod: finPayables.paymentMethod,
            paymentDetail: finPayables.paymentDetail,
            valueCents: finPayables.value,
            dueDate: finPayables.dueDate,
            // O favorecido é da NOTA: o título não tem fornecedor próprio.
            payeeKind: finDocuments.payeeKind,
            payeeId: finDocuments.supplierRef,
          })
          .from(finPayables)
          .innerJoin(finDocuments, eq(finPayables.documentId, finDocuments.id))
          .where(inArray(finPayables.id, [...payableIds]));

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
