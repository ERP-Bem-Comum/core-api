import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { PaymentMethod } from '../document/types.ts';
import { type DigitableLineError, resolveBarcode } from './digitable-line.ts';
import { decomposePayeeAccount } from './payee-account.ts';
import type {
  PayoutCandidate,
  PayoutGap,
  PayoutGapReason,
  PayoutReadiness,
  VanRoute,
} from './types.ts';

// A pergunta que o front faz no lançamento e o gerador da remessa faz antes do arquivo: **este
// título sai pela VAN, e se não sai, o que falta?** Uma definição só, dois consumidores (issue #708).

// Formas contratadas na VAN/Multipag, confirmadas pela P.O. Cartão corporativo, câmbio e "outro"
// ficam de fora do arquivo — não por lacuna de cadastro, mas porque o layout contratado não os
// transporta.
const routeOf = (method: PaymentMethod): VanRoute | null => {
  switch (method) {
    case 'PIX':
      return 'pix';
    case 'TED':
    case 'TransferenciaBancaria':
      return 'transfer';
    case 'Boleto':
      return 'billet';
    case 'GuiaRecolhimento':
      return 'tax-guide';
    case 'CartaoCorporativo':
    case 'Cambio':
    case 'Outro':
      return null;
  }
};

const isBlank = (value: string | null): boolean => (value?.trim() ?? '') === '';

const ready = (route: VanRoute): PayoutReadiness => immutable({ status: 'ready' as const, route });

const incomplete = (route: VanRoute, gaps: readonly PayoutGap[]): PayoutReadiness =>
  immutable({ status: 'incomplete' as const, route, gaps });

// `missingField(route, 'pix-key')` devolve o READINESS incompleto — não o campo. O nome diz o
// motivo da incompletude, que é o que o chamador está afirmando ao usá-lo.
const missingField = (route: VanRoute, field: PayoutGap['field']): PayoutReadiness =>
  incomplete(route, immutable([immutable({ field, reason: 'missing' as const })]));

// O Segmento J grava CÓDIGO DE BARRAS: 44 dígitos, campo G063 (Carta-Circular Bacen 2.926).
//
// A linha digitável passou a servir (issue #788): `resolveBarcode` converte 47 (cobrança) e 48
// (arrecadação) nos 44 do código de barras, reordenando blocos e descartando os DVs de bloco. A
// régua deixa de recusar o dado que a P.O. definiu como O dado do boleto — é ele que vem impresso
// e é ele que o operador digita.
//
// Não é hipótese: no dump de produção do legado, 19 dos 20 títulos de boleto trazem 44 dígitos e
// UM traz 47. Os dois formatos convivem no mesmo campo.
//
// ⚠️ Quem consome esta régua para EMITIR precisa converter também — `ready` deixou de significar
// "o `payment_detail` já são os 44 dígitos". Ver `remittance-payment-reader.drizzle.ts`.

// TODO(human): traduzir o erro da conversão para o motivo que o operador lê.
//
// `resolveBarcode` devolve dois erros, e esta função decide o que cada um vira em `PayoutGapReason`
// — que é o que a interface usa para dizer ao operador o que fazer. A união tem quatro valores, e
// três deles são candidatos plausíveis aqui:
//
//   'malformed'            — "o dado está errado, corrija"
//   'unmappable'           — "o formato não é suportado" (era o que a linha digitável recebia)
//   'check-digit-mismatch' — "está bem-formado e mesmo assim errado; o algoritmo produz outro
//                            dígito" — criado pela #734 para o DV da CONTA bancária
//
// Os dois casos a mapear:
//   'unknown-length'             — não tem 44, 47 nem 48 dígitos
//   'field-check-digit-mismatch' — tem o comprimento certo, mas um DV de bloco não fecha
const reasonForConversionError = (error: DigitableLineError): PayoutGapReason => {};

const readBarcode = (raw: string | null, route: VanRoute): PayoutReadiness => {
  // Só dígitos: o cadastro guarda com pontuação em alguns casos, e o campo do arquivo é numérico.
  if (isBlank(raw)) return missingField(route, 'payment-detail');

  const barcode = resolveBarcode((raw ?? '').replace(/\D/g, ''));
  if (barcode.ok) return ready(route);

  const reason = reasonForConversionError(barcode.error);
  return incomplete(route, immutable([immutable({ field: 'payment-detail' as const, reason })]));
};

export const checkPayoutReadiness = (candidate: PayoutCandidate): PayoutReadiness => {
  const route = routeOf(candidate.paymentMethod);
  if (route === null) {
    return immutable({ status: 'out-of-van' as const, paymentMethod: candidate.paymentMethod });
  }

  switch (route) {
    // A chave é o destino inteiro: o arquivo não olha agência nem conta. Conta completa NÃO
    // substitui a chave — quem escolheu PIX no lançamento paga por PIX, e trocar a rota por conta
    // própria mudaria o custo e o prazo que o operador aceitou.
    // Só a existência da chave decide aptidão — o `keyType` viaja para quem emite o registro, mas
    // não participa desta decisão. Chave em branco é chave ausente: o cadastro guarda `''` com mais
    // frequência que `null` (ver o CHECK do bloco bancário, em `types.ts`).
    case 'pix':
      return isBlank(candidate.payee?.pixKey?.key ?? null)
        ? missingField(route, 'pix-key')
        : ready(route);

    // Única rota que depende da conta estruturada — e, portanto, a única em que o desencaixe do
    // cadastro vira impedimento de pagamento.
    case 'transfer': {
      const parts = decomposePayeeAccount(candidate.payee);
      return parts.ok ? ready(route) : incomplete(route, parts.error);
    }

    // O dinheiro segue o código de barras, não o favorecido: um fornecedor sem nenhum dado bancário
    // paga normalmente por boleto. É o que sustenta a decisão da P.O. de não bloquear o lote — e o
    // Segmento J confirma na fonte, por não ter campo algum de agência ou conta do favorecido.
    case 'billet':
    case 'tax-guide':
      return readBarcode(candidate.paymentDetail, route);
  }
};
