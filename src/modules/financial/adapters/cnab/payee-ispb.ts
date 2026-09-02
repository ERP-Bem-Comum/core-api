import { ok, err, type Result } from '#src/shared/index.ts';

import { ISPB_BY_BANK_CODE } from './ispb-by-bank-code.generated.ts';

/*
 * O ISPB do favorecido, derivado do código de compensação (#923).
 *
 * A modalidade Pix do Multipag exige o ISPB em 8 posições no `P015` do Segmento B (pág. 40) e no
 * complemento do `G031` (pág. 101, "I = Código do ISPB – 8 dígitos"). O cadastro não guarda esse
 * dado, e a decisão de 01/09/2026 (#923) foi DERIVÁ-LO de uma tabela embarcada em vez de coletá-lo:
 * o ISPB não descreve o parceiro, descreve como o SPI o endereça — é vocabulário do sistema externo,
 * e traduzi-lo é trabalho de quem monta o arquivo, não do cadastro.
 *
 * ⚠️ VIVE NO ADAPTER, e não no domínio. `partners` não conhece ISPB e não deve conhecer: a tradução
 * é da fronteira com o banco, e é aqui que ela morre quando o layout mudar. Foi por isso que esta
 * escolha reescreveu a CA2 da #923, que supunha o dado chegando por `partners/public-api/`.
 */

// Erro PRÓPRIO, e não um `translation-failed` genérico: a ação de quem recebe é diferente. Aqui não
// há defeito no emissor nem dado a corrigir no título — é o banco do favorecido que não está na
// tabela, e a saída é atualizar a fonte do Bacen (ou corrigir o cadastro, se o código estiver errado).
export type PayeeIspbError = 'payee-ispb-unknown';

// Três posições, e é a forma que o cadastro entrega depois de `decomposePayeeAccount` — que já extrai
// o código do texto livre (`237 - Banco…`). Validar aqui de novo NÃO é redundância: esta função é
// chamada com o resultado daquela, e uma string vazia ou de outro comprimento chegaria como chave
// inexistente, produzindo o mesmo erro por uma razão diferente. Nomear a forma separa "banco que não
// conheço" de "não consegui ler o banco", e são chamados distintos.
const BANK_CODE_SHAPE = /^\d{3}$/;

export const payeeIspbFor = (bankCode: string): Result<string, PayeeIspbError> => {
  if (!BANK_CODE_SHAPE.test(bankCode)) return err('payee-ispb-unknown');

  const ispb = ISPB_BY_BANK_CODE[bankCode];
  // `undefined` é instituição fora da tabela — banco novo, ou fonte desatualizada. NUNCA cair para
  // zeros, brancos ou para o próprio código zero-padded: os três produzem arquivo bem-formado que o
  // banco recusa, e o `remittance-inspector.ts` não pega, porque não é defeito de forma. É a mesma
  // classe do `?? ''` que virou endereço em branco em 100% das remessas (#858).
  return ispb === undefined ? err('payee-ispb-unknown') : ok(ispb);
};
