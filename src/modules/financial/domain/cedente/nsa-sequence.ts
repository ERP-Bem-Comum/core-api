import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import * as Nsa from './nsa.ts';

// A SEQUÊNCIA DE NSA — e ela pertence ao CONVÊNIO, não à conta-cedente (#943).
//
// ## O que estava errado, e como o defeito se manifestava
//
// O contador vivia em `fin_cedente_accounts.next_nsa`, uma linha por conta. Mas o mesmo contrato
// multipag vale para VÁRIAS contas de pagamento — confirmado pela P.O. com o gerente do Bradesco em
// 02/09/2026 —, e cada conta nova nascia em `Nsa.MIN`. Duas contas sob o mesmo convênio caminhavam
// em contadores independentes, e o número 1 existia nas duas, sob o mesmo contrato.
//
// Para o banco isso não é remessa nova: é **o mesmo arquivo transmitido duas vezes**.
//
// ⚠️ E o dano chegou ANTES do banco. A referência do G064 é
// `referenceFor(convênio, nsa, posição)` — três componentes, **nenhum deles tempo** — e
// `fin_remittance_payables.your_number` tem UNIQUE global. Duas contas do mesmo convênio, ambas em
// `000001`, produziam a MESMA referência para o primeiro título, e o segundo INSERT era recusado
// pelo índice. O operador via `An internal error occurred` (503) e a conta simplesmente não gerava
// remessa — o bloqueio medido em produção na #942.
//
// O nome do arquivo escapava da colisão porque carrega o timestamp até o segundo; a referência não
// carrega nada disso. É por isso que o sintoma apareceu na tabela de vínculo, e não na de remessas.
//
// ## Por que a guarda de conta ativa NÃO mora aqui
//
// "Esta conta pode pagar?" é pergunta da CONTA (`isActive`); "qual o próximo número deste contrato?"
// é pergunta da SEQUÊNCIA. O adapter compõe as duas **nesta ordem** — conta primeiro, número depois.
// Invertida, uma conta encerrada queimaria um NSA do convênio inteiro, que é o oposto do que esta
// sequência existe para proteger: o número não volta.

export type ConvenioNsaSequence = Readonly<{
  convenio: string;
  nextNsa: number;
}>;

export type NsaSequenceError = 'nsa-exhausted';

export type NsaAllocation = Readonly<{
  nsa: Nsa.Nsa;
  sequence: ConvenioNsaSequence;
}>;

/**
 * Consome o número corrente e devolve a sequência já apontando para o próximo.
 *
 * Não persiste nada: a ATOMICIDADE entre ler e gravar é do adapter (lock da linha do convênio), e
 * não pode ser simulada aqui. Duas gerações concorrentes que leiam o mesmo número produzem arquivos
 * com NSA repetido — e repetição, para o banco, é retransmissão.
 *
 * A sequência pode terminar apontando para fora da faixa, e isso é deliberado: o último número é
 * entregue normalmente e só a alocação SEGUINTE falha, em vez de recusar uma remessa legítima por
 * antecipação. Mesmo desenho do `allocateNsa` da conta, que este substitui.
 */
export const allocate = (
  sequence: ConvenioNsaSequence,
): Result<NsaAllocation, NsaSequenceError> => {
  const current = Nsa.rehydrate(sequence.nextNsa);
  if (!current.ok) return err('nsa-exhausted');

  return ok(
    immutable<NsaAllocation>({
      nsa: current.value,
      sequence: { convenio: sequence.convenio, nextNsa: sequence.nextNsa + 1 },
    }),
  );
};

/**
 * A sequência de um convênio que ainda não tem linha.
 *
 * ⚠️ SÓ para convênio genuinamente novo. Uma sequência que já emitiu números NUNCA nasce daqui — o
 * backfill da migration parte do `MAX(next_nsa)` das contas daquele convênio, e reiniciar em `MIN`
 * reemitiria a faixa inteira. Reemissão é exatamente o que esta issue existe para impedir, e o
 * `your_number` já gravado colidiria no UNIQUE mesmo que o banco não reclamasse.
 */
export const start = (convenio: string): ConvenioNsaSequence =>
  immutable<ConvenioNsaSequence>({ convenio, nextNsa: Nsa.MIN });
