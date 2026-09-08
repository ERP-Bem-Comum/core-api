import { immutable } from '../../../../shared/primitives/immutable.ts';

// Verificação do dígito verificador da CONTA por CÁLCULO, não por inspeção (issue #734, CA5).
//
// O problema que isto resolve: `CHECK_DIGIT_RE` em `payee-account.ts` valida FORMA — um dígito
// bem-formado é aceito esteja ele certo ou errado. A medição em produção (17/08/2026) encontrou 44
// de 86 cadastros cujo campo DV coincide com o DV da AGÊNCIA, e o excesso sobre o acaso (~35) só se
// explica por cópia do campo errado. Nenhuma inspeção do campo separa correto de contaminado; só o
// cálculo separa.
//
// ⚠️ Por que isso deixou de ser risco e virou certeza: o Manual de Procedimentos 4008-523-0096 v16
// (jun/2019, p. 29 — `handbook/guidelines/`, local-only) diz que na Modalidade 01, "Crédito em Conta
// Corrente no Bradesco", **"serão validados os dígitos de controle da Agência e da conta corrente"**.
// A modalidade 01 é exatamente a do piloto. Um DV errado não passa despercebido: é recusado.

// Algoritmo, do mesmo manual, p. 30, §"CÁLCULO DO DÍGITO DE CONTROLE DA AGÊNCIA E C/C BRADESCO":
//
//   "Conta-Corrente Bradesco: Módulo 11 Universal, com pesos 2 a 7, e somente para o próprio campo,
//    ou seja, sem considerar o campo Agência. O critério a ser adotado deve ser o mesmo ao da
//    agência" — e o da agência é: multiplicar da direita para a esquerda por 2, 3, 4, 5…, somar,
//    dividir por 11, e o dígito é 11 menos o resto.
//
//   "Nota: Se o resto da divisão for 0 (zero), o dígito será igual a zero (0), e se o resto for 1
//    (um), o dígito poderá ser igual a zero ou 'P'."
//
// "somente para o próprio campo" é a frase que mata a hipótese de causa-raiz da #734: o DV da conta
// NÃO consulta a agência, então o dígito da agência jamais é resposta certa para uma conta — exceto
// por coincidência aritmética.
const BANK_BRADESCO = '237';

// Pesos 2 a 7 ciclando da direita para a esquerda. Calculado, não indexado: `2 + (index % 6)` não
// tem posição fora de faixa para `noUncheckedIndexedAccess` reclamar, e diz o que o manual diz.
const weightAt = (positionFromRight: number): number => 2 + (positionFromRight % 6);

const DIGITS_ONLY_RE = /^\d+$/;

// O veredito é TRI-estado, e o terceiro não é detalhe: `not-verifiable` é a resposta honesta para
// banco cujo algoritmo não está no acervo (CA6). Colapsá-lo em `match` afirmaria uma verificação que
// não houve; colapsá-lo em `mismatch` recusaria pagamento por ignorância nossa. Nenhum dos dois é
// aceitável quando o desfecho é dinheiro.
export type CheckDigitVerdict =
  | Readonly<{ status: 'match' }>
  // `expected` é uma LISTA porque o manual admite duas respostas certas quando o resto é 1. Devolver
  // uma delas reprovaria metade dos cadastros legítimos nesse caso.
  | Readonly<{ status: 'mismatch'; expected: readonly string[] }>
  | Readonly<{ status: 'not-verifiable'; reason: CheckDigitUnverifiable }>;

// `unsupported-bank` é ausência de conhecimento NOSSO — o algoritmo daquele banco não está no
// acervo. `account-not-numeric` é defeito do dado. A distinção existe porque a ação é outra: a
// primeira se resolve com documentação, a segunda com correção de cadastro.
export type CheckDigitUnverifiable = 'unsupported-bank' | 'account-not-numeric';

// Dígitos aceitáveis para uma conta Bradesco. Sempre ao menos um; dois quando o resto é 1.
//
// Zeros à esquerda são inócuos por construção: o peso cresce da direita para a esquerda, então um
// zero à mais à esquerda contribui `0 × peso = 0`. Isso importa porque `decomposePayeeAccount`
// entrega a conta já com `padStart(12, '0')` — e o cálculo tem de dar o mesmo resultado antes e
// depois do padding. Há teste fixando essa equivalência.
export const bradescoAccountCheckDigits = (accountDigits: string): readonly string[] => {
  // Percorre da esquerda para a direita e deriva a posição a partir da DIREITA — o `for…of` sobre a
  // string evita tanto o spread (que o ESLint barra por decompor caracteres compostos) quanto o
  // acesso indexado (que `noUncheckedIndexedAccess` obrigaria a destratar com `?? '0'`, escondendo
  // um índice fora de faixa atrás de um zero plausível). Mesmo idioma de `auth/domain/identity/cpf.ts`.
  let weightedSum = 0;
  let positionFromLeft = 0;
  for (const char of accountDigits) {
    weightedSum += Number(char) * weightAt(accountDigits.length - 1 - positionFromLeft);
    positionFromLeft += 1;
  }

  const rest = weightedSum % 11;
  if (rest === 0) return immutable(['0']);
  if (rest === 1) return immutable(['0', 'P']);
  return immutable([String(11 - rest)]);
};

