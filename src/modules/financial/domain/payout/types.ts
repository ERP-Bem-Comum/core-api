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
// Não há `payee-agency-digit`: o DV da agência é declarado opcional pelo layout (G009), então
// nunca é lacuna. Ver `payee-account.ts` §readAgency.
export type PayoutField =
  | 'pix-key'
  | 'payee-bank-code'
  | 'payee-agency'
  | 'payee-account-number'
  | 'payee-account-digit'
  | 'payment-detail';

// `missing` pede preenchimento; `unmappable` e `malformed` pedem CORREÇÃO do que já está lá. A
// distinção existe porque o operador age diferente em cada caso — e porque um nome de banco em
// texto livre não é campo vazio, é campo que ninguém sabe converter.
export type PayoutGapReason = 'missing' | 'unmappable' | 'malformed';

export type PayoutGap = Readonly<{ field: PayoutField; reason: PayoutGapReason }>;

// Chave PIX como o `financial` precisa dela.
//
// Tipo DESTE módulo, espelhando a forma sem importar o VO de `partners`: `public-api/refs.ts:6-7`
// fixa que "Contratos e Financeiro guardam um parceiro por ID branded, NUNCA importam o domínio de
// `partners`", e é a tradução no adapter que Evans chama de ACL (Blue Book, p. 226 — "our emphasis
// is on translation between two models").
//
// `keyType` é OPACO aqui, e de propósito. O payout decide aptidão, e para isso basta haver chave —
// não interpreta o tipo. Mas transporta-o, porque quem emite o registro PIX (#711) vai precisar
// dele, e uma chave achatada em `string` perderia essa informação no caminho: é o "stringly typed"
// que Fowler nomeia em Refactoring p. 68. Copiar aqui a união fechada de `partners`
// (`'cpf' | 'cnpj' | …`) duplicaria vocabulário que já tem dono — e regra duplicada é fábrica de
// divergência. Quem valida o tipo é `partners`, no `createPixKey`.
export type PayeePixKey = Readonly<{ keyType: string; key: string }>;

// Destino de pagamento do favorecido COMO ELE ESTÁ NO CADASTRO — texto livre, um único DV, tudo
// anulável. Tipo estrutural próprio, não importado de `partners`: o `financial` declara o que
// precisa e o adapter converte (ADR-0006/ADR-0032). Quando o cadastro for estruturado, muda o
// adapter e esta regra continua valendo.
//
// ⚠️ Os campos de texto chegam do cadastro como STRING VAZIA com mais frequência do que como
// `null`: `par_suppliers_bank_block_chk` e `par_acts_bank_block_chk` exigem as quatro colunas
// bancárias juntas nulas ou juntas preenchidas, então o banco recusa bloco parcialmente nulo e o
// cadastro incompleto entrou como `''`. As duas formas são tratadas igual — ver `trimmed` em
// `payee-account.ts` e `isBlank` em `payout-readiness.ts` — e há teste fixando a equivalência.
export type PayeePaymentTarget = Readonly<{
  bank: string | null;
  agency: string | null;
  accountNumber: string | null;
  checkDigit: string | null;
  pixKey: PayeePixKey | null;
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
