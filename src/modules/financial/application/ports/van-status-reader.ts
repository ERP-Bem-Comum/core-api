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
