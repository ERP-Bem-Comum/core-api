import type { Result } from '../../../../shared/primitives/result.ts';

// ACL do envelope de status da VAN (ADR-0060/0061). A application pergunta "esta remessa saiu?"; o
// adapter é quem sabe que a resposta chega como um JSON depositado num prefixo do bucket por um
// agente que roda fora deste repositório.
//
// Os tipos vivem AQUI, e não junto do parser, pela mesma razão do `CnabRemittanceTranslator`: o use
// case não pode importar de `adapters/` (cobrado por `tests/cleanup/application-depends-inward.test.ts`),
// e declarar o tipo do lado de lá obrigaria exatamente esse import.

export type VanStatusSituation = 'transmitido' | 'falha' | 'revisao' | 'recepcao';

// A distinção que decide o desfecho. `duplicate` existe porque o agente publica em chave própria
// quando reconhece um nome que já processou — e essa execução NÃO acionou o STCPCLT.
export type VanStatusKind = 'remittance' | 'duplicate' | 'reception';

/**
 * Proveniência de um arquivo RECEBIDO — presente apenas quando `kind === 'reception'`.
 *
 * É o que a #753 exige para decidir o que tem direito de entrar: sem envelope, o objeto do prefixo
 * de retorno vai para quarentena em vez de ser processado.
 *
 * ⚠️ `key` é a referência canônica do objeto, e o NOME dele é opaco. O agente confirmou (P3, carta
 * de 19/08): colisão de nome gera chave desempatada, então casar por nome PERDE objeto. Quem
 * consumir o retorno resolve por `key`, nunca reconstruindo o caminho a partir de `fileName`.
 */
export type VanReceptionProvenance = Readonly<{
  /** SHA-256 do CONTEÚDO, hex minúsculo. Permite decidir sem reabrir o objeto (#753 CA4). */
  sha256: string;
  /** Onde o objeto foi depositado. A referência canônica — ver o aviso acima. */
  key: string;
  /**
   * O arquivo casou com linha de recepção do log daquele ciclo.
   *
   * `false` NÃO significa "não confiável": significa que o agente não conseguiu provar a origem
   * pelo log e depositou assim mesmo. Só decide alguma coisa junto com `cycleLogRead`.
   */
  correlated: boolean;
  /**
   * O log do ciclo foi lido.
   *
   * Separa "sei que não" de "não sei", e as duas pedem ações OPOSTAS (van-agent PR #12):
   *   `cycleLogRead: true`  + `correlated: false` → origem não registrada: quarentena
   *   `cycleLogRead: false`                       → o agente NÃO SABE; é sinal sobre a configuração
   *                                                 do log, não sobre o arquivo: processar e alarmar
   *
   * Quarentenar por `correlated: false` sozinho manda 100% dos retornos para uma fila que ninguém
   * olha quando o glob do log está mal configurado — e o gatilho é banal: o log é diário, então no
   * primeiro ciclo do dia o padrão casa o log de ontem.
   */
  cycleLogRead: boolean;
  /** Conteúdo já recebido antes. Omitido quando falso. */
  duplicate?: boolean;
  /** Chave da recepção anterior com o mesmo conteúdo. Omitido quando vazio. */
  duplicateOf?: string;
}>;

export type VanStatus = Readonly<{
  kind: VanStatusKind;
  fileName: string;
  executedAt: string;
  situation: VanStatusSituation;
  detail: string;
  // `null` quando o STCPCLT não chegou a ser executado. Nenhuma decisão depende deste campo — quem
  // decide é `situation`.
  exitCode: number | null;
  logLines: readonly string[];
  /** Só em `kind === 'reception'`, e nem sempre: envelope antigo não o traz. */
  reception?: VanReceptionProvenance;
}>;

export type VanStatusError =
  | 'van-status-unknown-key'
  | 'van-status-invalid-json'
  | 'van-status-missing-field'
  | 'van-status-unknown-situation';

export type VanStatusReader = Readonly<{
  parse: (key: string, content: string) => Result<VanStatus, VanStatusError>;

  // A ÚNICA leitura que autoriza dar uma remessa por transmitida. Vive no port, e não no use case,
  // porque é interpretação do contrato do agente: `duplicate` declarando `transmitido` não conta, e
  // quem sabe disso é o lado que conhece o envelope.
  wasTransmitted: (status: VanStatus) => boolean;
}>;
