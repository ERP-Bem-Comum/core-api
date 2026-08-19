// As OCORRÊNCIAS do retorno — campo G059, posições 231-240 de todo registro que volta do banco.
//
// É o campo que diz o desfecho, e a leitura dele tem duas armadilhas de forma antes de qualquer
// regra de negócio:
//
//   1. **São até CINCO ocorrências no mesmo campo**, cada uma de dois caracteres — o manual diz
//      literalmente que se pode informar até cinco simultaneamente (`jun-19-layout-multipag.pdf`
//      p. 105, local-only). Ler os dez caracteres como um código só, ou parar no primeiro, descarta
//      motivo de rejeição — e é justamente o "por que não casou" que a #690 exige poder responder.
//   2. **O campo é `Alfa`**, então vem preenchido com brancos à direita. Um registro com uma
//      ocorrência traz `00        `, não `00`.
//
// ## Por que a classificação é por FAMÍLIA, e não uma tabela de 71 linhas
//
// O catálogo tem 71 códigos (p. 105-113). Transcrevê-los aqui copiaria o manual — que é local-only,
// com restrição de redistribuição — para um repositório PÚBLICO. E não seria mais correto: os
// códigos de desfecho são quatro, e todo o resto são famílias de rejeição por validação, agrupadas
// pela primeira letra segundo o escopo do que foi recusado (registro, lote, arquivo).
//
// A regra que fica é: **o que não está declarado aqui como desfecho é desconhecido, nunca "deu
// certo"**. Um código novo que o banco passe a publicar não pode virar pagamento confirmado por
// omissão — é a mesma disciplina do parser do `status/`, que recusa situação fora do vocabulário em
// vez de adivinhar.

import { immutable } from '../../../../shared/primitives/immutable.ts';

/** Duas posições por ocorrência (p. 105). */
const OCCURRENCE_WIDTH = 2;

/** Dez posições no campo ⇒ no máximo cinco ocorrências. */
export const MAX_OCCURRENCES = 5;

/**
 * O desfecho que o conjunto de ocorrências declara.
 *
 * `unknown` não é lixo: é a resposta honesta para código fora do catálogo que conhecemos, e existe
 * para que ninguém precise escolher entre "assumo que pagou" e "assumo que falhou" diante de um
 * código novo. As duas escolhas erram — uma libera dinheiro que não saiu, a outra represa o que
 * saiu — e a terceira resposta é o que permite alguém olhar.
 */
export type ReturnOutcome = 'settled' | 'rejected' | 'cancelled' | 'unknown';

// Os QUATRO códigos de desfecho (p. 105). Os demais 67 são rejeição por validação.
//
// `03` conta como liquidado tanto quanto `00`: é o pagamento autorizado e efetivado na agência —
// caminho diferente, mesmo resultado para quem espera saber se o dinheiro saiu.
const SETTLED: ReadonlySet<string> = new Set(['00', '03']);
const NOT_SETTLED: ReadonlySet<string> = new Set(['01']);
const CANCELLED: ReadonlySet<string> = new Set(['02']);

/**
 * Famílias de REJEIÇÃO, pela primeira letra — o escopo do que o banco recusou:
 *
 *   `A*` dados do registro de detalhe · `B*` dados do favorecido e do pagamento
 *   `C*` código de barras (título/tributo) · `H*` lote ou arquivo inteiro
 *
 * ⚠️ `HA` (lote não aceito) e `HI` (arquivo não aceito) chegam no header/trailer, não no detalhe:
 * são recusa de ESCOPO MAIOR, e um pagamento sem ocorrência própria dentro de um lote recusado não
 * está pago. Quem interpreta o arquivo precisa olhar os dois níveis — este módulo classifica o
 * código; o nível em que ele apareceu é do parser.
 */
const REJECTION_FAMILY = /^[ABCH][A-Z]$/;

/**
 * Fatia o campo de 10 posições nas ocorrências que ele carrega.
 *
 * Descarta pares em branco — o preenchimento à direita é do layout, não conteúdo. Preserva a ORDEM,
 * porque o banco lista da mais relevante para a menos e quem lê o laudo lê nessa ordem.
 */
export const splitOccurrences = (raw: string): readonly string[] => {
  const out: string[] = [];
  for (let i = 0; i + OCCURRENCE_WIDTH <= raw.length; i += OCCURRENCE_WIDTH) {
    const code = raw.slice(i, i + OCCURRENCE_WIDTH).trim();
    if (code !== '') out.push(code.toUpperCase());
  }
  return immutable(out.slice(0, MAX_OCCURRENCES));
};

/** O desfecho de UM código. */
export const classifyOccurrence = (code: string): ReturnOutcome => {
  const normalized = code.trim().toUpperCase();
  if (SETTLED.has(normalized)) return 'settled';
  if (CANCELLED.has(normalized)) return 'cancelled';
  if (NOT_SETTLED.has(normalized) || REJECTION_FAMILY.test(normalized)) return 'rejected';
  return 'unknown';
};

/**
 * O desfecho do CONJUNTO, por precedência — e a ordem foi escolhida pelo custo do erro.
 *
 *   1. `unknown` vence tudo. Se veio um código que não conhecemos junto de um `00`, não afirmamos
 *      que pagou: o desconhecido pode ser a ressalva que muda o sentido. Preferimos parar alguém
 *      para olhar a marcar como pago um título que não foi.
 *   2. `rejected` vence `settled`. Um registro que traz recusa não está liquidado, ainda que traga
 *      também um código de efetivação — a recusa é a informação nova.
 *   3. `cancelled` vem antes de `settled` pela mesma razão.
 *   4. Campo VAZIO é `unknown`, nunca `settled`. Ausência de ocorrência não é confirmação; é
 *      silêncio, e silêncio já foi lido como sucesso em sistemas que pagaram duas vezes por isso.
 */
export const classifyOccurrences = (codes: readonly string[]): ReturnOutcome => {
  if (codes.length === 0) return 'unknown';

  const outcomes = codes.map(classifyOccurrence);
  if (outcomes.includes('unknown')) return 'unknown';
  if (outcomes.includes('rejected')) return 'rejected';
  if (outcomes.includes('cancelled')) return 'cancelled';
  return 'settled';
};
