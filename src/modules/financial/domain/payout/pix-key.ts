// AS CONDIÇÕES QUE O EMISSOR DE PIX IMPÕE À CHAVE — fonte ÚNICA, pela mesma razão e no mesmo molde
// de `van-routes.ts` (#837).
//
// A #837 fechou a divergência "o pré-voo aprova e o emissor recusa" para a EXISTÊNCIA do emissor,
// criando aqui a lista de rotas que ele sabe montar. Sobrou a outra metade, que a #948 nomeia: as
// CONDIÇÕES que esse emissor impõe. O Pix reabriu a divergência por duas portas, e as duas custam
// caro porque a recusa vem DEPOIS do `allocateNsa` — cada tentativa queima um número da série:
//
//   · chave que não cabe nas 99 posições do `G101` → `pix-key-unrepresentable`;
//   · tipo de chave que o `G100` não prevê        → `remittance-pix-key-type-unsupported`.
//
// ⚠️ VIVE NO DOMÍNIO pela seta de dependência, não por gosto — exatamente o argumento de
// `van-routes.ts`. Quem precisa da régua é `checkPayoutReadiness`, que é domínio e é chamada como
// função pura, sem deps (o que descarta também a saída por port). Adapter alcança domínio; domínio
// não alcança adapter. Então a fonte fica aqui e o emissor desce até ela — como `batch-profile.ts`
// já faz com `hasRemittanceIssuer`.
//
// ⚠️ E AQUI, AO CONTRÁRIO DE `van-routes.ts`, AS DUAS CONSTANTES SÃO PROPRIEDADE DO LAYOUT, NÃO
// ESTADO DA IMPLEMENTAÇÃO. A distinção é a que aquele arquivo pede para não se desfazer, e vale
// registrar de que lado este caiu: a lista de rotas com emissor ENCOLHE E CRESCE conforme o emissor
// avança, e caduca; estas duas não. As 99 posições do `G101` e os cinco valores do `G100` só mudam
// se o BANCO mudar o layout — e no dia em que mudarem, mudam para o pré-voo e para o emissor juntos,
// que é precisamente por isso que uma fonte só é o desenho certo.

/**
 * A largura do campo `G101` (Segmento B, colunas 128-226) na modalidade Pix.
 *
 * ⚠️ É LIMITE REAL, não alinhamento — e é a distinção que torna o caso perigoso. `text()` trunca por
 * desenho, o que é correto para nome e endereço: cortar um sobrenome não muda o destino do dinheiro.
 * Uma chave truncada muda: as 99 primeiras posições de uma chave maior são uma chave DIFERENTE, e ou
 * o SPI a recusa, ou ela pertence a outro recebedor.
 *
 * O cadastro aceita chave bem maior que isto, então o caso é alcançável por dado perfeitamente
 * legítimo — não é defesa contra entrada malformada.
 */
export const PIX_KEY_MAX_WIDTH = 99;

/**
 * Os tipos de chave que o emissor sabe traduzir para o domínio `G100` (Forma de Iniciação).
 *
 * O `G100` é **fechado**: o manual enumera os valores e não há sexto possível — é o que separa esta
 * allow-list legítima da que seria indevida para o `P011`, cujo domínio vem do dicionário do Bacen e
 * se declara parcial.
 *
 * ⚠️ A LISTA É DE TIPOS DE CHAVE, NÃO DE CÓDIGOS `G100`, e a assimetria é deliberada: `cpf` e `cnpj`
 * colapsam no mesmo código `03`, porque o banco não distingue pessoa física de jurídica na forma de
 * iniciação. O domínio não precisa saber disso — precisa saber quais tipos SÃO PAGÁVEIS. A tradução
 * para o código vive no adapter (`pix-initiation.ts`), que é onde ela morre quando o layout mudar, e
 * o compilador cobra que ele cubra exatamente esta lista.
 *
 * ⚠️ O `05` (Dados Bancários) não tem entrada aqui, e a ausência é a mesma do adapter: ele é o Pix
 * iniciado por agência/conta, que não é "uma chave de outro tipo" — é outro caminho de pagamento, em
 * que o bloco de 99 posições deixa de carregar chave. Se entrar um dia, entra por decisão de produto.
 */
export const PAYABLE_PIX_KEY_TYPES = ['phone', 'email', 'cpf', 'cnpj', 'random-key'] as const;

/**
 * O tipo de chave estreitado ao que é pagável.
 *
 * É o que dá a rede do compilador ao adapter: `pix-initiation.ts` monta seu mapa a partir de um
 * `Record<PayablePixKeyType, string>`, e `Record` **exige exaustividade** — no dia em que um tipo
 * entrar nesta lista, o typecheck aponta o mapa que ficou sem o código correspondente, em vez de o
 * pré-voo aprovar um tipo que o emissor recusaria.
 */
export type PayablePixKeyType = (typeof PAYABLE_PIX_KEY_TYPES)[number];

// `ReadonlySet<string>`, e não `Set<PayablePixKeyType>`: o `keyType` chega como `string` arbitrária,
// porque o `financial` mantém o tipo OPACO de propósito (`types.ts`) — quem valida o vocabulário é
// `partners`, no `createPixKey`. Um `Set` do tipo estreito recusaria o argumento por tipo e
// transformaria a pergunta que esta função existe para responder em erro de compilação. Mesmo padrão
// de `withIssuer` em `van-routes.ts`.
const payableKeyTypes: ReadonlySet<string> = new Set(PAYABLE_PIX_KEY_TYPES);

/**
 * "O emissor sabe traduzir este tipo de chave?" — e SÓ isso.
 *
 * Não julga se a chave é válida, se existe no DICT ou se pertence ao favorecido: nada disso é
 * verificável aqui. Quem confere a titularidade é o PSP do recebedor, na liquidação, e a resposta
 * volta no `G059` (`PF`/`PG`).
 */
export const isPayablePixKeyType = (keyType: string): boolean => payableKeyTypes.has(keyType);

/**
 * "Esta chave cabe no campo do arquivo?"
 *
 * Recebe a chave JÁ como o cadastro a guarda. O `trim` espelha o do emissor
 * (`segmentBPix`) de propósito: se as duas réguas medirem coisas diferentes, volta a divergência
 * que esta fatia existe para fechar.
 */
export const pixKeyFitsField = (key: string): boolean => key.trim().length <= PIX_KEY_MAX_WIDTH;
