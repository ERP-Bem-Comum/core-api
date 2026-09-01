import type { VanRoute } from './types.ts';

// AS ROTAS QUE O EMISSOR DA REMESSA SABE MONTAR — fonte ÚNICA, e a razão de existir é a divergência
// que ela fecha (#837).
//
// Duas réguas decidiam o mesmo fato e discordavam: o pré-voo (`checkPayoutReadiness`) aprovava a
// Guia de Recolhimento porque o código de barras estava válido, e o emissor (`batchProfileFor`) a
// recusava com `remittance-launch-form-unsupported`. O operador conferia a linha como apta, marcava,
// clicava em Gerar — e só aí a geração recusava. A aptidão estava sendo decidida pelo DADO PRESENTE,
// não por EXISTIR EMISSOR para aquela rota, e são perguntas diferentes.
//
// ⚠️ VIVE NO DOMÍNIO, e não em `adapters/cnab/batch-profile.ts` ao lado de `batchKeyFor`, porque a
// seta de dependência não permite o contrário. Os dois consumidores do `batchKeyFor` são adapters;
// aqui um deles é `checkPayoutReadiness`, que é domínio e é chamada por `document.ts` como função
// pura, sem deps — o que descarta também a saída por port. Adapter alcança domínio; domínio não
// alcança adapter. Então a fonte fica aqui e o emissor desce até ela.
//
// Isto NÃO é infra vazando para o domínio: `types.ts` já modela o que o arquivo transporta — é o que
// separa `out-of-van` de `ready`. O que faltava era o terceiro grau, entre os dois: a rota está
// contratada na VAN e o emissor ainda não a monta.

// A ÚNICA declaração da lista. O tipo e o conjunto derivam dela, então não há segunda lista a
// divergir — e é este array o "um só lugar" que a #837 exige: acrescentar `'pix'` aqui liga o
// pré-voo e o emissor no mesmo commit.
//
// `satisfies readonly VanRoute[]` garante "no extra" (rota inventada não entra). NÃO se usa
// `exhaustiveStringUnion` aqui, e a omissão é deliberada: aquele helper exige cobrir a união
// INTEIRA, e o propósito deste array é justamente ser um SUBCONJUNTO próprio de `VanRoute`. Cobri-la
// toda seria afirmar que tudo tem emissor, que é a afirmação falsa que originou a issue.
//
// ⚠️ ESTA LISTA É ESTADO DA IMPLEMENTAÇÃO, NÃO PROPRIEDADE DO LAYOUT — e a distinção é a única coisa
// aqui que um leitor futuro pode desfazer sem perceber. Ela encolhe e cresce conforme o emissor
// ganha rotas; é transitória por natureza. Uma propriedade do layout NÃO muda quando a
// implementação avança: "esta forma exige arquivo próprio?" (o Pix, pág. 15 do manual) responde
// `sim` hoje e continuará respondendo `sim` depois de o Pix ganhar emissor, e por isso tem fonte
// PRÓPRIA — `fileGroupFor`, em `adapters/cnab/batch-profile.ts` (#838, CA4).
//
// Derivar aquela pergunta desta lista faria a partição do Pix desaparecer **no exato commit** em que
// `'pix'` entrasse aqui — silenciosamente, e o arquivo misto resultante é o que o banco recusa. O
// raciocínio é da frente da #838, e fica registrado porque quem reintroduz o defeito é sempre a
// terceira pessoa, que leu "rotas com emissor" no domínio e entendeu como regra de negócio estável.
const ROUTES_WITH_ISSUER = ['transfer', 'billet'] as const satisfies readonly VanRoute[];

// A rota estreitada para quem EMITE. `batchProfileFor` faz `switch` sobre as variantes filtradas por
// este tipo, e é daí que vem a rede do compilador: no dia em que `'pix'` entrar no array acima, o
// `switch` deixa de ser exaustivo e o typecheck aponta exatamente onde o emissor de Pix falta —
// em vez de o Pix sair silenciosamente pelo perfil de transferência, que é o defeito da #751.
export type RouteWithIssuer = (typeof ROUTES_WITH_ISSUER)[number];

// `ReadonlySet<VanRoute>`, e não o tipo estreito do array: o parâmetro é `VanRoute`, e um
// `Set<RouteWithIssuer>` recusaria `'pix'` no `.has` por tipo — transformando a pergunta que esta
// função existe para responder em erro de compilação. Mesmo padrão de `TED_LAUNCH_FORMS`.
const withIssuer: ReadonlySet<VanRoute> = new Set(ROUTES_WITH_ISSUER);

// "Existe emissor para esta rota?" — e SÓ isso.
//
// ⚠️ Não confundir com "esta forma exige arquivo próprio?" (a partição do Pix, #838/CA4). São
// perguntas de naturezas diferentes e não se derivam uma da outra: esta é estado da IMPLEMENTAÇÃO e
// caduca quando o emissor entrar; aquela é propriedade do LAYOUT (pág. 15 do manual) e continua
// valendo depois. Derivar a partição desta função a faria sumir no dia em que o Pix ganhasse
// emissor — e o arquivo misto resultante é o que o banco recusa.
export const hasRemittanceIssuer = (route: VanRoute): route is RouteWithIssuer =>
  withIssuer.has(route);
