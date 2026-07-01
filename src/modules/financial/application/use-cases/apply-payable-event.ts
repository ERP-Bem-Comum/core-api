/**
 * Use case `applyPayableEvent` (#235) — projeta eventos de payable do `financial` no read-model
 * local `fin_payable_view` (ADR-0022 — projeção evento-carregada). Consumido pelo worker de
 * projeção (composition root). Molde de `applySupplierEvent`.
 *
 * `DocumentSaved` (enriquecido) cria/atualiza a linha por título (upsert idempotente); os eventos
 * de status atualizam só o `status`. Eventos fora do contrato → skip/ok. Payload malformado → erro
 * (o worker faz retry/DLQ — at-least-once).
 */
import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import {
  type PayableView,
  type PayableViewStatus,
  isDocumentStatus,
  documentStatusToViewStatus,
} from '../../domain/payable-view/types.ts';
import type { PayableViewStore, PayableViewStoreError } from '../ports/payable-view-store.ts';

export type ApplyPayableEventInput = Readonly<{ eventType: string; payload: string }>;

export type ApplyPayableEventError = 'payable-event-payload-invalid' | PayableViewStoreError;

type Deps = Readonly<{ store: PayableViewStore }>;

// Eventos que transicionam o status de um título já projetado.
const STATUS_BY_EVENT: Readonly<Record<string, PayableViewStatus>> = {
  PayableApproved: 'Approved',
  PayableManuallyPaid: 'Paid',
  DocumentCancelled: 'Cancelled',
  ApprovalUndone: 'Open',
};

type PayloadError = 'payable-event-payload-invalid';

const safeJsonParse = (raw: string): Result<Record<string, unknown>, PayloadError> => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return err('payable-event-payload-invalid');
    return ok(parsed as Record<string, unknown>);
  } catch {
    return err('payable-event-payload-invalid');
  }
};

const asString = (v: unknown): string | null => (typeof v === 'string' ? v : null);

const parseSnapshotRow = (
  documentId: string,
  refs: Readonly<Record<string, unknown>>,
  raw: unknown,
): PayableView | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const p = raw as Record<string, unknown>;
  const payableId = asString(p.payableId);
  const kind = p.kind === 'Parent' || p.kind === 'Child' ? p.kind : null;
  const valueCentsStr = asString(p.valueCents);
  const dueDate = asString(p.dueDate);
  const rawStatus = asString(p.status);
  if (
    payableId === null ||
    payableId === '' ||
    kind === null ||
    valueCentsStr === null ||
    !/^\d+$/.test(valueCentsStr) ||
    !Number.isSafeInteger(Number(valueCentsStr)) ||
    dueDate === null ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
    rawStatus === null ||
    !isDocumentStatus(rawStatus)
  ) {
    return null;
  }
  return {
    payableId,
    documentId,
    kind,
    retentionType: asString(p.retentionType),
    supplierRef: asString(refs.supplierRef),
    contractRef: asString(refs.contractRef),
    categoryRef: asString(refs.categoryRef),
    costCenterRef: asString(refs.costCenterRef),
    programRef: asString(refs.programRef),
    valueCents: Number(valueCentsStr),
    dueDate,
    // #307 (m2): snapshot carrega DocumentStatus (8); mapeia p/ os 4 do read-model.
    status: documentStatusToViewStatus(rawStatus),
  };
};

const parseDocumentSaved = (raw: string): Result<readonly PayableView[], PayloadError> => {
  const parsed = safeJsonParse(raw);
  if (!parsed.ok) return parsed;
  const obj = parsed.value;
  const documentId = asString(obj.documentId);
  if (documentId === null || !Array.isArray(obj.payables))
    return err('payable-event-payload-invalid');
  const rows: PayableView[] = [];
  for (const item of obj.payables) {
    const row = parseSnapshotRow(documentId, obj, item);
    if (row === null) return err('payable-event-payload-invalid');
    rows.push(row);
  }
  return ok(rows);
};

const parsePayableIds = (raw: string): Result<readonly string[], PayloadError> => {
  const parsed = safeJsonParse(raw);
  if (!parsed.ok) return parsed;
  const obj = parsed.value;
  // Chave presente como array → usa mesmo vazio (M1: DocumentCancelled de descarte de rascunho
  // carrega `[]` — no-op válido, não payload-invalid). Entrada não-string = corrompido → rejeita (m4).
  if (Array.isArray(obj.payableIds)) {
    const ids = obj.payableIds.filter((v): v is string => typeof v === 'string');
    if (ids.length === obj.payableIds.length) return ok(ids);
    return err('payable-event-payload-invalid');
  }
  const single = asString(obj.payableId);
  if (single !== null) return ok([single]);
  return err('payable-event-payload-invalid');
};

export const applyPayableEvent =
  (deps: Deps) =>
  async (input: ApplyPayableEventInput): Promise<Result<void, ApplyPayableEventError>> => {
    if (input.eventType === 'DocumentSaved') {
      const rows = parseDocumentSaved(input.payload);
      if (!rows.ok) return err(rows.error);
      return deps.store.upsert(rows.value);
    }
    const status = STATUS_BY_EVENT[input.eventType];
    if (status === undefined) return ok(undefined); // fora do contrato → skip
    const ids = parsePayableIds(input.payload);
    if (!ids.ok) return err(ids.error);
    return deps.store.updateStatus(ids.value, status);
  };
