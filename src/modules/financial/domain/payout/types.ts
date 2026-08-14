import type { PaymentMethod } from '../document/types.ts';

// Contrato ÚNICO de "este título está apto a sair na VAN?" (issue #708).
//
// A elegibilidade é da FORMA DE PAGAMENTO do título, não do favorecido. Quem paga por boleto usa a
// linha digitável e nunca toca a conta bancária; quem paga por PIX usa a chave. Só TED e
// transferência dependem da conta estruturada — que é justamente o bloco que o cadastro guarda como
// texto livre. Tratar "favorecido sem banco" como impedimento universal recusaria a maior parte do
// volume por um dado que ele não usa.
//
// Esta regra tem DOIS consumidores e precisa ser uma definição só: a validação do lançamento do
// documento (que avisa cedo) e a checagem da remessa (que decide o que entra no arquivo). Duas
// cópias divergem, e a divergência aparece como título aprovado na tela que o arquivo recusa.

// Como o dinheiro sai. Deriva da forma de pagamento e decide QUAL dado o arquivo vai cobrar.
export type VanRoute = 'pix' | 'transfer' | 'billet' | 'tax-guide';

// O campo que falta, nomeado por CAMPO e não por mensagem: é o que o front usa para apontar o input
// e o que a recusa carrega no lugar de um slug genérico.
export type PayoutField =
  | 'pix-key'
  | 'payee-bank-code'
  | 'payee-agency'
  | 'payee-agency-digit'
  | 'payee-account-number'
  | 'payee-account-digit'
  | 'payment-detail';

// `missing` pede preenchimento; `unmappable` e `malformed` pedem CORREÇÃO do que já está lá. A
// distinção existe porque o operador age diferente em cada caso — e porque um nome de banco em
// texto livre não é campo vazio, é campo que ninguém sabe converter.
export type PayoutGapReason = 'missing' | 'unmappable' | 'malformed';

export type PayoutGap = Readonly<{ field: PayoutField; reason: PayoutGapReason }>;

// Destino de pagamento do favorecido COMO ELE ESTÁ NO CADASTRO — texto livre, um único DV, tudo
// anulável. Tipo estrutural próprio, não importado de `partners`: o `financial` declara o que
// precisa e o adapter converte (ADR-0006/ADR-0032). Quando o cadastro for estruturado, muda o
// adapter e esta regra continua valendo.
export type PayeePaymentTarget = Readonly<{
  bank: string | null;
  agency: string | null;
  accountNumber: string | null;
  checkDigit: string | null;
  pixKey: string | null;
}>;

export type PayoutCandidate = Readonly<{
  paymentMethod: PaymentMethod;
  paymentDetail: string | null;
  payee: PayeePaymentTarget | null;
}>;

// Três respostas, não duas. `out-of-van` não é "incompleto": nenhum cadastro conserta câmbio, então
// oferecer campo a preencher seria mandar o operador a uma correção que não existe.
export type PayoutReadiness =
  | Readonly<{ status: 'ready'; route: VanRoute }>
  | Readonly<{ status: 'incomplete'; route: VanRoute; gaps: readonly PayoutGap[] }>
  | Readonly<{ status: 'out-of-van'; paymentMethod: PaymentMethod }>;
