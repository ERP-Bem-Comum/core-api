// Perfil do lote: o que muda no ENVELOPE quando a rota do pagamento muda.
//
// Fonte primária: `jun-19-layout-multipag.pdf` (local-only). Cada rota tem sua própria seção no
// manual, e as seções não declaram o mesmo header de lote: a versão do layout do lote difere entre
// elas (pp. 23, 31, 38 e 44), e há campo que existe numa seção e não existe noutra. Um header de
// lote único, parametrizado só pela forma de lançamento, emite envelope errado assim que a segunda
// rota entra — e envelope errado o banco recusa sem dizer qual campo.
//
// A forma de lançamento é DERIVADA daqui, nunca informada por quem chama (#711, CA4 e CA11).
// Enquanto existia uma rota só, quem chamava e quem pagava concordavam por acidente; com formas
// mistas, um parâmetro de entrada vira uma afirmação que o conteúdo do arquivo pode contradizer.
import { ok, err, type Result } from '../../../../shared/primitives/result.ts';

// O mínimo que decide o perfil. O montador passa o pagamento inteiro; aqui só interessa o que
// participa da decisão — e é por isso que o boleto declara o código de barras: é dele que sai o
// banco emissor do título.
export type ProfiledPayment =
  | Readonly<{ route: 'transfer' }>
  | Readonly<{ route: 'pix' }>
  | Readonly<{ route: 'tax-guide' }>
  | Readonly<{ route: 'billet'; barcode: string }>;

export type CnabBatchProfile = Readonly<{
  serviceType: string; // G025
  launchForm: string; // G029 — a chave do agrupamento em lotes
  batchLayoutVersion: string; // G030 — varia por seção do manual
  // P014. `null` significa que a seção daquela rota NÃO tem o campo, e as posições saem em branco —
  // diferente de "tem o campo, e o valor é vazio". A seção de cobrança é o caso.
  paymentIndicator: string | null;
}>;

export type BatchProfileError =
  | 'remittance-launch-form-unsupported'
  | 'remittance-billet-bank-unreadable';

const SERVICE_SUPPLIER_PAYMENT = '20'; // G025
const LAUNCH_TED_OTHER_HOLDER = '41'; // G029
const LAUNCH_BILLET_OWN_BANK = '30'; // G029
const LAUNCH_BILLET_OTHER_BANK = '31'; // G029
const BATCH_LAYOUT_PAYMENTS = '045'; // G030 — seção de pagamentos (p. 23)
const BATCH_LAYOUT_COLLECTION = '040'; // G030 — seção de títulos de cobrança (p. 31)
const PAYMENT_INDICATOR_DEFAULT = '01'; // P014

// Os três primeiros dígitos do código de barras são o banco emissor do título (Carta-Circular Bacen
// 2.926) — é o que separa liquidação de título do próprio banco de título de outro banco.
//
// Ler isso errado não produz arquivo malformado: produz o arquivo válido de outra operação. Por
// isso o código de barras ilegível é ERRO, e não um palpite por omissão.
const BANK_CODE_LENGTH = 3;
const readIssuerBank = (barcode: string): string | null => {
  const prefix = barcode.slice(0, BANK_CODE_LENGTH);
  return /^\d{3}$/.test(prefix) ? prefix : null;
};

// Transferência e boleto são as rotas com emissor. PIX e tributo ainda não têm — e o certo, até
// terem, é a recusa nomeada: emiti-los pelo perfil de transferência mandaria ao banco um pagamento
// bem-formado para a operação errada, usando dados que aquela rota sequer consulta.
export const batchProfileFor = (
  payment: ProfiledPayment,
  cedenteBankCode: string,
): Result<CnabBatchProfile, BatchProfileError> => {
  switch (payment.route) {
    case 'transfer':
      return ok({
        serviceType: SERVICE_SUPPLIER_PAYMENT,
        launchForm: LAUNCH_TED_OTHER_HOLDER,
        batchLayoutVersion: BATCH_LAYOUT_PAYMENTS,
        paymentIndicator: PAYMENT_INDICATOR_DEFAULT,
      });

    case 'billet': {
      const issuer = readIssuerBank(payment.barcode);
      if (issuer === null) return err('remittance-billet-bank-unreadable');

      return ok({
        serviceType: SERVICE_SUPPLIER_PAYMENT,
        launchForm: issuer === cedenteBankCode ? LAUNCH_BILLET_OWN_BANK : LAUNCH_BILLET_OTHER_BANK,
        batchLayoutVersion: BATCH_LAYOUT_COLLECTION,
        paymentIndicator: null,
      });
    }

    case 'pix':
    case 'tax-guide':
      return err('remittance-launch-form-unsupported');
  }
};
