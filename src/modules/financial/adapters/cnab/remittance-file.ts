// Montador do arquivo de remessa CNAB 240 Multipag: junta envelope e detalhes num arquivo só.
//
// A razão de existir: os totais do trailer são **derivados das linhas efetivamente emitidas**, não
// informados por quem chama. Enquanto a contagem for responsabilidade do chamador, um erro nela
// passa despercebido até o banco recusar o arquivo inteiro — e a recusa vem sem dizer qual campo.
//
// Escopo: UM lote, de pagamento por crédito em conta / TED / transferência (Segmentos A + B).
// Multi-lote (misturar formas de lançamento no mesmo arquivo) é fatia própria: exige renumerar
// lotes e replicar o envelope de lote, e não há caso de uso para isso ainda.
import { ok, err, type Result } from '../../../../shared/primitives/result.ts';
import {
  batchHeader,
  batchTrailer,
  fileHeader,
  fileTrailer,
  type CedenteHeaderData,
  type CompanyAddress,
} from './multipag-records.ts';
import {
  paymentRecords,
  type CnabSegmentError,
  type Payee,
  type PayeeAddress,
} from './multipag-segments.ts';

// O layout não especifica o terminador de linha — nem no corpo, nem nas notas gerais. CRLF é a
// convenção do CNAB e o destino é uma máquina Windows (o STCPCLT roda lá), então é a escolha
// segura. Fica exportado e nomeado de propósito: se o banco recusar um arquivo bem formado, este
// é o primeiro suspeito, e a troca é de uma constante.
export const LINE_TERMINATOR = '\r\n';

const SINGLE_BATCH = 1;

export type RemittancePayment = Readonly<{
  payee: Payee;
  paymentDate: Date;
  valueCents: number;
  address?: PayeeAddress;
  yourNumber?: string;
  clearingHouse?: string;
  tedPurpose?: string;
  message?: string;
}>;

export type RemittanceFileInput = Readonly<{
  cedente: CedenteHeaderData;
  bankName: string;
  nsa: number;
  generatedAt: Date;
  serviceType: string;
  launchForm: string;
  companyAddress?: CompanyAddress;
  batchMessage?: string;
  payments: readonly RemittancePayment[];
}>;

export type RemittanceFileError = CnabSegmentError | 'remittance-without-payments';

export type RemittanceFile = Readonly<{
  content: string;
  lineCount: number;
  totalCents: number;
}>;

export const buildRemittanceFile = (
  input: RemittanceFileInput,
): Result<RemittanceFile, RemittanceFileError> => {
  // Arquivo sem pagamento é envelope vazio: o banco recebe, processa e não paga nada. Recusar aqui
  // é mais barato que descobrir depois por que a remessa "foi" e ninguém recebeu.
  if (input.payments.length === 0) return err('remittance-without-payments');

  const header = fileHeader({
    cedente: input.cedente,
    bankName: input.bankName,
    nsa: input.nsa,
    generatedAt: input.generatedAt,
  });
  if (!header.ok) return header;

  const lotHeader = batchHeader({
    cedente: input.cedente,
    batchNumber: SINGLE_BATCH,
    serviceType: input.serviceType,
    launchForm: input.launchForm,
    ...(input.batchMessage !== undefined ? { message: input.batchMessage } : {}),
    ...(input.companyAddress !== undefined ? { address: input.companyAddress } : {}),
  });
  if (!lotHeader.ok) return lotHeader;

  const details: string[] = [];
  let totalCents = 0;

  for (const payment of input.payments) {
    // O sequencial do registro no lote (G038) numera os DETALHES a partir de 1 — header e trailer
    // de lote nem possuem o campo. Como cada pagamento gera o par A+B, o próximo começa onde o
    // anterior parou; centralizar a conta aqui é o que impede o chamador de errá-la.
    const pair = paymentRecords({
      bankCode: input.cedente.bankCode,
      batchNumber: SINGLE_BATCH,
      firstRecordNumber: details.length + 1,
      payee: payment.payee,
      paymentDate: payment.paymentDate,
      valueCents: payment.valueCents,
      ...(payment.address !== undefined ? { address: payment.address } : {}),
      ...(payment.yourNumber !== undefined ? { yourNumber: payment.yourNumber } : {}),
      ...(payment.clearingHouse !== undefined ? { clearingHouse: payment.clearingHouse } : {}),
      ...(payment.tedPurpose !== undefined ? { tedPurpose: payment.tedPurpose } : {}),
      ...(payment.message !== undefined ? { message: payment.message } : {}),
    });
    // Um pagamento que falha aborta o arquivo inteiro. Emitir remessa parcial seria pagar parte
    // dos fornecedores e silenciar o resto — pior que não pagar ninguém.
    if (!pair.ok) return pair;

    details.push(...pair.value);
    totalCents += payment.valueCents;
  }

  // Registros DO LOTE: seu header + os detalhes + este trailer.
  const lotTrailer = batchTrailer({
    bankCode: input.cedente.bankCode,
    batchNumber: SINGLE_BATCH,
    recordCount: details.length + 2,
    totalCents,
  });
  if (!lotTrailer.ok) return lotTrailer;

  const bodyLines = [header.value, lotHeader.value, ...details, lotTrailer.value];

  // Registros DO ARQUIVO: tudo que já foi emitido mais este trailer. Derivado do array, nunca de
  // uma fórmula paralela — fórmula e emissão divergem no dia em que alguém acrescentar um registro.
  const trailer = fileTrailer({
    bankCode: input.cedente.bankCode,
    batchCount: 1,
    recordCount: bodyLines.length + 1,
  });
  if (!trailer.ok) return trailer;

  const lines = [...bodyLines, trailer.value];

  return ok({
    content: lines.join(LINE_TERMINATOR),
    lineCount: lines.length,
    totalCents,
  });
};
