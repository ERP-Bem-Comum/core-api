import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import * as PayableId from '../../domain/shared/payable-id.ts';
import * as Document from '../../domain/document/document.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import { buildTimelineEntries } from '../timeline-recording.ts';

// #270: altera o vencimento de UM título isolado (PATCH /documents/:id/payables/:payableId). Sem
// propagação pai↔filhos — contrasta com `adjustDocument` (caminho editMetadata #165), que leva o
// dueDate a todos os payables. Vale em Open E Approved; grava `DocumentSaved` + trilha na mesma tx.
export type UpdatePayableDueDateDeps = Readonly<{
  repo: DocumentRepository;
  clock: Clock;
}>;

export type UpdatePayableDueDateCommand = Readonly<{
  documentId: string;
  payableId: string;
  // Optimistic lock (FR-009): versão lida pelo cliente; repassada ao `repo.save`.
  expectedVersion: number;
  dueDate: Date;
}>;

export type UpdatePayableDueDateError =
  | DocumentError
  | DocumentRepositoryError
  | DocumentId.DocumentIdError
  | PayableId.PayableIdError;

export const updatePayableDueDate =
  (deps: UpdatePayableDueDateDeps) =>
  async (cmd: UpdatePayableDueDateCommand): Promise<Result<void, UpdatePayableDueDateError>> => {
    const id = DocumentId.rehydrate(cmd.documentId);
    if (!id.ok) return err(id.error);
    const payableId = PayableId.rehydrate(cmd.payableId);
    if (!payableId.ok) return err(payableId.error);

    const found = await deps.repo.findById(id.value);
    if (!found.ok) return err(found.error);

    const doc = found.value.document;
    // Vencimento por título vale em Open E Approved (mesma latitude do editMetadata #165);
    // Draft não tem títulos materializados.
    if (doc.status !== 'Open' && doc.status !== 'Approved') {
      return err('invalid-state-transition');
    }
    if (found.value.payables === null) return err('document-repository-failure');

    const updated = Document.updatePayableDueDate({
      document: doc,
      payables: found.value.payables,
      payableId: payableId.value,
      dueDate: cmd.dueDate,
    });
    if (!updated.ok) return err(updated.error);

    // Trilha: marco de alteração isolada. before = estado lido; after = mesmo documento com o título
    // alvo reagendado. actor=null (nesta fatia a alteração não carrega autoria, como o editMetadata).
    const event = updated.value.events[0];
    if (event === undefined) return err('document-repository-failure');
    const entries = buildTimelineEntries(deps.clock, {
      event,
      before: doc,
      after: updated.value.document,
      payablesBefore: found.value.payables,
      payablesAfter: updated.value.payables,
      actor: null,
    });

    const saved = await deps.repo.save(
      { document: updated.value.document, payables: updated.value.payables },
      entries,
      cmd.expectedVersion,
      updated.value.events,
    );
    if (!saved.ok) return err(saved.error);

    return ok(undefined);
  };
