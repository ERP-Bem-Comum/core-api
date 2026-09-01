/**
 * Eco seguro do VALOR de uma variavel de ambiente numa mensagem de boot (CWE-117).
 *
 * Toda guarda de configuracao escreve o diagnostico em stderr, uma linha por erro, antes de existir
 * logger. Um valor com quebra de linha interpolado cru **forja uma linha inteira** — quem le o boot
 * ve uma mensagem que ninguem emitiu. Foi o caso 16 da guarda dos 7 drivers, e a regra vale para
 * toda env cujo valor apareca no diagnostico.
 *
 * ⚠️ **Isto NAO protege credencial, e nao substitui a regra da guarda de drivers.** Sao dois riscos
 * distintos:
 *
 *   - **CWE-117 (log forging)** — o valor quebra a linha. Resolve-se sanitizando, e e o que esta
 *     funcao faz. Serve para campo cujo valor o operador PRECISA ver: nome de bucket, prefixo de
 *     objeto, booleano mal digitado.
 *   - **CWE-532 (credencial em log)** — o valor E o segredo. Sanitizar nao ajuda: `mysql://u:senha@h`
 *     sanitizado continua entregando a senha, e truncar entrega o prefixo, que e onde usuario e
 *     senha moram. Ali a regra e ecoar **so o que tem forma esperada** — ver `echoableDriverValue`
 *     em `src/shared/persistence/module-driver-config.ts`, que existe porque este caso e outro.
 *
 * Use esta funcao quando o campo nao carrega segredo e o valor ajuda a consertar. Quando houver
 * duvida sobre o campo carregar segredo, a resposta certa e nao ecoar.
 *
 * ⚠️ A classificacao e por CODE POINT, e nao por classe de regex, de proposito: escrever a classe
 * exigiria escapes `\uXXXX` no fonte, e a ferramenta de edicao os converte nos caracteres literais
 * — que quebram o proprio literal de regex. Comparar numero nao tem essa armadilha.
 */

/** C0, DEL + C1, e os dois separadores de linha do Unicode (quebra de linha para muitos parsers). */
const isControlCodePoint = (cp: number): boolean =>
  cp <= 0x1f || (cp >= 0x7f && cp <= 0x9f) || cp === 0x2028 || cp === 0x2029;

/** Teto de eco. Bucket S3 vai a 63, prefixo costuma ser curto; acima disso e ruido ou ataque. */
const MAX_ECHO = 80;

/** Marcador visivel: apagar em silencio esconderia a tentativa de quem a fez. */
const REPLACEMENT = '?';

/**
 * Devolve o valor pronto para interpolar, com os caracteres de controle substituidos por um
 * marcador visivel e o excedente truncado com a contagem do que ficou de fora.
 *
 * Itera por code point (`[...value]`), nao por unidade UTF-16: assim um emoji fora do BMP nao e
 * partido ao meio, o que produziria um par substituto solto na mensagem.
 */
/**
 * A unidade e o GRAFEMA, nao o code point nem a unidade UTF-16, e as tres escolhas erram diferente:
 *
 *   - `slice` corta por unidade UTF-16 e parte um emoji fora do BMP ao meio, deixando um par
 *     substituto solto;
 *   - o spread (`[...value]`) corta por code point e nao parte pares, mas **decompoe** sequencia com
 *     ZWJ — uma familia vira quatro emojis soltos no meio do diagnostico. E o que o ESLint
 *     (`no-misused-spread`) recusa, e ele esta certo;
 *   - `Intl.Segmenter` corta onde a pessoa que le enxerga uma letra.
 *
 * Um grafema de CONTROLE e sempre um code point unico, entao inspecionar o primeiro basta.
 */
const GRAPHEMES = new Intl.Segmenter('pt-BR', { granularity: 'grapheme' });

export const echoEnvValue = (value: string): string => {
  const chars = Array.from(GRAPHEMES.segment(value), ({ segment }) =>
    isControlCodePoint(segment.codePointAt(0) ?? 0) ? REPLACEMENT : segment,
  );
  if (chars.length <= MAX_ECHO) return chars.join('');
  const excedente = chars.length - MAX_ECHO;
  return `${chars.slice(0, MAX_ECHO).join('')}… (+${String(excedente)} caracteres)`;
};
