import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as UserRef from '../../../../shared/kernel/user-ref.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import * as PayableId from '../../domain/shared/payable-id.ts';
import * as RemittanceId from '../../domain/remittance/remittance-id.ts';
import * as Document from '../../domain/document/document.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import type { PayableRepository, PayableRepositoryError } from '../../domain/payable/repository.ts';
import type {
  RemittanceRepository,
  RemittanceRepositoryError,
} from '../ports/remittance-repository.ts';
import { buildTimelineEntries } from '../timeline-recording.ts';

// #61 (decisão da P.O., 19/10): desfazer a transmissão de UM título — `Transmitted` → `Approved`.
//
// O título foi à remessa, o banco não a processou e ele será pago de outra forma (ex.: baixa manual).
// Desfazer mantém a verdade para quem lê a tela: o pagamento não saiu pela remessa.
//
// O QUE ISTO NÃO FAZ — e é a regra, não omissão
//   Não libera o título para outra remessa. O vínculo em `fin_remittance_payables` fica, e o
//   `generate-remittance` recusa título preso a remessa viva (`remittance-payables-already-held`); o
//   convênio Multipag também barra. Quem libera é o DESCARTE da remessa, decisão própria com motivo.
//
// REMESSA NA FILA É RECUSADA
//   Com a remessa `Queued`, ela ainda não foi ao banco — e ainda pode ir. Se o título voltasse a
//   `Approved` agora, uma baixa manual nele pagaria em dobro quando a remessa saísse. A ação certa é
//   AGUARDAR o desfecho (o agente transmite → `Transmitted`, ou falha → `Failed`). ⚠️ Descartar não é
//   saída aqui: com o arquivo já no bucket, o próprio descarte recusa (`remittance-discard-requires-failure`)
//   pelo mesmo motivo — a mensagem não pode mandar o operador para esse beco.
export type UndoTransmissionDeps = Readonly<{
  repo: DocumentRepository;
  payableRepo: PayableRepository;
  remittances: RemittanceRepository;
  clock: Clock;
}>;

export type UndoTransmissionCommand = Readonly<{
  documentId: string;
  payableId: string;
  undoneBy: string;
  reason: string;
}>;

export type UndoTransmissionError =
  | DocumentError
  | DocumentRepositoryError
  | PayableRepositoryError
  | RemittanceRepositoryError
  | DocumentId.DocumentIdError
  | PayableId.PayableIdError
  | UserRef.UserRefError
  // A remessa do título ainda está na fila: descarte-a, em vez de desfazer o título.
  | 'transmission-undo-remittance-queued'
  // `Transmitted` sem remessa viva que o prenda: estado que a geração não produz — não se adivinha.
  | 'transmission-undo-remittance-not-found';

export const undoTransmission =
  (deps: UndoTransmissionDeps) =>
  async (cmd: UndoTransmissionCommand): Promise<Result<void, UndoTransmissionError>> => {
    const id = DocumentId.rehydrate(cmd.documentId);
    if (!id.ok) return err(id.error);
    const payableId = PayableId.rehydrate(cmd.payableId);
    if (!payableId.ok) return err(payableId.error);
    const by = UserRef.rehydrate(cmd.undoneBy);
    if (!by.ok) return err(by.error);

    const found = await deps.repo.findById(id.value);
    if (!found.ok) return err(found.error);

    const approved = Document.parseApproved(found.value.document);
    if (!approved.ok) return err(approved.error);
    if (found.value.payables === null) return err('document-repository-failure');

    const target = [found.value.payables.parent, ...found.value.payables.children].find(
      (p) => p.id === payableId.value,
    );

    // A remessa só importa a quem está transmitido; para os demais o domínio recusa adiante.
    let remittanceId = '';
    if (target?.status === 'Transmitted') {
      const held = await deps.remittances.findHeldPayables([cmd.payableId]);
      if (!held.ok) return err(held.error);
      if (held.value.length === 0) return err('transmission-undo-remittance-not-found');

      // Mais de uma remessa viva para o mesmo título é o defeito que a #789 detecta — se acontecer,
      // QUALQUER uma na fila basta para recusar: é ela que ainda pode sair.
      for (const link of held.value) {
        const rid = RemittanceId.rehydrate(link.remittanceId);
        if (!rid.ok) return err('transmission-undo-remittance-not-found');
        const remittance = await deps.remittances.findById(rid.value);
        if (!remittance.ok) return err(remittance.error);
        if (remittance.value?.status === 'Queued')
          return err('transmission-undo-remittance-queued');
      }
      remittanceId = held.value[0]?.remittanceId ?? '';
    }

    const undone = Document.undoTransmission({
      document: approved.value,
      payables: found.value.payables,
      payableId: payableId.value,
      remittanceId,
      by: by.value,
      reason: cmd.reason,
    });
    if (!undone.ok) return err(undone.error);

    const event = undone.value.events[0];
    if (event === undefined) return err('document-repository-failure');
    const entries = buildTimelineEntries(deps.clock, {
      event,
      before: approved.value,
      after: undone.value.document,
      payablesBefore: found.value.payables,
      payablesAfter: undone.value.payables,
      actor: by.value,
    });

    const saved = await deps.payableRepo.undoTransmitted({
      payableId: payableId.value,
      timelineEntries: entries,
      events: undone.value.events,
    });
    if (!saved.ok) return err(saved.error);

    return ok(undefined);
  };
