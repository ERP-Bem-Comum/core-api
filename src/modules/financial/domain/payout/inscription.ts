// A INSCRIÇÃO (CPF/CNPJ) como o arquivo do banco precisa dela — fonte ÚNICA, no molde de
// `van-routes.ts` (#837) e de `pix-key.ts` (#948).
//
// ## Por que a regra vive no DOMÍNIO
//
// Mesma seta de dependência de sempre: quem precisa dela é o emissor E o reader, em camadas
// diferentes, e adapter não alcança adapter. Com a regra no domínio, os dois descem até ela.
//
// ## O CNPJ alfanumérico não é hipótese
//
// A Receita emite CNPJ com letras desde 07/2026 (ADR-0044): doze posições alfanuméricas mais dois
// dígitos verificadores numéricos. É por isso que a normalização preserva letras — e a preservação
// não é cosmética: ela é o que mantém o COMPRIMENTO fiel, e é do comprimento que sai o tipo.

/**
 * A inscrição sem máscara, preservando letras.
 *
 * ⚠️ ERA UM `cleanDocument` PRIVADO do reader (`remittance-payment-reader.drizzle.ts`), e subiu aqui
 * na #856 porque passou a ter um segundo chamador: o cedente, cujo tipo de inscrição também sai do
 * comprimento. Duas cópias idênticas caractere a caractere é a configuração que a #863 documenta como
 * causa — elas concordam por acidente até o dia em que uma muda.
 *
 * Maiúsculas porque o CNPJ alfanumérico da RFB é definido em maiúsculas — `12abc3` e `12ABC3` são a
 * mesma inscrição, e deixar as duas formas circularem produziria comparações que falham por caixa.
 */
export const normalizeInscription = (raw: string): string =>
  raw.replace(/[^0-9A-Za-z]/g, '').toUpperCase();

const DIGITS_ONLY = /^\d+$/;

/**
 * "Esta inscrição pode ser escrita num campo `Num` do CNAB sem virar OUTRA?"
 *
 * Só é `true` para inscrição não-vazia e inteiramente numérica depois de tirada a máscara.
 *
 * ⚠️ O QUE ACONTECE COM QUEM NÃO PERGUNTA (#856, CA3): o emissor escreve a inscrição com um helper
 * que remove tudo que não é dígito. Isso é tradução de formato legítima para máscara — `12.345.678/
 * 0001-99` e `12345678000199` são o mesmo CNPJ. Aplicado a um documento ALFANUMÉRICO, deixa de tirar
 * pontuação e passa a DESTRUIR CONTEÚDO:
 *
 *     '12ABC34501DE35'  →  '00000123450135'   ← outra inscrição, 14 dígitos, arquivo perfeito
 *
 * O banco aceita. O cedente declarado no arquivo não é o titular da conta que paga.
 *
 * Documento alfanumérico responde `false`, e a recusa é DELIBERADA — não uma limitação a contornar:
 *
 *   · **emitir com as letras** num campo declarado `Num` produz arquivo que o banco pode recusar, e
 *     a recusa chegaria depois do NSA queimado;
 *   · **remover as letras** é o defeito que esta função existe para impedir;
 *   · **converter** (o `ASCII − 48` da RFB) NÃO é opção que se escolha sozinho: aquela regra é para
 *     CALCULAR o dígito verificador, não para transmitir a inscrição.
 *
 * ⚠️ HÁ PERGUNTA EM ABERTO AO BANCO (#863): o Bradesco aceita CNPJ alfanumérico no CNAB 240, e em
 * que forma? O layout v08 (jul/2025) é anterior à emissão alfanumérica (07/2026, ADR-0044) e declara
 * o campo `Num`. Enquanto não houver resposta ESCRITA, recusar com nome próprio é a única saída que
 * não inventa layout nem paga errado.
 */
export const isCnabEmittableInscription = (raw: string): boolean => {
  const normalized = normalizeInscription(raw);
  return normalized !== '' && DIGITS_ONLY.test(normalized);
};

const CPF_LENGTH = 11;

/**
 * O TIPO DE INSCRIÇÃO como o campo `G005` o quer: `1` pessoa física, `2` pessoa jurídica.
 *
 * ⚠️ SUBSTITUI O `'2'` LITERAL do cedente (#856, CA4). O emissor afirmava pessoa jurídica para toda
 * conta-cedente; o reader, três camadas abaixo, MEDIA o mesmo fato para o favorecido. Duas decisões
 * sobre a mesma grandeza, uma medindo e outra afirmando — e a que afirmava declara pessoa jurídica um
 * cedente pessoa física, produzindo arquivo bem-formado cujo `G005` mente sobre quem paga. O banco
 * não recusa: o tipo é coerente com o campo, só não é coerente com o titular.
 *
 * O comprimento é medido sobre a inscrição NORMALIZADA, e essa dependência é real e vale declará-la:
 * filtrar só numerais encurtaria um CNPJ alfanumérico (ADR-0044), e 11 posições sobreviventes o
 * classificariam como pessoa física. Qualquer mudança em `normalizeInscription` reclassifica pessoa
 * física e jurídica nos dois lados do arquivo — com uma fonte só, essa mudança é visível de um lado.
 *
 * ⚠️ NÃO decide se a inscrição é EMISSÍVEL, e as duas perguntas são independentes: um CNPJ
 * alfanumérico tem tipo `2` e ainda assim não cabe num campo declarado `Num` pelo layout. Essa
 * segunda pergunta é a da #863, e a resposta dela mora ao lado desta função — não dentro.
 */
export const inscriptionType = (raw: string): '1' | '2' =>
  normalizeInscription(raw).length === CPF_LENGTH ? '1' : '2';
