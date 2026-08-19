import type { Result } from '../../../../shared/primitives/result.ts';
import type { ReturnQuarantineReason } from '../van-return-triage.ts';

/**
 * A QUARENTENA CONSULTÁVEL da #753 — o balde do que não tem direito de entrar.
 *
 * A DoD da issue nomeia o anti-padrão que este port existe para impedir: *"quarentena consultável —
 * não apenas uma linha de log"*. A diferença não é de forma. Uma linha de log responde "aconteceu";
 * um registro responde **"o que está preso agora, desde quando, e por quê"** — que é a pergunta que
 * o operador faz, e a única que permite decidir se o silêncio do retorno é normal ou é incidente.
 *
 * ⚠️ A identidade é a CHAVE do objeto, nunca o nome do arquivo. O nome é atribuído pelo banco e
 * pode ganhar sufixo desempatador em colisão (van-agent, P3) — indexar por nome perderia objeto
 * exatamente no caso em que dois arquivos disputam o mesmo nome, que é quando a evidência importa.
 *
 * O motivo vem da triagem (`ReturnQuarantineReason`) e não é redeclarado aqui: quem decide o porquê
 * é a regra, e o armazenamento apenas o guarda. A seta aponta da persistência para a decisão.
 */

// Reexportado para o adapter afirmar o motivo ao mapear a linha do banco sem ter de conhecer o
// arquivo da triagem: o vocabulário chega a ele pelo port, que é o contrato que ele implementa.
export type { ReturnQuarantineReason };

/** O que a varredura OBSERVOU nesta passagem sobre um objeto reprovado. */
export type QuarantineObservation = Readonly<{
  key: string;
  reason: ReturnQuarantineReason;
  /** O hash que NÓS calculamos sobre os bytes do objeto. */
  observedSha256: string;
  /**
   * O hash que o envelope de recepção declarava. Só existe em `hash-mismatch` — nos outros motivos
   * não há envelope válido para declarar coisa alguma, e gravar string vazia ali faria a consulta
   * mentir sobre ter havido uma declaração.
   */
  expectedSha256?: string;
  /** Instante da varredura, do `Clock` — nunca `new Date()` dentro do adapter. */
  seenAt: string;
}>;

/** Um objeto preso, como a consulta o devolve. */
export type QuarantinedObject = Readonly<{
  key: string;
  reason: ReturnQuarantineReason;
  observedSha256: string;
  expectedSha256?: string;
  /** Quando entrou. Não é reescrito por varredura posterior — é a idade da anomalia. */
  firstSeenAt: string;
  /** Última varredura que ainda o viu preso. `firstSeenAt === lastSeenAt` = viu uma vez só. */
  lastSeenAt: string;
  /** Preenchido quando o objeto deixou a quarentena. Ausente enquanto preso. */
  releasedAt?: string;
}>;

export type VanReturnQuarantineError = 'van-quarantine-unavailable';

export type VanReturnQuarantineStore = Readonly<{
  /**
   * Registra as observações desta varredura.
   *
   * Idempotente por chave: a varredura roda a cada ciclo e o agente não apaga nada, então o mesmo
   * objeto é reobservado indefinidamente. Reobservar move `lastSeenAt` e o motivo corrente; jamais
   * `firstSeenAt`.
   */
  record: (
    observations: readonly QuarantineObservation[],
  ) => Promise<Result<void, VanReturnQuarantineError>>;

  /** Marca como liberado o que passou a ter proveniência válida. Chave desconhecida é no-op. */
  release: (keys: readonly string[], at: string) => Promise<Result<void, VanReturnQuarantineError>>;

  /**
   * A consulta. Por padrão devolve só o que está PRESO — a pergunta operacional é "o que está
   * parado", e devolver o histórico junto afogaria a resposta conforme o tempo passa.
   */
  list: (
    filter?: Readonly<{ includeReleased?: boolean }>,
  ) => Promise<Result<readonly QuarantinedObject[], VanReturnQuarantineError>>;
}>;
