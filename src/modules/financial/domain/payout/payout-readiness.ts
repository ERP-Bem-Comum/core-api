import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { PaymentMethod } from '../document/types.ts';
import { type DigitableLineError, resolveBarcode } from './digitable-line.ts';
import { decomposePayeeAccount } from './payee-account.ts';
import { hasRemittanceIssuer } from './van-routes.ts';
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

// O que o CADASTRO responde: os dados que aquela rota exige estão lá e são legíveis?
//
// Tipo estreito de propósito, e é ele que mantém as duas perguntas da #837 separadas no compilador.
// Esta metade não sabe — e não deve saber — se existe emissor para a rota: ela julga DADO, e só.
// Declarado como `PayoutReadiness` inteiro, um `no-issuer` poderia escapar daqui, misturando de novo
// o que a issue separou. Os helpers abaixo herdam o estreitamento pelo mesmo motivo.
type RouteDataCheck = Extract<PayoutReadiness, { status: 'ready' | 'incomplete' }>;

const ready = (route: VanRoute): Extract<RouteDataCheck, { status: 'ready' }> =>
  immutable({ status: 'ready' as const, route });

const incomplete = (
  route: VanRoute,
  gaps: readonly PayoutGap[],
): Extract<RouteDataCheck, { status: 'incomplete' }> =>
  immutable({ status: 'incomplete' as const, route, gaps });

// `missingField(route, 'pix-key')` devolve o READINESS incompleto — não o campo. O nome diz o
// motivo da incompletude, que é o que o chamador está afirmando ao usá-lo.
const missingField = (
  route: VanRoute,
  field: PayoutGap['field'],
): Extract<RouteDataCheck, { status: 'incomplete' }> =>
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

// Traduz o erro da conversão no motivo que o operador lê. Forma o mesmo par que `checkDigitGaps` em
// `payee-account.ts`: a aritmética diz o que é verdade sobre o dígito, e a POLÍTICA — esta função —
// decide o que o sistema faz com isso.
//
// `unknown-length` → `malformed`. Com 44, 47 e 48 todos mapeados, não sobra formato de boleto que o
// sistema não saiba converter: o que chega com outro comprimento é código truncado ou digitado a
// mais. `unmappable` significa outra coisa neste domínio — "há um dado legítimo de outra natureza e
// ninguém sabe traduzi-lo", como o nome de banco em texto livre de `readBankCode`. Um código de
// barras pela metade não é isso, e `unmappable` era justamente o balde errado que a #788 esvaziou.
//
// `field-check-digit-mismatch` → `check-digit-mismatch`, e NÃO `malformed` como pedia literalmente
// o CA2 da #788: aquele critério foi escrito antes de a #734 criar o quarto motivo, e o que ele
// exige — que a recusa deixe de ser `unmappable` — continua valendo. 47 dígitos numéricos ESTÃO no
// formato certo; mandar "corrigir o formato" é mandar consertar o que já está certo (ver
// `types.ts` §PayoutGapReason). O operador errou UM dígito, e é isso que o motivo precisa dizer.
const reasonForConversionError = (error: DigitableLineError): PayoutGapReason => {
  switch (error) {
    case 'unknown-length':
      return 'malformed';
    case 'field-check-digit-mismatch':
      return 'check-digit-mismatch';
  }
};

const readBarcode = (raw: string | null, route: VanRoute): RouteDataCheck => {
  // Só dígitos: o cadastro guarda com pontuação em alguns casos, e o campo do arquivo é numérico.
  if (isBlank(raw)) return missingField(route, 'payment-detail');

  const barcode = resolveBarcode((raw ?? '').replace(/\D/g, ''));
  if (barcode.ok) return ready(route);

  const reason = reasonForConversionError(barcode.error);
  return incomplete(route, immutable([immutable({ field: 'payment-detail' as const, reason })]));
};

// A pendência de INSCRIÇÃO do favorecido no boleto, ou `null` quando não há pendência.
//
// Devolve `null` — e não um `ready` — de propósito: quem responde "está apto" é a checagem do código
// de barras, logo adiante. Se esta função devolvesse aptidão, haveria duas funções afirmando o mesmo
// desfecho por caminhos diferentes, e a que fosse consultada primeiro venceria por acidente de
// ordem. Aqui ela só sabe dizer o que FALTA.
//
// ⚠️ Favorecido ausente e favorecido com inscrição em branco caem no MESMO motivo, e é a resposta
// certa para o operador: nos dois casos o que ele faz é ir ao cadastro completar a inscrição.
// Distingui-los exigiria um motivo que descreve o encanamento ("o parceiro não resolveu") em vez do
// que ele precisa fazer — e `payee` nulo aqui também é o que `document.ts` passa de propósito, o que
// tornaria a distinção uma armadilha para o próximo a ler.
const readBilletPayee = (
  candidate: PayoutCandidate,
): Extract<RouteDataCheck, { status: 'incomplete' }> | null =>
  isBlank(candidate.payee?.document ?? null) ? missingField('billet', 'payee-document') : null;

