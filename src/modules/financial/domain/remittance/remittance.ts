import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { CreateRemittanceInput, Remittance, RemittanceError } from './types.ts';
import type { RemittanceEvent } from './events.ts';

// Os ids dos TÍTULOS presos, sem a referência emitida. Existe porque quase todo consumidor
// (evento, DTO, contagem, seleção) só pergunta QUAIS títulos estão presos — e fazê-los conhecer
// o par inteiro espalharia o vocabulário da emissão por lugares que não emitem nada.
//
// Derivado, nunca armazenado em paralelo: duas listas que precisam concordar acabam discordando.
export const payableIdsOf = (remittance: Remittance): readonly string[] =>
  remittance.payables.map((p) => p.payableId);

// As NOTAS que a remessa tocou, cada uma UMA vez. Deduplica porque títulos irmãos compartilham a
// nota: sem o `Set`, uma remessa com o pai e duas retenções da mesma nota a reportaria três vezes,
// e quem conta "quantas notas saíram neste arquivo" leria três.
export const documentIdsOf = (remittance: Remittance): readonly string[] => [
  ...new Set(remittance.payables.map((p) => p.documentId)),
];

/**
 * O que uma transição devolve: o agregado no estado novo mais o que houve de contar ao mundo.
 *
 * `events` vem VAZIO no caminho idempotente, e essa é a propriedade que sustenta a varredura. O
 * agente não apaga objeto de status, então o mesmo envelope é relido a cada 5 minutos; se confirmar
 * de novo reemitisse `RemittanceTransmitted`, o outbox cresceria sem teto e qualquer consumidor
 * (notificação, projeção) anunciaria o mesmo pagamento para sempre.
 */
export type RemittanceOutcome = Readonly<{
  remittance: Remittance;
  events: readonly RemittanceEvent[];
}>;

const settled = (
  remittance: Remittance,
  type: RemittanceEvent['type'],
  at: string,
  detail: string,
): RemittanceEvent => ({
  type,
  remittanceId: remittance.id,
  nsa: remittance.nsa,
  fileName: remittance.fileName,
  payableIds: payableIdsOf(remittance),
  settledAt: at,
  detail,
});

const isBlank = (value: string): boolean => value.trim().length === 0;

export const create = (input: CreateRemittanceInput): Result<Remittance, RemittanceError> => {
  if (input.payables.length === 0) return err('remittance-without-payables');

  // Unicidade pelo TÍTULO, nunca pela nota: o pai e a retenção de ISS são títulos distintos do
  // mesmo documento e podem sair no mesmo arquivo. Cobrar aqui a unicidade do `documentId` recusaria
  // essa seleção legítima e obrigaria o operador a emitir um arquivo por título da mesma nota.
  const payableIds = input.payables.map((p) => p.payableId);
  if (new Set(payableIds).size !== payableIds.length) {
    return err('remittance-duplicated-payable');
  }

  // CA3 da #752: referência ausente RECUSA a remessa, com nome próprio. O fallback silencioso para
  // string vazia é o que fazia o defeito ser invisível — o arquivo saía válido e o banco aceitava.
  if (input.payables.some((p) => isBlank(p.yourNumber))) {
    return err('remittance-payable-without-reference');
  }

  // CA4/CA2: referência repetida dentro do mesmo arquivo torna o casamento do retorno AMBÍGUO — o
  // banco devolveria uma referência que aponta para dois títulos. Entre remessas a unicidade vem do
  // NSA, que é alocado sob lock e nunca repete; dentro do arquivo, é aqui que ela é cobrada.
  const references = input.payables.map((p) => p.yourNumber);
  if (new Set(references).size !== references.length) {
    return err('remittance-duplicated-reference');
  }

  if (isBlank(input.fileName)) return err('remittance-file-name-required');
  if (isBlank(input.contentHash)) return err('remittance-content-hash-required');

  return ok(
    immutable<Remittance>({
      id: input.id,
      cedenteAccountId: input.cedenteAccountId,
      nsa: input.nsa,
      fileName: input.fileName,
      contentHash: input.contentHash,
      payables: input.payables.map((p) => immutable({ ...p })),
      // Nasce enfileirada, nunca transmitida: gravar no bucket não é transmitir.
      status: 'Queued',
      generatedAt: input.generatedAt,
    }),
  );
};

export const includes = (remittance: Remittance, payableId: string): boolean =>
  remittance.payables.some((p) => p.payableId === payableId);

// A pergunta que a seleção de títulos faz. Enquanto a remessa "prende", nenhum dos seus títulos
// pode entrar noutra.
//
// ⚠️ Este comentário dizia que o hold "substitui a transição imediata para `Transmitted`". Deixou de
// ser verdade no ADR-0065 §2: a transição existe, acontece na geração, e o hold NÃO foi substituído
// por ela — os dois convivem, medindo coisas diferentes. O hold é do VÍNCULO e é derivado do status
// da remessa; a transição é do TÍTULO e vive em `fin_payables.status`. Depois do descarte o vínculo
// solta na hora, mas o status só volta a `Approved` pela devolução da §4 — é por isso que "liberar o
// título" passou a exigir duas coisas, e não uma.
//
// ⚠️ Prende o TÍTULO, não a nota: com o pai numa remessa, a retenção da mesma nota segue livre para
// entrar noutra. É o que a premissa do negócio pede — pagar o pai sem pagar o filho — e o que
// prender por documento impediria.
//
// `Failed` prende, e os títulos dele permanecem `Transmitted` (ADR-0065 §4). "Sem confirmação" não é
// "não transmitiu", e liberar por conta própria reabriria o caminho para pagamento em dobro. Só
// `Discarded` — decisão humana registrada — libera.
export const holdsPayables = (remittance: Remittance): boolean => remittance.status !== 'Discarded';

