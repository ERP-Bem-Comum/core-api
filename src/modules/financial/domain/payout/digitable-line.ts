import { type Result, err, ok } from '../../../../shared/primitives/result.ts';

// Conversão da LINHA DIGITÁVEL para o CÓDIGO DE BARRAS que o Segmento J grava no G063 (issue #788).
//
// A régua do payout recusava 47 dígitos como `unmappable` — "dado presente e inaproveitável" —
// enquanto a P.O. definia a linha digitável como O dado do boleto: é ela que vem impressa e é ela
// que o operador digita. Este módulo é a conversão que faltava.
//
// ⚠️ A conversão NÃO recalcula dígito verificador nenhum. Ela REORDENA: os 44 dígitos do código de
// barras já estão todos na linha digitável, embaralhados em blocos, com DVs de bloco intercalados
// que o código de barras não carrega. O DV geral muda de LUGAR (linha 33 → barcode 5), nunca de
// valor. Quem recalcular DV aqui está resolvendo outro problema — e vai errar, porque a regra de
// resto do módulo 11 da COBRANÇA difere da regra da ARRECADAÇÃO.
//
// FONTE PRIMÁRIA — FEBRABAN, "Layout Padrão de Arrecadação/Recebimento com Utilização do Código de
// Barras", versão 7 de 01/03/2023 (consultado em 25/08/2026):
//   §03-E  "Deverá haver uma representação numérica do conteúdo […] distribuída em campos de 11
//           posições dentro de boxes, acrescido de 1 dígito verificador, módulo-10 ou módulo 11 de
//           acordo com o código de moeda escolhido, a cada grupo […] Os dígitos verificadores não
//           estarão representados no Código de Barras."
//   §04    layout do código de barras de arrecadação: 01 produto · 02 segmento · 03 identificação
//           do valor · 04 DV geral · 05-15 valor · 16-19 empresa/órgão · 20-44 campo livre.
//   §07    DAC módulo 10 — multiplicadores 2,1,2,1… da direita para a esquerda; soma dos
//           ALGARISMOS do produto; DAC = 10 − resto; resto 0 ⇒ DAC 0.
//   §09    DAC módulo 11 — multiplicadores 2,3,4,5,6,7,8,9,2,3,4… da direita para a esquerda; soma
//           dos PRODUTOS; resto 0 ou 1 ⇒ DV 0; resto 10 ⇒ DV 1.
//
// ⚠️ Fontes secundárias sobre a conversão de COBRANÇA divergem entre si e pelo menos uma publica um
// mapeamento impossível (campo livre indo para as posições 5-29 do código de barras, que colidem
// com DV geral, fator de vencimento e valor, e somam mais de 44). O mapeamento abaixo é o único
// aritmeticamente consistente, e é auto-verificável: converter e reconverter fecha, e o DV geral
// preservado confere com o dígito que a própria linha carrega.

export type DigitableLineError = 'unknown-length' | 'field-check-digit-mismatch';

const digitAt = (value: string, index: number): number => Number(value[index] ?? '0');

// §07 — soma dos ALGARISMOS do produto, não do produto. `2 × 8 = 16` contribui com 7, não 16.
const mod10 = (block: string): number => {
  let sum = 0;
  let weight = 2;
  for (let i = block.length - 1; i >= 0; i--) {
    const product = digitAt(block, i) * weight;
    sum += product > 9 ? Math.floor(product / 10) + (product % 10) : product;
    weight = weight === 2 ? 1 : 2;
  }
  const rest = sum % 10;
  return rest === 0 ? 0 : 10 - rest;
};

// §09 — regra de resto PRÓPRIA da arrecadação. A cobrança usa outra, e por isso ela não vive aqui:
// este módulo não valida o DV geral de cobrança, e não precisa.
const mod11Arrecadacao = (block: string): number => {
  let sum = 0;
  let weight = 2;
  for (let i = block.length - 1; i >= 0; i--) {
    sum += digitAt(block, i) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rest = sum % 11;
  if (rest === 0 || rest === 1) return 0;
  if (rest === 10) return 1;
  return 11 - rest;
};

// COBRANÇA — 47 dígitos, três blocos com DV de bloco (módulo 10) mais o DV geral solto.
//
//   linha  1-3   banco          → barcode  1-3
//   linha  4     moeda          → barcode  4
//   linha  5-9   campo livre    → barcode 20-24
//   linha 10     DV do bloco 1  (não vai ao código de barras)
//   linha 11-20  campo livre    → barcode 25-34
//   linha 21     DV do bloco 2  (não vai)
//   linha 22-31  campo livre    → barcode 35-44
//   linha 32     DV do bloco 3  (não vai)
//   linha 33     DV geral       → barcode  5
//   linha 34-47  fator venc. + valor → barcode 6-19
const fromCobrancaLine = (line: string): Result<string, DigitableLineError> => {
  const block1 = line.slice(0, 9);
  const block2 = line.slice(10, 20);
  const block3 = line.slice(21, 31);

  const checksMatch =
    mod10(block1) === digitAt(line, 9) &&
    mod10(block2) === digitAt(line, 20) &&
    mod10(block3) === digitAt(line, 31);

  if (!checksMatch) return err('field-check-digit-mismatch');

  const bankAndCurrency = line.slice(0, 4);
  const generalCheckDigit = line.slice(32, 33);
  const dueFactorAndValue = line.slice(33, 47);
  const freeField = block1.slice(4) + block2 + block3;

  return ok(bankAndCurrency + generalCheckDigit + dueFactorAndValue + freeField);
};

// ARRECADAÇÃO — 48 dígitos: quatro blocos de 11, cada um seguido do seu DV. Converter é remover os
// quatro DVs. O módulo do DV depende da posição 3 do código de barras (identificador de valor):
// "6"/"7" ⇒ módulo 10; "8"/"9" ⇒ módulo 11 (§05).
const fromArrecadacaoLine = (line: string): Result<string, DigitableLineError> => {
  const valueId = line[2];
  const checkDigitOf = valueId === '8' || valueId === '9' ? mod11Arrecadacao : mod10;

  let barcode = '';
  for (let i = 0; i < 4; i++) {
    const start = i * 12;
    const block = line.slice(start, start + 11);
    if (checkDigitOf(block) !== digitAt(line, start + 11)) return err('field-check-digit-mismatch');
    barcode += block;
  }
  return ok(barcode);
};

// A entrada é o `payment_detail` do título, já reduzido a dígitos pelo chamador. O comprimento é o
// que discrimina o formato — e é por isso que a guia de 48 tinha de sair do balde `malformed`: ela
// nunca foi dado errado, era um terceiro comprimento que ninguém tinha mapeado.
export const resolveBarcode = (digitsOnly: string): Result<string, DigitableLineError> => {
  switch (digitsOnly.length) {
    case 44:
      return ok(digitsOnly);
    case 47:
      return fromCobrancaLine(digitsOnly);
    case 48:
      return fromArrecadacaoLine(digitsOnly);
    default:
      return err('unknown-length');
  }
};
