import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { PaymentMethod } from '../document/types.ts';
import { decomposePayeeAccount } from './payee-account.ts';
import type { PayoutCandidate, PayoutGap, PayoutReadiness, VanRoute } from './types.ts';

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

    // O dinheiro segue a linha digitável, não o favorecido: um fornecedor sem nenhum dado bancário
    // paga normalmente por boleto. É o que sustenta a decisão da P.O. de não bloquear o lote.
    case 'billet':
    case 'tax-guide':
      return isBlank(candidate.paymentDetail)
        ? missingField(route, 'payment-detail')
        : ready(route);
  }
};
