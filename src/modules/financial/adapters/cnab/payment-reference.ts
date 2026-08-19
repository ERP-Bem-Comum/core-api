// A referência do pagador — G064 "Seu Número", Segmento A colunas 074-093 (#752).
//
// É a ÚNICA chave de casamento do retorno que é NOSSA. O banco devolve no retorno exatamente o que
// escrevemos aqui; se sair em branco, o arquivo de retorno chega e não há por onde ligá-lo ao
// título. Hoje o emissor aplica `input.yourNumber ?? ''` (`multipag-segments.ts:108`) e nenhum
// caminho de código o preenche — a remessa é aceita pelo banco e o defeito só aparece meses depois,
// no primeiro retorno, com a causa em arquivos já transmitidos.
//
// ⚠️ A ORDEM IMPORTA: a chave precisa existir antes da PRIMEIRA TRANSMISSÃO REAL, não antes do
// parser de retorno. Remessa que sai hoje sem referência é retorno que nunca casa, mesmo que o
// parser fique perfeito depois. É por isso que este arquivo pequeno bloqueia o item grande.
//
// As cinco restrições, todas simultâneas (#752 CA1-CA5):
//
//   CA1  não vazia
//   CA2  REVERSÍVEL — da referência se resolve o título, sem ambiguidade. Não basta ser única
//   CA3  sem fallback silencioso: não resolvível vira erro nomeado, com o documento identificado
//   CA4  não se repete ENTRE remessas — reuso produz casamento ambíguo no retorno
//   CA5  cabe em 20 posições, íntegra. Truncar produz colisão silenciosa
//
// O aperto está em CA2 + CA5 juntos: `documentId` é UUID (36 caracteres, 32 sem hífens) e não cabe
// nos 20 do campo. Qualquer solução ou reduz o identificador — e aí precisa provar como se volta
// dele ao título — ou carrega um identificador próprio, e aí precisa dizer onde o vínculo mora.
import { type Result, err, ok } from '#src/shared/primitives/result.ts';

/** G064 ocupa as colunas 074-093 do Segmento A: vinte posições, sem exceção. */
export const MAX_REFERENCE_LENGTH = 20;

export type PaymentReferenceInput = Readonly<{
  /** UUID do documento a pagar — o que o retorno precisa alcançar de volta. */
  documentId: string;
  /** Sequencial do arquivo. Único por conta-cedente, nunca reaproveitado (G018). */
  nsa: number;
  /** Posição do pagamento dentro do arquivo, base 1. */
  indexInFile: number;
  /** Momento de geração da remessa — vira o bloco de data da referência. */
  generatedAt: Date;
}>;

// Faixas dos blocos. O NSA tem seis dígitos porque é o que o header comporta (G018) e o banco
// recusa arquivo com contador zerado. O índice tem quatro: 9.999 pagamentos num arquivo é ordem de
// grandeza acima do que a operação produz, e estourar isso é sinal de que algo está errado a
// montante — por isso vira erro, não truncamento silencioso (CA5).
const NSA_DIGITS = 6;
const INDEX_DIGITS = 4;
const NSA_MAX = 999_999;
const INDEX_MAX = 9_999;

/**
 * Bloco de data, em UTC e deliberadamente.
 *
 * Os componentes locais dependeriam do fuso do processo, e a mesma remessa geraria referências
 * diferentes conforme o container — quebrando o CA4 sem que nada pareça errado. A data aqui é
 * DIAGNÓSTICO (permite ao operador situar o retorno no arquivo de origem), nunca regra de negócio:
 * quem decide vencimento e competência é o domínio, com os VOs próprios.
 */
const dateBlock = (at: Date): string =>
  String(at.getUTCFullYear()).padStart(4, '0') +
  String(at.getUTCMonth() + 1).padStart(2, '0') +
  String(at.getUTCDate()).padStart(2, '0');

export type PaymentReferenceError = Readonly<{
  tag: 'payment-reference-unresolvable';
  documentId: string;
  reason: string;
}>;

/** Guarda de borda: nenhuma referência sai daqui violando CA1 ou CA5. */
export const isEmittableReference = (raw: string): boolean =>
  raw.length > 0 && raw.length <= MAX_REFERENCE_LENGTH;

export const unresolvable = (documentId: string, reason: string): PaymentReferenceError => ({
  tag: 'payment-reference-unresolvable',
  documentId,
  reason,
});

/**
 * Monta a referência que vai no G064 e pela qual o retorno encontrará o título.
 *
 * A decisão de COMPOSIÇÃO é o conteúdo desta função, e ela determina se o CA2 se sustenta: uma
 * referência que não permita voltar ao título satisfaz CA1, CA4 e CA5 e ainda assim deixa o retorno
 * sem casamento — que é exatamente o defeito que a #752 existe para fechar.
 */
export const buildPaymentReference = (
  input: PaymentReferenceInput,
): Result<string, PaymentReferenceError> => {
  // CA3: cada recusa nomeia o DOCUMENTO, não só o campo. Uma falha que diz "referência inválida"
  // sem dizer qual título obriga o operador a caçar a linha num arquivo de milhares.
  if (input.documentId.trim() === '') {
    return err(unresolvable(input.documentId, 'documentId vazio'));
  }
  if (!Number.isInteger(input.nsa) || input.nsa < 1 || input.nsa > NSA_MAX) {
    return err(unresolvable(input.documentId, `nsa fora da faixa 1..${NSA_MAX}: ${input.nsa}`));
  }
  if (
    !Number.isInteger(input.indexInFile) ||
    input.indexInFile < 1 ||
    input.indexInFile > INDEX_MAX
  ) {
    return err(
      unresolvable(
        input.documentId,
        `indexInFile fora da faixa 1..${INDEX_MAX}: ${input.indexInFile}`,
      ),
    );
  }
  // `new Date('lixo')` produz Invalid Date, cujos getters devolvem NaN — e `NaN` formatado viraria
  // "NaNNaNNaN" numa referência que o banco aceitaria sem reclamar.
  if (Number.isNaN(input.generatedAt.getTime())) {
    return err(unresolvable(input.documentId, 'generatedAt invalido'));
  }

  const reference =
    dateBlock(input.generatedAt) +
    String(input.nsa).padStart(NSA_DIGITS, '0') +
    String(input.indexInFile).padStart(INDEX_DIGITS, '0');

  // Guarda final (CA1 + CA5). As faixas acima já garantem 18 posições, mas a checagem fica porque é
  // ela que transforma um erro de formato futuro em recusa, e não em campo truncado dentro do
  // arquivo — truncar produz colisão silenciosa, que é o pior desfecho possível aqui.
  return isEmittableReference(reference)
    ? ok(reference)
    : err(unresolvable(input.documentId, `referencia com tamanho invalido: ${reference.length}`));
};