// Confronta o DV informado no cadastro com o que o algoritmo do banco produz.
//
// A comparação é case-insensitive porque o `P` do manual chega do cadastro como `p` sem que isso
// signifique outra coisa — e `payee-account.ts` já normaliza para maiúscula na leitura.
export const verifyAccountCheckDigit = (
  bankCode: string,
  accountDigits: string,
  informedDigit: string,
): CheckDigitVerdict => {
  if (bankCode !== BANK_BRADESCO) {
    return immutable({ status: 'not-verifiable' as const, reason: 'unsupported-bank' as const });
  }
  if (!DIGITS_ONLY_RE.test(accountDigits)) {
    return immutable({
      status: 'not-verifiable' as const,
      reason: 'account-not-numeric' as const,
    });
  }

  const expected = bradescoAccountCheckDigits(accountDigits);
  return expected.includes(informedDigit.toUpperCase())
    ? immutable({ status: 'match' as const })
    : immutable({ status: 'mismatch' as const, expected });
};

// ─── Agência ──────────────────────────────────────────────────────────────────────────────────────
//
// O MESMO cálculo, e isto é fonte primária, não inferência: o manual p. 30 abre com "Agência
// Bradesco: Módulo 11 Universal, com pesos 2 a 7" e exemplifica com a AGÊNCIA (`9999 → 6`); só
// depois diz da conta que "o critério a ser adotado deve ser o mesmo ao da agência". A função acima
// nasceu com o nome da conta porque a conta foi o consumidor que a #734 precisava — o algoritmo
// sempre foi dos dois campos. Delegar em vez de copiar é o que impede as duas de divergirem no dia
// em que uma mudar.
//
// ⚠️ Verificar o DV da agência NÃO torna o campo obrigatório. G009 declara o dígito "Campo Não
// Obrigatório – Informação Opcional", e o Validador Universal confirma pela ausência: na recusa de
// 08/09/2026 ele apontou as colunas 053-057 (a agência) e 024-028 (a do favorecido), e **nunca** a
// posição do DV, que estava em branco nas três linhas. Ausente segue aceito; o que se verifica é o
// dígito que o cadastro AFIRMA.
export const verifyAgencyCheckDigit = (
  bankCode: string,
  agencyDigits: string,
  informedDigit: string,
): CheckDigitVerdict => verifyAccountCheckDigit(bankCode, agencyDigits, informedDigit);

// Largura da agência no segmento A (024-028) e no header (053-057). Vale como GATILHO da suspeita
// abaixo, nunca como veredito: o manual não declara quantos dígitos tem uma agência Bradesco, e
// afirmar "são quatro" seria justamente o tipo de premissa que este repositório já pagou caro.
const AGENCY_FIELD_WIDTH = 5;

/**
 * O campo de agência traz o DV embutido, PROVADO por aritmética?
 *
 * Responde `true` só quando o campo ocupa a largura inteira **e** o último dígito é exatamente o DV
 * módulo 11 dos anteriores. Nesse ponto a leitura deixa de ser palpite: `12343` é `1234` + DV `3`,
 * e a chance de um campo legítimo cair aí por acaso é de 1 em 11 — contra a certeza de que, quando
 * cai, o operador tem algo a conferir.
 *
 * ⚠️ Isto NÃO decompõe, e a recusa em decompor é a regra que atravessa `payee-account.ts`: **nada é
 * inventado**. Saber que `12343` provavelmente é `1234-3` não autoriza escrever `01234` na posição
 * 024-028 — um dígito errado ali não falha o arquivo, paga a conta de outra pessoa. A função existe
 * para produzir uma lacuna que devolve a decisão a quem tem a informação, o operador.
 *
 * Fora do 237 devolve `false` sempre: o algoritmo é do Bradesco, e aplicá-lo a outro banco
 * fabricaria suspeita a partir de aritmética que não vale ali.
 */
export const agencyHasEmbeddedCheckDigit = (bankCode: string, agencyDigits: string): boolean => {
  if (bankCode !== BANK_BRADESCO) return false;
  if (agencyDigits.length !== AGENCY_FIELD_WIDTH) return false;
  if (!DIGITS_ONLY_RE.test(agencyDigits)) return false;

  const base = agencyDigits.slice(0, AGENCY_FIELD_WIDTH - 1);
  const last = agencyDigits.slice(AGENCY_FIELD_WIDTH - 1);
  return bradescoAccountCheckDigits(base).includes(last);
};
