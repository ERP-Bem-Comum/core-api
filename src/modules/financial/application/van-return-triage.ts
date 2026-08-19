/**
 * TRIAGEM DO RETORNO — o que tem direito de ser processado (#753).
 *
 * O prefixo de retorno é a **caixa do convênio**: chegam arquivos de lotes que não são nossos. A
 * pergunta aqui é anterior à conciliação — `confirm-remittance` já classifica o que ENTROU, com os
 * baldes `unmatched`/`unreadable`; esta função decide o que **tem direito de entrar**. Tratar as
 * duas como a mesma coisa deixa o sistema tolerante no lugar errado, que é o equivalente a confundir
 * validação de entrada com tratamento de erro.
 *
 * A proveniência vem do lado do transporte: o agente publica, para cada arquivo recebido, um
 * envelope com o hash do conteúdo, a chave onde depositou e o que o log do ciclo disse sobre ele.
 * O critério de origem é o **log do cliente do banco**, nunca palpite sobre o nome do arquivo — que
 * é atribuído pelo banco e, segundo o agente (P3), pode ganhar sufixo desempatador em colisão.
 *
 * É função PURA: recebe o que já foi lido, devolve os baldes. Quem lista o bucket, lê o conteúdo e
 * calcula o hash é o adapter — aqui não há I/O para o teste ter que simular.
 */

import type { VanReceptionProvenance, VanStatus } from './ports/van-status-reader.ts';

/** Erro interno em EN kebab-case, como manda a tabela de idioma do CLAUDE.md. */
export type ReturnQuarantineReason =
  /** CA2 — objeto no prefixo sem envelope de recepção que o reivindique. */
  | 'missing-provenance'
  /** CA4 — o envelope existe, mas o conteúdo não é o que ele declara. */
  | 'hash-mismatch'
  /** CA5 — o log do ciclo FOI lido e não trazia a linha: a origem não está registrada. */
  | 'origin-not-logged';

/** Um objeto do prefixo de retorno, com o hash já calculado pelo adapter. */
export type ReturnObject = Readonly<{ key: string; sha256: string }>;

export type ProcessableReturn = Readonly<{
  key: string;
  provenance: VanReceptionProvenance;
}>;

export type QuarantinedReturn = Readonly<{
  key: string;
  reason: ReturnQuarantineReason;
}>;

export type VanReturnTriage = Readonly<{
  /** Tem proveniência, integridade conferida e origem aceitável. */
  processable: readonly ProcessableReturn[];
  /** Nem processado, nem descartado em silêncio — com motivo nomeado (CA2). */
  quarantined: readonly QuarantinedReturn[];
  /** CA3 — envelope que reivindica um objeto que não está lá. Ausência é informação. */
  missingObjects: readonly string[];
  /**
   * Processados, porém com aviso: o agente NÃO conseguiu ler o log daquele ciclo, então não sabe
   * dizer se o arquivo estava lá. Ver `unloggedCyclePolicy` abaixo.
   */
  unlogged: readonly string[];
}>;

/**
 * A POLÍTICA que decide entre quarentena e processamento quando não há correlação.
 *
 * `correlated: false` sozinho **não decide**, e essa foi a correção mais importante que o van-agent
 * trouxe (PR #12): o campo misturava dois casos com ações OPOSTAS.
 *
 *   cycleLogRead: true  + correlated: false → o log foi lido e não tinha a linha.
 *                                             A origem não está registrada → QUARENTENA.
 *   cycleLogRead: false                     → o log não foi lido. O agente NÃO SABE.
 *                                             É sinal sobre a configuração do log na instalação,
 *                                             não sobre o arquivo → PROCESSA e alarma.
 *
 * ⚠️ Quarentenar por `correlated: false` sozinho manda **100% dos retornos** para uma fila que
 * ninguém olha assim que o glob do log estiver mal configurado — e o gatilho é banal: o nome do log
 * começa por data, então no primeiro ciclo do dia o padrão casa o log de ONTEM. Represar pagamento
 * confirmado por causa de um padrão de log é o mais caro dos dois erros.
 *
 * ⚠️ Divergência declarada com a #753: o CA5 da issue, escrito antes do PR #12, manda quarentenar
 * sempre que não houver correlação. Esta implementação segue o contrato ATUAL do envelope; o CA5
 * precisa ser atualizado lá. Registrado em vez de resolvido escolhendo o texto mais conveniente.
 */
const unloggedCyclePolicy = (p: VanReceptionProvenance): 'process' | 'quarantine' | 'alert' => {
  if (p.correlated) return 'process';
  return p.cycleLogRead ? 'quarantine' : 'alert';
};

/**
 * Índice das recepções POR CHAVE, nunca por nome.
 *
 * O nome do objeto é opaco (P3): colisão gera chave desempatada, então casar por nome perde objeto.
 * Envelope sem proveniência não entra no índice — para quem consome, "não é de recepção", "é de
 * versão anterior do agente" e "veio malformado" são a mesma coisa: **não há prova de origem**.
 */
const byKey = (receptions: readonly VanStatus[]): ReadonlyMap<string, VanReceptionProvenance> => {
  const out = new Map<string, VanReceptionProvenance>();
  for (const status of receptions) {
    if (status.kind !== 'reception') continue;
    const p = status.reception;
    if (p !== undefined) out.set(p.key, p);
  }
  return out;
};

export const triageVanReturns = (
  objects: readonly ReturnObject[],
  receptions: readonly VanStatus[],
): VanReturnTriage => {
  const provenance = byKey(receptions);

  const processable: ProcessableReturn[] = [];
  const quarantined: QuarantinedReturn[] = [];
  const unlogged: string[] = [];
  const seen = new Set<string>();

  for (const object of objects) {
    seen.add(object.key);
    const p = provenance.get(object.key);

    if (p === undefined) {
      quarantined.push({ key: object.key, reason: 'missing-provenance' });
      continue;
    }

    // Integridade VERIFICADA, não presumida (CA4). Comparação exata: o contrato diz hex minúsculo, e
    // normalizar aqui esconderia um produtor que mudou de formato sem avisar.
    if (p.sha256 !== object.sha256) {
      quarantined.push({ key: object.key, reason: 'hash-mismatch' });
      continue;
    }

    const decision = unloggedCyclePolicy(p);
    if (decision === 'quarantine') {
      quarantined.push({ key: object.key, reason: 'origin-not-logged' });
      continue;
    }
    if (decision === 'alert') unlogged.push(object.key);
    processable.push({ key: object.key, provenance: p });
  }

  // CA3 — envelope que reivindica objeto ausente. Não é erro do agente nem nosso: é informação sobre
  // o bucket, e some da varredura se não for dita aqui.
  const missingObjects = [...provenance.keys()].filter((k) => !seen.has(k)).sort();

  return { processable, quarantined, missingObjects, unlogged };
};
