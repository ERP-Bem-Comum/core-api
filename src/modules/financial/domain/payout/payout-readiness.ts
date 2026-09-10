import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { PaymentMethod } from '../document/types.ts';
import { type DigitableLineError, resolveBarcode } from './digitable-line.ts';
import { hasInscription, isCnabEmittableInscription } from './inscription.ts';
import { decomposePayeeAccount } from './payee-account.ts';
import { isPayablePixKeyType, pixKeyFitsField } from './pix-key.ts';
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
    // ⚠️ O PIX EXIGE A CHAVE, E SÓ ELA — a exigência de bloco bancário que vigorou entre a #838 e a
    // #945 foi REVERTIDA, e esta nota existe para que ela não volte por releitura do golden.
    //
    // O argumento que a sustentava era: o Segmento A do golden `GOLDEN_TEST_MULTIPAG_PIX_240` traz
    // banco, agência, DV, conta e DV do favorecido preenchidos, e o layout marca os campos com
    // asterisco. Os dois fatos são verdadeiros e nenhum dos dois sustenta a conclusão:
    //
    //   · o golden prova como AQUELE arquivo foi montado, não o que o ERP deve coletar;
    //   · o asterisco, pela legenda do próprio manual (p. 7), significa "merece atenção especial",
    //     NÃO "obrigatório" — o manual chega a marcar `*G009` (DV da agência) e escrever na descrição
    //     "(Campo Não Obrigatório – Informação Opcional)". E o `P002`, código do banco do favorecido,
    //     não tem asterisco, embora agência e conta sem banco não signifiquem nada.
    //
    // **A arbitragem veio do banco, por escrito** (laudo da equipe Multipag Pix/VAN, 05/09/2026):
    // banco, agência e conta do favorecido podem sair ZERADOS quando o Pix é iniciado por chave. O
    // emissor passou a fazê-lo (`PIX_ZEROED_PAYEE_ACCOUNT`), e é isso que autoriza esta régua a
    // relaxar — nesta ordem, nunca na inversa: enquanto o Segmento A lia a conta do cadastro, um
    // pré-voo permissivo aprovaria o que o montador recusaria com `numeric-field-invalid`, DEPOIS do
    // `allocateNsa`. É exatamente a divergência que a #837 fechou, e a razão de a #945 fixar os
    // passos em sequência.
    //
    // A dependência transversal que existia também caiu: `payeeIspbFor` derivava o ISPB do código de
    // compensação do cadastro, e desde a #923 o ISPB é constante do layout. Não sobrou nada na rota
    // Pix que leia o bloco bancário do favorecido.
    //
    // Chave em branco é chave ausente: o cadastro guarda `''` com mais frequência que `null` (ver o
    // CHECK do bloco bancário, em `types.ts`). E conta completa NÃO substitui a chave — quem escolheu
    // PIX no lançamento paga por PIX, e trocar a rota mudaria o custo e o prazo que ele aceitou.
    //
    // ⚠️ Efeito colateral DESEJADO, e que aparece na tela: some o `check-digit-mismatch` na rota Pix.
    // Favorecido com DV divergente era bloqueado aqui; passa a pagar, e está certo — o DV não vai no
    // arquivo. A régua de DV continua valendo onde o dígito é escrito, que é a transferência.
    // ⚠️ AS DUAS CONDIÇÕES DO EMISSOR (#948, CA1/CA2) SÃO VERIFICADAS AQUI, e não são zelo: as duas
    // recusas correspondentes vêm DEPOIS do `allocateNsa`, então cada tentativa queima um número da
    // série antes de o operador descobrir por quê. A régua vem de `pix-key.ts` — a MESMA fonte que o
    // emissor consome —, e é isso que impede as duas de divergirem outra vez.
    //
    // Nenhuma das duas é defesa contra dado malformado: as duas são alcançáveis por cadastro
    // perfeitamente legítimo. O cadastro aceita chave bem mais longa que as 99 posições do `G101`, e
    // o vocabulário de tipos de chave é de `partners`, que pode crescer sem que o `G100` cresça junto.
    case 'pix': {
      const key = candidate.payee?.pixKey?.key ?? null;
      const keyType = candidate.payee?.pixKey?.keyType ?? null;

      // Chave em branco é chave ausente: o cadastro guarda `''` com mais frequência que `null` (ver o
      // CHECK do bloco bancário, em `types.ts`). E conta completa NÃO substitui a chave — quem
      // escolheu PIX no lançamento paga por PIX, e trocar a rota mudaria o custo e o prazo aceitos.
      //
      // Sem chave, PARA AQUI em vez de acumular: as duas verificações seguintes são sobre a chave que
      // não existe, e listá-las mandaria o operador corrigir o comprimento de um campo vazio.
      if (isBlank(key)) return incomplete(route, missingField(route, 'pix-key').gaps);

      const gaps: PayoutGap[] = [];

      // `malformed`, e NÃO `unmappable` — desvio deliberado da letra da CA1 da #948, que dizia
      // `unmappable`. Os dois motivos existem para dizer coisas diferentes ao operador
      // (`types.ts`): `unmappable` é "ninguém sabe converter isto", `malformed` é "está lá e precisa
      // ser corrigido". A chave longa demais É conversível e É uma chave — o que ela não é, é
      // representável no campo. E usar `unmappable` nas duas condições as tornaria indistinguíveis na
      // tela, que é justamente o que a lista de lacunas por CAMPO existe para evitar.
      if (!pixKeyFitsField(key ?? '')) gaps.push({ field: 'pix-key', reason: 'malformed' });

      // `unmappable` é o encaixe exato: o cadastro tem um tipo de chave que este layout não prevê, e
      // não há o que corrigir no valor — é preciso outra chave. Cobre também o `keyType` VAZIO, que o
      // reader recusa derrubando a geração inteira (a CA8, que sai de graça aqui).
      if (!isPayablePixKeyType(keyType ?? ''))
        gaps.push({ field: 'pix-key', reason: 'unmappable' });

      return gaps.length === 0 ? ready(route) : incomplete(route, immutable(gaps));
    }

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

