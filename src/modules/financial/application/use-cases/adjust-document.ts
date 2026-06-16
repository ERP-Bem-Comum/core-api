import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as Money from '../../../../shared/kernel/money.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import * as Retention from '../../domain/shared/retention.ts';
import * as Document from '../../domain/document/document.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import type { FinancialOutbox, OutboxAppendError } from '../ports/outbox.ts';
import { buildTimelineEntries } from '../timeline-recording.ts';

export type AdjustDocumentDeps = Readonly<{
  repo: DocumentRepository;
  outbox: FinancialOutbox;
  clock: Clock;
}>;

export type AdjustDocumentCommand = Readonly<{
  documentId: string;
  // Optimistic lock (FR-009/ADR-0002 da feature 010): versão do documento lida pelo cliente.
  // Repassada ao `repo.save` como `expectedVersion` — UPDATE com WHERE version = expectedVersion.
  expectedVersion: number;
  grossValueCents?: number;
  sourceDiscountsCents?: number;
  discountsCents?: number;
  penaltyCents?: number;
  interestCents?: number;
  retentions?: readonly Retention.RetentionInput[];
  dueDate?: Date;
  description?: string | null;
}>;

export type AdjustDocumentError =
  | DocumentError
  | DocumentRepositoryError
  | OutboxAppendError
  | DocumentId.DocumentIdError
  | Money.MoneyError
  | Retention.RetentionError;

type ChangesError = Money.MoneyError | Retention.RetentionError;

const buildRetentions = (
  inputs: readonly Retention.RetentionInput[] | undefined,
): Result<readonly Retention.Retention[] | undefined, Retention.RetentionError> => {
  if (inputs === undefined) return ok(undefined);
  const built: Retention.Retention[] = [];
  for (const r of inputs) {
    const created = Retention.create(r);
    if (!created.ok) return err(created.error);
    built.push(created.value);
  }
  return ok(built);
};

const buildChanges = (
  cmd: AdjustDocumentCommand,
): Result<Document.AdjustDocumentChanges, ChangesError> => {
  const optionalMoney = (
    cents: number | undefined,
  ): Result<Money.Money, Money.MoneyError> | null =>
    cents === undefined ? null : Money.fromCents(cents);

  const gross = optionalMoney(cmd.grossValueCents);
  if (gross !== null && !gross.ok) return err(gross.error);
  const sourceDiscounts = optionalMoney(cmd.sourceDiscountsCents);
  if (sourceDiscounts !== null && !sourceDiscounts.ok) return err(sourceDiscounts.error);
  const discounts = optionalMoney(cmd.discountsCents);
  if (discounts !== null && !discounts.ok) return err(discounts.error);
  const penalty = optionalMoney(cmd.penaltyCents);
  if (penalty !== null && !penalty.ok) return err(penalty.error);
  const interest = optionalMoney(cmd.interestCents);
  if (interest !== null && !interest.ok) return err(interest.error);

  const retentions = buildRetentions(cmd.retentions);
  if (!retentions.ok) return err(retentions.error);

  return ok({
    ...(gross?.ok ? { grossValue: gross.value } : {}),
    ...(sourceDiscounts?.ok ? { sourceDiscounts: sourceDiscounts.value } : {}),
    ...(discounts?.ok ? { discounts: discounts.value } : {}),
    ...(penalty?.ok ? { penalty: penalty.value } : {}),
    ...(interest?.ok ? { interest: interest.value } : {}),
    ...(retentions.value !== undefined ? { retentions: retentions.value } : {}),
    ...(cmd.dueDate !== undefined ? { dueDate: cmd.dueDate } : {}),
    ...(cmd.description !== undefined ? { description: cmd.description } : {}),
  });
};

export const adjustDocument =
  (deps: AdjustDocumentDeps) =>
  async (cmd: AdjustDocumentCommand): Promise<Result<void, AdjustDocumentError>> => {
    const id = DocumentId.rehydrate(cmd.documentId);
    if (!id.ok) return err(id.error);

    const found = await deps.repo.findById(id.value);
    if (!found.ok) return err(found.error);

    const open = Document.parseOpen(found.value.document);
    if (!open.ok) return err(open.error);
    if (found.value.payables === null) return err('document-repository-failure');

    const changes = buildChanges(cmd);
    if (!changes.ok) return err(changes.error);

    const adjusted = Document.adjust({
      document: open.value,
      payables: found.value.payables,
      changes: changes.value,
    });
    if (!adjusted.ok) return err(adjusted.error);

    // Trilha: marco de ajuste. before = estado lido (Open + payables atuais);
    // after = estado ajustado. actor=null (ajuste não carrega autoria nesta fatia).
    const event = adjusted.value.events[0];
    if (event === undefined) return err('document-repository-failure');
    const entries = buildTimelineEntries(deps.clock, {
      event,
      before: open.value,
      after: adjusted.value.document,
      payablesBefore: found.value.payables,
      payablesAfter: adjusted.value.payables,
      actor: null,
    });

    const saved = await deps.repo.save(
      {
        document: adjusted.value.document,
        payables: adjusted.value.payables,
      },
      entries,
      cmd.expectedVersion,
    );
    if (!saved.ok) return err(saved.error);

    const published = await deps.outbox.append(adjusted.value.events);
    if (!published.ok) return err(published.error);

    return ok(undefined);
  };
