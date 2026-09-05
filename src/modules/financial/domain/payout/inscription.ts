// A INSCRIÇÃO (CPF/CNPJ) como o arquivo do banco precisa dela — fonte ÚNICA, no molde de
// `van-routes.ts` (#837) e de `pix-key.ts` (#948).
//
// ## O defeito que isto fecha (#863)
//
// `digits()` existe para tirar MÁSCARA: `12.345.678/0001-99` e `12345678000199` são o mesmo CNPJ, e
// converter um no outro é tradução de formato, papel legítimo da ACL. Aplicada a um documento
// ALFANUMÉRICO, ela deixa de tirar pontuação e passa a DESTRUIR CONTEÚDO:
//
//     digits('12ABC34501DE35', 14)  →  '00000123450135'   ← outra inscrição, 14 dígitos válidos
//
// O resultado é sintaticamente perfeito. O arquivo é aceito, o pagamento sai, e o favorecido chega
// ao banco identificado por um documento que não é o dele — a classe de defeito que só aparece na
// conciliação ou numa contestação. O `remittance-inspector` não pega, porque não é defeito de forma.
//
// ⚠️ **E o laudo do Bradesco de 05/09/2026 agravou isto**, ainda que não falasse dele. Ficou
// estabelecido que, no Pix, o PSP do recebedor cruza a inscrição do arquivo com o titular da chave no
// DICT, recusando com `PF` quando não bate. Uma inscrição deformada não é mais só um dado errado no
// arquivo: é a recusa do pagamento, sem que nada no ERP aponte a causa.
//
// ## Por que a regra vive no DOMÍNIO
//
// Mesma seta de dependência de sempre: quem precisa dela é `checkPayoutReadiness`, para recusar
// ANTES do `allocateNsa`, e domínio não alcança adapter. A fonte fica aqui e os montadores descem
// até ela — do contrário o pré-voo aprovaria o que o emissor recusa, que é a divergência da #837.
//
// ## O CNPJ alfanumérico não é hipótese
//
// A Receita emite CNPJ com letras desde 07/2026 (ADR-0044): doze posições alfanuméricas mais dois
// dígitos verificadores numéricos. O layout do Bradesco na v08 (jul/2025) é anterior e declara o
// campo `Num` — ele não acompanhou.

/**
 * A inscrição sem máscara, preservando letras.
 *
 * ⚠️ ESTA FUNÇÃO É A RESPOSTA À CONTRADIÇÃO INTERNA que a #863 aponta. O reader
 * (`remittance-payment-reader.drizzle.ts`) já normalizava assim, PRESERVANDO letras e citando o
 * ADR-0044; três camadas adiante, `digits()` as removia de volta. Duas decisões opostas sobre o mesmo
 * dado, nenhuma citando a outra. Agora há uma função só, e os dois lados a chamam.
 *
 * Maiúsculas porque o CNPJ alfanumérico da RFB é definido em maiúsculas — `12abc3` e `12ABC3` são a
 * mesma inscrição, e deixar as duas formas circularem produziria comparações que falham por caixa.
 */
export const normalizeInscription = (raw: string): string =>
  raw.replace(/[^0-9A-Za-z]/g, '').toUpperCase();

const DIGITS_ONLY = /^\d+$/;

/**
 * "Esta inscrição pode ser escrita num campo `Num` do CNAB sem virar outra?"
 *
 * Só é `true` para inscrição não-vazia e inteiramente numérica depois de tirada a máscara. Documento
 * alfanumérico responde `false` — e a recusa é DELIBERADA, não uma limitação a contornar depois:
 *
 *   · **emitir com as letras** num campo declarado `Num` produz arquivo que o banco pode recusar, e
 *     a recusa chegaria depois do NSA queimado;
 *   · **remover as letras** é o defeito que esta função existe para impedir;
 *   · **converter** (o `ASCII − 48` que a RFB define) NÃO é uma opção que se escolha sozinho: aquela
 *     regra é para CALCULAR o dígito verificador, não para transmitir a inscrição, e usá-la aqui
 *     inventaria um formato que o banco não pediu.
 *
 * ⚠️ **HÁ PERGUNTA EM ABERTO AO BANCO** (#863): o Bradesco aceita CNPJ alfanumérico no CNAB 240, e em
 * que forma? Enquanto não houver resposta ESCRITA, recusar com nome próprio é a única saída que não
 * inventa layout nem paga errado. No dia em que a resposta chegar, é esta função que muda — e o
 * pré-voo e os sete pontos de escrita a acompanham sem tocar em nada mais.
 */
export const isCnabEmittableInscription = (raw: string): boolean => {
  const normalized = normalizeInscription(raw);
  return normalized !== '' && DIGITS_ONLY.test(normalized);
};
