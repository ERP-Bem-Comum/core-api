import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as UserRef from '../../../../shared/kernel/user-ref.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import * as PayableId from '../../domain/shared/payable-id.ts';
import * as Document from '../../domain/document/document.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import type { PayableRepository, PayableRepositoryError } from '../../domain/payable/repository.ts';
import { buildTimelineEntries } from '../timeline-recording.ts';

// #223 (carve-out do #59): baixa manual de UM título (Aprovado→Pago), por título (#201). O documento
// precisa estar Approved; só o título alvo vira Pago (os irmãos seguem Aprovados). Trilha do operador
// (actor) + evento `PayableManuallyPaid` gravado na MESMA tx do estado (atomicidade — #127).
//
// A LEITURA e a ESCRITA usam ports diferentes, e é deliberado (Fatia 1): o documento é carregado
// pelo `repo` porque a decisão do domínio precisa dele inteiro — `parseApproved` exige o documento
// Approved, e a trilha compara antes/depois —, mas a gravação vai pelo `payableRepo`, que escreve
// UMA linha por PK. Escrever o documento aqui seria escrever o que não mudou: o `after` da trilha é
// o MESMO documento, e o custo dessa escrita inútil eram gap lock (#803) e conflito de versão entre
// operadores baixando títulos irmãos. Ver `domain/payable/repository.ts`.
export type RegisterManualPaymentDeps = Readonly<{
  repo: DocumentRepository;
  payableRepo: PayableRepository;
  clock: Clock;
}>;

export type RegisterManualPaymentCommand = Readonly<{
  documentId: string;
  payableId: string;
  paidBy: string;
  // ⚠️ ACEITO E NÃO USADO desde a Fatia 1. Era a versão do DOCUMENTO, repassada ao `repo.save`;
  // agora a pré-condição é verificada no próprio título, no `WHERE` do UPDATE (CAS por estado), e
  // uma versão de documento que a operação não altera não tem o que proteger. Segue no tipo porque
  // o contrato HTTP público exige `version` no body e o front o envia — retirá-lo é mudança de
  // contrato, não de implementação, e é fatia própria.
  expectedVersion?: number;
  // #232: data de pagamento (saída bancária, geralmente retroativa). ISO `YYYY-MM-DD`. Ausente → `clock.now()`.
  paidAt?: string;
  reason?: string;
}>;

export type RegisterManualPaymentError =
  | DocumentError
  | DocumentRepositoryError
  | PayableRepositoryError
  | DocumentId.DocumentIdError
  | PayableId.PayableIdError
  | UserRef.UserRefError
  | 'paid-at-in-future';

export const registerManualPayment =
  (deps: RegisterManualPaymentDeps) =>
  async (cmd: RegisterManualPaymentCommand): Promise<Result<void, RegisterManualPaymentError>> => {
    const id = DocumentId.rehydrate(cmd.documentId);
    if (!id.ok) return err(id.error);
    const payableId = PayableId.rehydrate(cmd.payableId);
    if (!payableId.ok) return err(payableId.error);
    const by = UserRef.rehydrate(cmd.paidBy);
    if (!by.ok) return err(by.error);

    // #232: usa a data informada (saída bancária, retroativa) ou agora; nunca futura.
    const at = cmd.paidAt !== undefined ? new Date(cmd.paidAt) : deps.clock.now();
    if (cmd.paidAt !== undefined && at.getTime() > deps.clock.now().getTime()) {
      return err('paid-at-in-future');
    }

    const found = await deps.repo.findById(id.value);
    if (!found.ok) return err(found.error);

    const approved = Document.parseApproved(found.value.document);
    if (!approved.ok) return err(approved.error);
    if (found.value.payables === null) return err('document-repository-failure');

    const paid = Document.payPayableManually({
      document: approved.value,
      payables: found.value.payables,
      payableId: payableId.value,
      by: by.value,
      at,
      ...(cmd.reason !== undefined ? { reason: cmd.reason } : {}),
    });
    if (!paid.ok) return err(paid.error);

    // Trilha: marco de baixa manual. before = Approved; after = mesmo documento (status inalterado) com
    // o título alvo Pago. actor = quem deu a baixa.
    const event = paid.value.events[0];
    if (event === undefined) return err('document-repository-failure');
    const entries = buildTimelineEntries(deps.clock, {
      event,
      before: approved.value,
      after: paid.value.document,
      payablesBefore: found.value.payables,
      payablesAfter: paid.value.payables,
      actor: by.value,
    });

    // Escreve UMA linha, por PK, com a pré-condição no `WHERE` — nem `fin_documents`, nem as
    // tabelas de retenção e imposto são tocadas. `payable-payment-conflict` volta daqui quando outra
    // baixa chegou primeiro (ver `payable-repository.drizzle.ts`).
    const saved = await deps.payableRepo.markPaid({
      payableId: payableId.value,
      paidAt: at,
      timelineEntries: entries,
      events: paid.value.events,
    });
    if (!saved.ok) return err(saved.error);

    return ok(undefined);
  };
