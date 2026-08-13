import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { CreateRemittanceInput, Remittance, RemittanceError } from './types.ts';
import type { RemittanceEvent } from './events.ts';

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
  documentIds: remittance.documentIds,
  settledAt: at,
  detail,
});

const isBlank = (value: string): boolean => value.trim().length === 0;

export const create = (input: CreateRemittanceInput): Result<Remittance, RemittanceError> => {
  if (input.documentIds.length === 0) return err('remittance-without-documents');
  if (new Set(input.documentIds).size !== input.documentIds.length) {
    return err('remittance-duplicated-document');
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
      documentIds: [...input.documentIds],
      // Nasce enfileirada, nunca transmitida: gravar no bucket não é transmitir.
      status: 'Queued',
      generatedAt: input.generatedAt,
    }),
  );
};

export const includes = (remittance: Remittance, documentId: string): boolean =>
  remittance.documentIds.includes(documentId);

// A pergunta que a seleção de documentos faz. Enquanto a remessa "prende", nenhum dos seus
// documentos pode entrar noutra — é o que substitui a transição imediata para `Transmitted`.
//
// `Failed` prende. "Sem confirmação" não é "não transmitiu", e liberar por conta própria reabriria
// o caminho para pagamento em dobro. Só `Discarded` — decisão humana registrada — libera.
export const holdsDocuments = (remittance: Remittance): boolean =>
  remittance.status !== 'Discarded';

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

// Único caminho que devolve os documentos para a fila. Exige motivo porque libera valor para nova
// transmissão: sem registro do porquê, ninguém audita depois por que um pagamento saiu duas vezes.
// Assinatura uniforme com as demais transições, mas `events` sempre vazio: o descarte ainda não tem
// evento próprio. Não é esquecimento — é escopo. Quando houver consumidor para "estes documentos
// voltaram à fila" (o mais consequente dos três, porque libera valor para nova transmissão), o
// evento entra aqui sem mexer em quem chama.
export const discard = (
  remittance: Remittance,
  at: string,
  reason: string,
): Result<RemittanceOutcome, RemittanceError> => {
  if (remittance.status === 'Transmitted') return err('remittance-already-transmitted');
  if (remittance.status === 'Discarded') return ok({ remittance, events: [] });
  if (remittance.status !== 'Failed') return err('remittance-discard-requires-failure');
  if (isBlank(reason)) return err('remittance-discard-requires-reason');

  return ok({
    remittance: immutable<Remittance>({
      ...remittance,
      status: 'Discarded',
      settledAt: at,
      detail: reason,
    }),
    events: [],
  });
};
