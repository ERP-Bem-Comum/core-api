import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { PayeePaymentTarget, PayoutGap } from './types.ts';

// Decomposição do bloco bancário do cadastro nos campos POSICIONAIS que o segmento A exige.
//
// O cadastro guarda quatro campos de texto livre com UM dígito verificador; o arquivo pede código
// numérico de banco, agência e conta em larguras fixas e DVs separados. A conversão só é possível
// para parte dos cadastros — e é isso que faz a diferença entre uma fatia de código e um projeto de
// recadastramento (issue #708).
//
// Regra que atravessa o arquivo inteiro: **nada é inventado**. Um campo que não decompõe sem
// ambiguidade vira lacuna nomeada, nunca um dígito escolhido por conveniência. Um zero errado na
// posição 029 não falha o arquivo — paga a conta de outra pessoa.

// Larguras do segmento A (`adapters/cnab/multipag-segments.ts`): banco 021-023, agência 024-028,
// conta 030-041. Repetidas aqui como LIMITE de convertibilidade, não como formatação: o domínio
// decide se cabe, o adapter decide como escrever.
const BANK_CODE_WIDTH = 3;
const AGENCY_WIDTH = 5;
const ACCOUNT_WIDTH = 12;

const BANK_CODE_RE = /^\d{1,3}$/;
// Separador explícito é a única leitura não-ambígua do DV embutido. Ver `splitCheckDigit`.
const WITH_CHECK_DIGIT_RE = /^(\d+)\s*[-./]\s*([0-9Xx])$/;
const DIGITS_ONLY_RE = /^\d+$/;
// DV alfabético aparece quando o módulo 11 dá resto 10. Só `X` é aceito — qualquer outra letra é
// erro de digitação, e adivinhar qual seria a intenção é o mesmo que inventar o dígito.
const CHECK_DIGIT_RE = /^[0-9Xx]$/;

export type PayeeAccountParts = Readonly<{
  bankCode: string;
  agency: string;
  agencyDigit: string;
  accountNumber: string;
  accountDigit: string;
}>;

// Leitura de um campo: o que dá para aproveitar e o que ficou faltando. As lacunas viajam no
// retorno, nunca por acumulador mutável — cada leitor é uma função pura sobre uma string.
type FieldRead<T> = Readonly<{ value: T; gaps: readonly PayoutGap[] }>;

const gap = (field: PayoutGap['field'], reason: PayoutGap['reason']): PayoutGap =>
  immutable({ field, reason });

const trimmed = (value: string | null | undefined): string => value?.trim() ?? '';

type Split = Readonly<{ base: string; digit: string | null }>;

// Separa `1234-5` em base + DV. SEM separador não decompõe: `12345` pode ser agência de cinco
// dígitos ou quatro mais DV, e a escolha depende do banco. Devolver `digit: null` empurra a decisão
// para quem tem a informação — o operador — em vez de fixá-la aqui.
const splitCheckDigit = (raw: string): Split | null => {
  const withDigit = WITH_CHECK_DIGIT_RE.exec(raw);
  if (withDigit !== null) {
    const [, base, digit] = withDigit;
    if (base === undefined || digit === undefined) return null;
    return immutable({ base, digit: digit.toUpperCase() });
  }
  if (DIGITS_ONLY_RE.test(raw)) return immutable({ base: raw, digit: null });
  return null;
};

// Código do banco. Valor já numérico é alinhado à esquerda com zeros; nome em texto livre é
// `unmappable` — distinto de ausente, porque o cadastro TEM o dado e o que falta é a tabela de-para
// (decisão em aberto na #708, dimensionada pelo CA1). Emitir string vazia ou um código plausível
// nas posições 021-023 mandaria o crédito para o banco errado.
const readBankCode = (raw: string): FieldRead<string> => {
  if (raw === '') return { value: '', gaps: [gap('payee-bank-code', 'missing')] };
  if (!BANK_CODE_RE.test(raw)) return { value: '', gaps: [gap('payee-bank-code', 'unmappable')] };
  return { value: raw.padStart(BANK_CODE_WIDTH, '0'), gaps: [] };
};

type AgencyParts = Readonly<{ agency: string; agencyDigit: string }>;

const NO_AGENCY: AgencyParts = { agency: '', agencyDigit: '' };

const readAgency = (raw: string): FieldRead<AgencyParts> => {
  if (raw === '') {
    return {
      value: NO_AGENCY,
      gaps: [gap('payee-agency', 'missing'), gap('payee-agency-digit', 'missing')],
    };
  }
  const split = splitCheckDigit(raw);
  if (split === null || split.base.length > AGENCY_WIDTH) {
    return { value: NO_AGENCY, gaps: [gap('payee-agency', 'malformed')] };
  }
  const agency = split.base.padStart(AGENCY_WIDTH, '0');
  if (split.digit === null) {
    return { value: { agency, agencyDigit: '' }, gaps: [gap('payee-agency-digit', 'missing')] };
  }
  return { value: { agency, agencyDigit: split.digit }, gaps: [] };
};

type AccountParts = Readonly<{ accountNumber: string; accountDigit: string }>;

const NO_ACCOUNT: AccountParts = { accountNumber: '', accountDigit: '' };

// A conta aceita o DV por dois caminhos: embutido no próprio número (`123456-7`) ou no campo
// `check_digit`. O embutido tem precedência — é o que o operador enxergou ao digitar.
const readAccount = (rawNumber: string, rawDigit: string): FieldRead<AccountParts> => {
  if (rawNumber === '') {
    return {
      value: NO_ACCOUNT,
      gaps: [gap('payee-account-number', 'missing'), gap('payee-account-digit', 'missing')],
    };
  }
  const split = splitCheckDigit(rawNumber);
  if (split === null || split.base.length > ACCOUNT_WIDTH) {
    return { value: NO_ACCOUNT, gaps: [gap('payee-account-number', 'malformed')] };
  }
  const accountNumber = split.base.padStart(ACCOUNT_WIDTH, '0');

  if (split.digit !== null) {
    return { value: { accountNumber, accountDigit: split.digit }, gaps: [] };
  }
  if (rawDigit === '') {
    return {
      value: { accountNumber, accountDigit: '' },
      gaps: [gap('payee-account-digit', 'missing')],
    };
  }
  if (!CHECK_DIGIT_RE.test(rawDigit)) {
    return {
      value: { accountNumber, accountDigit: '' },
      gaps: [gap('payee-account-digit', 'malformed')],
    };
  }
  return { value: { accountNumber, accountDigit: rawDigit.toUpperCase() }, gaps: [] };
};

// Acumula TODAS as lacunas antes de recusar. Parar no primeiro defeito faria o operador corrigir um
// campo por rodada, descobrindo o próximo só depois de salvar — quatro idas ao cadastro para um
// título que podia ser resolvido numa.
export const decomposePayeeAccount = (
  target: PayeePaymentTarget | null,
): Result<PayeeAccountParts, readonly PayoutGap[]> => {
  const bank = readBankCode(trimmed(target?.bank));
  const agency = readAgency(trimmed(target?.agency));
  const account = readAccount(trimmed(target?.accountNumber), trimmed(target?.checkDigit));

  const gaps = [...bank.gaps, ...agency.gaps, ...account.gaps];
  if (gaps.length > 0) return err(immutable(gaps));

  return ok(
    immutable({
      bankCode: bank.value,
      agency: agency.value.agency,
      agencyDigit: agency.value.agencyDigit,
      accountNumber: account.value.accountNumber,
      accountDigit: account.value.accountDigit,
    }),
  );
};
