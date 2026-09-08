import { ok, err, type Result } from '#src/shared/index.ts';

import type { PayablePixKeyType } from '../../domain/payout/pix-key.ts';

/*
 * A forma de iniciação do Pix (`G100`), derivada do tipo da chave do favorecido (#838, CA3).
 *
 * O Segmento B na modalidade Pix escreve o `G100` nas colunas 15-17 (`02-layout-registros.md:198`),
 * e o valor não vem do cadastro: vem do TIPO DA CHAVE, traduzido. São dois vocabulários fechados de
 * cinco valores cada, de donos diferentes — `PixKeyType` é de `partners`
 * (`domain/shared/payment-target.ts:10`) e o `G100` é do banco (`03-dominios-campos.md:254`).
 *
 * ⚠️ VIVE NO ADAPTER, e não no domínio, pela mesma razão que as demais constantes do layout: a
 * tradução é da fronteira com o banco, e é aqui que ela morre quando o layout mudar. O `financial` mantém o
 * `keyType` OPACO de propósito (`domain/payout/types.ts:57-62`) — o payout decide aptidão, e para
 * isso basta haver chave. Interpretar o tipo é trabalho de quem emite o registro, que é este arquivo.
 *
 * ⚠️ O campo é **Alfa** de 3 posições com domínio de 2 dígitos, e o preenchimento é `'04 '`, não
 * `'004'` (`02-layout-registros.md:204-207`, confirmado pelo golden). Aqui produzimos só os DOIS
 * dígitos; quem alinha à esquerda e completa com brancos é `text()`, no montador — é a mesma divisão
 * de responsabilidade do `tedPurposeField`, que recebe o valor literal e conhece a largura.
 */

// Erro PRÓPRIO, e não um `translation-failed` genérico: a ação de quem recebe é diferente. Não há
// defeito no emissor nem campo a corrigir no título — é um tipo de chave que o layout do banco não
// prevê nesta modalidade, e emitir mesmo assim produziria arquivo bem-formado que o banco recusa
// depois de transmitido, que o `remittance-inspector.ts` não pega por não ser defeito de forma.
// O nome é o que a CA3 da #838 fixa.
export type PixInitiationError = 'remittance-pix-key-type-unsupported';

// A allow-list é LEGÍTIMA aqui, e a razão é a fonte — a mesma distinção que a rule `cnab.md` faz
// entre o P011 e o P013. O domínio do P011 vem do dicionário do Bacen, que se declara parcial, e
// listá-lo recusaria código legítimo. O `G100` é **fechado**: o manual enumera os cinco valores e
// não há sexto possível. Listar é o que torna a CA3 verificável.
//
// A tradução NÃO é 1:1, e o mapa é a forma que deixa as duas assimetrias visíveis:
//
//   1. `cpf` e `cnpj` colapsam em `03`. O banco não distingue pessoa física de jurídica na FORMA DE
//      INICIAÇÃO — a distinção existe no `G005` do próprio Segmento B (tipo de inscrição), que é
//      outro campo e continua sendo escrito. Duas entradas apontando para o mesmo valor dizem isso
//      por si; um `switch` com dois `case` caindo no mesmo `return` diria o mesmo e esconderia que a
//      coincidência é do DOMÍNIO DO BANCO, não da nossa implementação.
//   2. `05` (Dados Bancários) NÃO TEM ORIGEM aqui, e a ausência é deliberada. Ele é o Pix iniciado
//      por agência/conta — que não é "uma chave de outro tipo", é outro caminho de pagamento: o
//      `128-226` deixa de carregar chave e passa a carregar tipo de conta em duas posições
//      (`02-layout-registros.md:201`). Uma função que traduz TIPO DE CHAVE não tem de onde produzi-lo,
//      e mapear `random-key` ou qualquer outro para `05` emitiria um Segmento B cujo bloco de 99
//      posições o banco lê com outra régua. Se essa rota entrar um dia, entra por decisão de produto
//      e por um caminho próprio — não por uma linha a mais neste mapa.
//
// ⚠️ `Record` PRIMEIRO, `Map` DEPOIS — e cada metade resolve um problema diferente. Perder qualquer
// uma reabre um defeito distinto.
//
// **O `Record<PayablePixKeyType, string>` dá EXAUSTIVIDADE.** A lista de tipos pagáveis não vive mais
// aqui: vive em `domain/payout/pix-key.ts`, porque o pré-voo precisa dela e domínio não alcança
// adapter (#948, CA2 — mesmo arranjo de `hasRemittanceIssuer`). Com a fonte lá e o mapa aqui, faltava
// o que impede as duas de divergirem: um tipo novo entrando na lista do domínio faria o pré-voo
// aprovar uma chave que este arquivo recusaria — exatamente a divergência que a fatia fecha. `Record`
// EXIGE a chave; o `Map` literal que existia aqui aceitava faltar.
//
// **O `Map` dá SEGURANÇA DE PROTÓTIPO.** `keyType` chega como string arbitrária, e um `Record`
// consultado direto herda de `Object.prototype`: `record['toString']` devolveria uma FUNÇÃO, que não
// é `undefined` e passaria pela guarda abaixo como se fosse código `G100` válido. `new Map(entries)`
// não tem protótipo a herdar. Um mapa banco→ISPB que vivia aqui ao lado escapava disso por ter uma
// guarda de forma (`^\d{3}$`); ele saiu na #923, mas a lição fica — aqui não há forma numérica a
// validar, então a estrutura é que precisa não ter protótipo.
//
// A tradução NÃO é 1:1, e o `Record` deixa as duas assimetrias visíveis do mesmo jeito que o literal
// deixava: `cpf` e `cnpj` apontam para `03`, e não há origem para `05`.
const INITIATION_BY_PAYABLE_KEY_TYPE: Record<PayablePixKeyType, string> = {
  phone: '01',
  email: '02',
  cpf: '03',
  cnpj: '03',
  'random-key': '04',
};

const INITIATION_BY_KEY_TYPE: ReadonlyMap<string, string> = new Map(
  Object.entries(INITIATION_BY_PAYABLE_KEY_TYPE),
);

export const pixInitiationFor = (keyType: string): Result<string, PixInitiationError> => {
  const initiation = INITIATION_BY_KEY_TYPE.get(keyType);

  // `undefined` é tipo de chave que este layout não prevê. NUNCA cair para um default — nem `'04'`
  // ("aleatória serve para qualquer coisa"), nem brancos, nem o próprio `keyType` truncado: os três
  // produzem arquivo bem-formado que o banco recusa depois de transmitido, e o inspetor não pega
  // porque não é defeito de forma. É a mesma classe do `?? ''` que virou endereço em branco em 100%
  // das remessas (#858).
  //
  // ⚠️ O compilador não protege este caminho: `keyType` chega como `string` porque o `financial`
  // mantém o tipo opaco e não importa a união de `partners` (`domain/payout/types.ts:57-62`). A
  // guarda é a única coisa entre um vocabulário que pode crescer no outro módulo e o arquivo.
  return initiation === undefined ? err('remittance-pix-key-type-unsupported') : ok(initiation);
};
