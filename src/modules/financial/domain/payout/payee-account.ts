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

// O código de compensação vem PREFIXANDO o nome no cadastro real: `237 - Banco Bradesco S.A.`.
// Medido no dump de produção do legado (14/08/2026): as 9 grafias distintas dos 85 fornecedores com
// bloco bancário seguem esse formato, e a ETL copia o campo literal
// (`scripts/etl/mappers/supplier.mapper.ts:94`), então o core-api guarda a mesma string.
//
// Isto desmonta a premissa que originou a #708 — "nome em texto livre, precisa de tabela de-para".
// Não precisa: o código já está no dado.
//
// O `\S` final exige que EXISTA nome depois do separador. `237 - ` sozinho não é grafia de banco,
// é campo pela metade — e tratá-lo como código aceitaria lixo com aparência de dado.
const BANK_CODE_PREFIX_RE = /^(\d{1,3})[ \t]*[-–—][ \t]*\S/;
// Separador explícito é a única leitura não-ambígua do DV embutido. Ver `splitCheckDigit`.
//
// O DV aceita DUAS posições porque o layout prevê o caso em G011: "Para os Bancos que se utilizam
// de duas posições para o Dígito Verificador do Número da Conta Corrente, preencher este campo com
// a 1ª posição deste dígito. Exemplo: Número C/C = 45981-36. Neste caso Dígito Verificador da
// Conta = 3" (`jun-19-layout-multipag.pdf` p. 96, local-only). Recusar `45981-36` como malformado
// descartaria um cadastro que o banco sabe processar.
const WITH_CHECK_DIGIT_RE = /^(\d+)\s*[-./]\s*([0-9Xx]{1,2})$/;
const DIGITS_ONLY_RE = /^\d+$/;
// DV alfabético aparece quando o módulo 11 dá resto 10. Só `X` é aceito — qualquer outra letra é
// erro de digitação, e adivinhar qual seria a intenção é o mesmo que inventar o dígito.
const CHECK_DIGIT_RE = /^[0-9Xx]{1,2}$/;

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

// O que sobra ao separar `1234-5`: a base e o dígito, quando há um. `digit: null` significa "não
// veio", não "é vazio" — a diferença decide se o campo posicional sai em branco ou se o cadastro
// está malformado.
type CheckDigitSplit = Readonly<{ base: string; digit: string | null }>;

// Separa `1234-5` em base + DV. SEM separador não decompõe: `12345` pode ser agência de cinco
// dígitos ou quatro mais DV, e a escolha depende do banco. Devolver `digit: null` empurra a decisão
// para quem tem a informação — o operador — em vez de fixá-la aqui.
//
// Quando o DV tem duas posições, só a PRIMEIRA vai para o campo (regra G011 citada acima). O
// descarte da segunda é do layout, não nosso: o campo tem uma posição só.
const splitCheckDigit = (raw: string): CheckDigitSplit | null => {
  const withDigit = WITH_CHECK_DIGIT_RE.exec(raw);
  if (withDigit !== null) {
    const [, base, digit] = withDigit;
    if (base === undefined || digit === undefined) return null;
    return immutable({ base, digit: (digit[0] ?? '').toUpperCase() });
  }
  if (DIGITS_ONLY_RE.test(raw)) return immutable({ base: raw, digit: null });
  return null;
};

// Código do banco, por dois caminhos: o campo já numérico, ou o código que PREFIXA o nome
// (`237 - Banco Bradesco S.A.` — a forma que o cadastro real usa). Os dois alinham em três dígitos.
//
// O que sobra é `unmappable`: o cadastro tem um banco escrito, e não há como saber qual código lhe
// corresponde. É distinto de ausente porque a ação do operador é outra — corrigir, não preencher.
//
// ⚠️ O código tem de PREFIXAR. Procurá-lo em posição arbitrária faria `Banco 237` virar `237`, e
// aí qualquer número no meio de um nome — um ano, um número de agência digitado errado — viraria
// código de banco. As posições 021-023 decidem para QUAL instituição o crédito vai; um palpite ali
// não falha o arquivo, credita a conta certa no banco errado.
const readBankCode = (raw: string): FieldRead<string> => {
  if (raw === '') return { value: '', gaps: [gap('payee-bank-code', 'missing')] };

  if (BANK_CODE_RE.test(raw)) return { value: raw.padStart(BANK_CODE_WIDTH, '0'), gaps: [] };

  const prefixed = BANK_CODE_PREFIX_RE.exec(raw);
  const code = prefixed?.[1];
  if (code !== undefined) return { value: code.padStart(BANK_CODE_WIDTH, '0'), gaps: [] };

  return { value: '', gaps: [gap('payee-bank-code', 'unmappable')] };
};

type AgencyParts = Readonly<{ agency: string; agencyDigit: string }>;

const NO_AGENCY: AgencyParts = { agency: '', agencyDigit: '' };

// ⚠️ O DV da agência é OPCIONAL, e isso vem da fonte primária: G009 diz literalmente "(Campo Não
// Obrigatório – Informação Opcional)" (`jun-19-layout-multipag.pdf` p. 95, local-only). Um cadastro
// com `12345` e sem DV está completo aos olhos do banco — exigi-lo aqui recusaria pagamento por um
// campo que o layout dispensa, que é o oposto do que a decisão (a) da P.O. pede na #708.
//
// Isso também dissolve a ambiguidade que antes obrigava a pedir separador: sem DV a agência é o
// campo inteiro, e a posição 029 sai em branco (`Alfa` = brancos à direita, p. 14). O separador
// continua sendo a única leitura válida quando o DV EXISTE — `12345` nunca vira `1234` + `5`.
const readAgency = (raw: string): FieldRead<AgencyParts> => {
  if (raw === '') return { value: NO_AGENCY, gaps: [gap('payee-agency', 'missing')] };

  const split = splitCheckDigit(raw);
  if (split === null || split.base.length > AGENCY_WIDTH) {
    return { value: NO_AGENCY, gaps: [gap('payee-agency', 'malformed')] };
  }
  const agency = split.base.padStart(AGENCY_WIDTH, '0');
  return { value: { agency, agencyDigit: split.digit ?? '' }, gaps: [] };
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
  // Só a 1ª posição, pela mesma regra G011 que vale para o DV embutido: o campo tem uma posição.
  return { value: { accountNumber, accountDigit: (rawDigit[0] ?? '').toUpperCase() }, gaps: [] };
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