const checkRouteData = (candidate: PayoutCandidate, route: VanRoute): RouteDataCheck => {
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

    // O dinheiro segue o código de barras, não a CONTA do favorecido: um fornecedor sem nenhum dado
    // bancário paga normalmente por boleto. É o que sustenta a decisão da P.O. de não bloquear o
    // lote — e o Segmento J confirma na fonte, por não ter campo algum de agência ou conta.
    //
    // ⚠️ MAS O BOLETO PASSOU A DEPENDER DA INSCRIÇÃO, e a distinção é fina: continua não olhando a
    // CONTA, e passou a olhar QUEM É. O Segmento J-52 (#891) identifica sacado e cedente por
    // CPF/CNPJ, e sem ele não há registro a emitir — só posições em branco. O emissor já recusa por
    // isso; sem esta linha, o pré-voo aprovaria e a recusa voltaria a chegar no último clique, que é
    // a divergência que a #837 fechou.
    //
    // A guia fica FORA da exigência de propósito: o J-52 é registro de título de COBRANÇA, e escrever
    // no domínio uma exigência que o layout não faz para aquela rota seria inventar norma. Hoje é
    // inócuo — a guia não tem emissor —, e é justamente por ser inócuo que a tentação de "já deixar
    // igual" precisa ser recusada por escrito.
    // ACUMULA, não para no primeiro: quem tem boleto sem código de barras E sem inscrição precisa
    // ver as duas pendências de uma vez. Uma volta ao cadastro por vez é a experiência que
    // `decomposePayeeAccount` já recusa para a conta, e não há razão para o boleto ser diferente.
    // O código de barras vem antes por ser dado DO TÍTULO; a inscrição, do cadastro.
    case 'billet': {
      const barcode = readBarcode(candidate.paymentDetail, route);
      const payeeGap = readBilletPayee(candidate);
      if (payeeGap === null) return barcode;

      const barcodeGaps = barcode.status === 'incomplete' ? barcode.gaps : [];
      return incomplete(route, immutable([...barcodeGaps, ...payeeGap.gaps]));
    }

    case 'tax-guide':
      return readBarcode(candidate.paymentDetail, route);
  }
};

// ⚠️ A ORDEM DAS DUAS PERGUNTAS É A DECISÃO, e ela não é arbitrária: o DADO é julgado primeiro, e só
// um cadastro completo chega a ser recusado por falta de emissor (#837, CA4).
//
// O motivo é que os dois fatos têm validades diferentes. A lacuna de cadastro é fato sobre o
// CADASTRO e não caduca — dizê-la deixa o operador com o título pronto para o dia em que a rota
// ganhar emissor. A ausência de emissor é fato sobre a IMPLEMENTAÇÃO e caduca sozinha. Invertida, a
// ordem esconderia a lacuna atrás de um `no-issuer` temporário, e no dia em que o emissor entrasse a
// pendência de cadastro reapareceria inteira, sem ninguém ter sido avisado enquanto havia tempo.
//
// É por isso que PIX sem chave sai como `pix-key` faltando, e não como "rota sem emissor": os dois
// motivos coexistem e não se confundem.
export const checkPayoutReadiness = (candidate: PayoutCandidate): PayoutReadiness => {
  const route = routeOf(candidate.paymentMethod);
  if (route === null) {
    return immutable({ status: 'out-of-van' as const, paymentMethod: candidate.paymentMethod });
  }

  const data = checkRouteData(candidate, route);
  if (data.status !== 'ready') return data;

  // A ÚNICA consulta à fonte de rotas com emissor deste lado da divergência — a outra é a de
  // `batchProfileFor`. Não há lista aqui: uma segunda cópia seria a terceira verdade sobre o mesmo
  // fato, e é ela que a #837 existe para não criar.
  return hasRemittanceIssuer(route) ? data : immutable({ status: 'no-issuer' as const, route });
};