// A pendência de INSCRIÇÃO ALFANUMÉRICA (#863), ou `null` quando não há.
//
// ⚠️ VERIFICADA FORA DO `switch` DE ROTA, e é a única régua deste arquivo que fica de fora. A razão
// é que ela não é propriedade da rota: TODA rota com emissor escreve a inscrição do FAVORECIDO — o
// Segmento B da transferência (019-032), o Segmento B do Pix (019-032), o `G031` do Segmento A no
// Pix (178-191) e o Segmento J-52 do boleto em 077-091, onde o cedente do título é o favorecido que
// o reader resolveu. Posta dentro do `switch`, ela seria três cópias, e uma rota nova nasceria sem
// ela — que é o modo de falha que este arquivo já colecionou.
//
// ⚠️ O QUE ELA NÃO COBRE, e a distinção é de PARTICIPANTE, não de rota: o emissor escreve inscrição
// em outros três pontos — header de arquivo e header de lote (019-032) e o SACADO do J-52 (021-035)
// — e nos três o dado é o da PRÓPRIA EMPRESA (`input.cedente.document`), que não chega aqui: um
// `PayoutCandidate` só carrega o favorecido. Ler "sete pontos de escrita" e concluir cobertura total
// é o engano a evitar; são quatro. Na prática o risco é baixo, porque a empresa já existe e sua
// inscrição é numérica — a Receita emite alfanumérico para inscrição NOVA (ADR-0044). Mas se um dia
// não for, toda remessa falha DEPOIS do `allocateNsa`, e é este parágrafo que diz onde procurar.
//
// `unmappable` é o motivo exato, e a escolha importa: o cadastro tem um dado LEGÍTIMO que ninguém
// sabe converter para o campo — é a mesma semântica do nome de banco em texto livre. NÃO é
// `malformed`: o CNPJ com letras está bem formado desde 07/2026 (ADR-0044), e mandar "corrigir o
// formato" mandaria o operador estragar uma inscrição correta.
//
// ⚠️ E é por isso que esta lacuna é a única do módulo cuja ação não é "vá ao cadastro". O que o
// operador faz é ESCALAR: a pergunta sobre como o Bradesco quer receber CNPJ alfanumérico no CNAB 240
// está registrada na #863 e ainda não foi respondida. A tela precisa dizer isso, e não oferecer um
// campo para corrigir.
const readAlphanumericInscription = (
  candidate: PayoutCandidate,
  route: VanRoute,
): Extract<RouteDataCheck, { status: 'incomplete' }> | null => {
  const document = candidate.payee?.document ?? '';

  // Inscrição AUSENTE não é assunto desta régua — quem a cobra é `readBilletPayee`, no boleto. Aqui
  // o `false` de `isCnabEmittableInscription` cobriria os dois casos, e reportar "não sei converter"
  // sobre um campo vazio mandaria o operador ao lugar errado.
  if (document.trim() === '') return null;

  // ⚠️ DOCUMENTO SÓ COM PONTUAÇÃO — `'---'`, `'.'`, `'./-'` — É INSCRIÇÃO AUSENTE, e não inscrição
  // que ninguém sabe converter. Ele sobrevive ao `trim()` acima e normaliza para vazio, que é como o
  // emissor o enxerga: `inscription()` o devolve `numeric-field-invalid`, e há caso fixando isso em
  // `inscription-single-source.test.ts`. Sem esta linha ele cairia no `unmappable` abaixo — por não
  // ser numérico — e a tela mandaria ESCALAR ao gerente uma conversa sobre CNPJ alfanumérico que não
  // existe naquele cadastro. É a mesma classe de divergência pré-voo/emissor que a #837 fechou, e
  // custa mais aqui do que nas outras: `unmappable` é a única lacuna do módulo cuja ação não é "vá ao
  // cadastro", justamente a ação que este caso exige.
  //
  // `missing`, e o motivo é o de `readBilletPayee`: campo em branco e campo sem nenhum alfanumérico
  // pedem a MESMA coisa do operador — ir ao cadastro completar a inscrição.
  if (!hasInscription(document)) return missingField(route, 'payee-document');

  if (isCnabEmittableInscription(document)) return null;

  return incomplete(
    route,
    immutable([immutable({ field: 'payee-document' as const, reason: 'unmappable' as const })]),
  );
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

  // #863 — ACUMULA com o que a rota já apontou, em vez de substituir. Quem tem chave Pix longa demais
  // E inscrição alfanumérica precisa ver as duas: são pendências independentes, e resolver uma não
  // libera o título. Mesma disciplina do boleto, que soma código de barras e inscrição.
  const inscriptionGap = readAlphanumericInscription(candidate, route);
  if (inscriptionGap !== null) {
    const routeGaps = data.status === 'incomplete' ? data.gaps : [];
    return incomplete(route, immutable([...routeGaps, ...inscriptionGap.gaps]));
  }

  if (data.status !== 'ready') return data;

  // A ÚNICA consulta à fonte de rotas com emissor deste lado da divergência — a outra é a de
  // `batchProfileFor`. Não há lista aqui: uma segunda cópia seria a terceira verdade sobre o mesmo
  // fato, e é ela que a #837 existe para não criar.
  return hasRemittanceIssuer(route) ? data : immutable({ status: 'no-issuer' as const, route });
};