// Idempotente por desenho: o agente não apaga nada e a varredura pode reler o mesmo objeto de
// status. Confirmar duas vezes preserva o PRIMEIRO desfecho, em vez de virar erro operacional.
export const confirmTransmitted = (
  remittance: Remittance,
  at: string,
  detail: string,
): Result<RemittanceOutcome, RemittanceError> => {
  // Confirmar de novo devolve o agregado intacto e NENHUM evento: o desfecho já foi anunciado.
  if (remittance.status === 'Transmitted') return ok({ remittance, events: [] });
  if (remittance.status !== 'Queued') return err('remittance-not-settleable');

  const confirmed = immutable<Remittance>({
    ...remittance,
    status: 'Transmitted',
    settledAt: at,
    detail,
  });
  return ok({
    remittance: confirmed,
    events: [settled(confirmed, 'RemittanceTransmitted', at, detail)],
  });
};

export const markFailed = (
  remittance: Remittance,
  at: string,
  detail: string,
): Result<RemittanceOutcome, RemittanceError> => {
  // Uma remessa que o banco confirmou não é rebaixada por leitura tardia — a ordem de chegada dos
  // objetos de status não é garantida, e o desfecho positivo é o mais caro de perder.
  if (remittance.status === 'Transmitted') return err('remittance-already-transmitted');
  if (remittance.status === 'Failed') return ok({ remittance, events: [] });
  if (remittance.status !== 'Queued') return err('remittance-not-settleable');

  const failed = immutable<Remittance>({
    ...remittance,
    status: 'Failed',
    settledAt: at,
    detail,
  });
  return ok({ remittance: failed, events: [settled(failed, 'RemittanceFailed', at, detail)] });
};

/**
 * Único caminho que devolve os títulos para a fila (ADR-0065 §4).
 *
 * Exige motivo porque libera valor para nova transmissão: sem registro do porquê, ninguém audita
 * depois por que um pagamento saiu duas vezes.
 *
 * **Duas portas de entrada, e a segunda é a novidade do #792:**
 *
 *  - **`Failed`** — o `status/` disse que o transporte não entregou. Os títulos ficaram
 *    `Transmitted` (§4: "sem confirmação" não é "não transmitiu"), e é o operador, tendo conferido o
 *    site do banco, quem decide tirá-los da VAN.
 *  - **`Queued` SEM arquivo em prefixo nenhum** — a remessa que ficou registrada quando o upload
 *    falhou depois da transação (§2). É a via que faltava para o "produtor 1" da #787: sem ela, o
 *    título fica preso para sempre por uma remessa que nunca existiu no bucket.
 *
 * ⚠️ `Queued` **com** arquivo continua recusado, e é a guarda que importa: o objeto está em `saida/`
 * significa que o agente ainda pode transmiti-lo. Devolver o título ali abriria a porta para ele
 * entrar noutra remessa enquanto a primeira segue a caminho do banco — pagamento em dobro, que é
 * exatamente o que a #789 fechou.
 *
 * O fato "o arquivo está no bucket" chega como DADO, apurado pelo use case
 * (`storage.findRemittance`). O domínio não conhece transporte (ADR-0006), e enterrar a consulta
 * aqui tornaria a regra impossível de testar sem infra — mas quem DECIDE com base nela é este
 * módulo, não o use case, que só apura e encaminha.
 */
export type DiscardInput = Readonly<{
  remittance: Remittance;
  at: string;
  reason: string;
  /**
   * O objeto existe em ALGUM prefixo do bucket (`saida/`, `processados/`, `falhas/`)? Só consultado
   * quando a remessa está `Queued` — em `Failed` o transporte já se pronunciou, e onde o arquivo
   * está deixou de decidir qualquer coisa.
   */
  fileInBucket: boolean;
}>;

export const discard = (input: DiscardInput): Result<RemittanceOutcome, RemittanceError> => {
  const { remittance, at, reason, fileInBucket } = input;

  // A ordem é a regra. Eliminados `Transmitted` e `Discarded`, sobram exatamente `Queued` e
  // `Failed` — os dois estados a partir dos quais o descarte é legítimo —, e é por isso que não há
  // um quarto `if` peneirando o resto: ele seria código morto, e o compilador o denuncia como tal.
  // Acrescentar estado à máquina da remessa QUEBRA esta função de propósito: quem o fizer terá de
  // decidir aqui se ele descarta, em vez de cair num `else` que decide por omissão.
  if (remittance.status === 'Transmitted') return err('remittance-already-transmitted');
  if (remittance.status === 'Discarded') return ok({ remittance, events: [] });
  if (remittance.status === 'Queued' && fileInBucket) {
    return err('remittance-discard-requires-failure');
  }
  if (isBlank(reason)) return err('remittance-discard-requires-reason');

  const discarded = immutable<Remittance>({
    ...remittance,
    status: 'Discarded',
    settledAt: at,
    detail: reason,
  });

  // O evento que faltava. O comentário anterior desta função dizia que `events` vinha vazio "até
  // haver consumidor para 'estes documentos voltaram à fila'" — o consumidor chegou: a devolução dos
  // títulos por CAS (§4) acontece na mesma transação, e a trilha da nota exibe o marco (#823).
  return ok({
    remittance: discarded,
    events: [settled(discarded, 'RemittanceDiscarded', at, reason)],
  });
};
