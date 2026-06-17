/**
 * Use case `applySupplierEvent` (US2 #47) — aplica um evento de fornecedor do `partners` no
 * read-model local `fin_supplier_view`. Consumido pelo worker de projeção (composition root).
 *
 * Sequência: filtra `SupplierRegistered`/`SupplierEdited` (demais → skip/ok) → parseia o payload
 * de integração (contrato ADR-0043) → `store.upsert` (o guard de recência por `occurredAt` vive no
 * store). Payload malformado → erro (o worker faz retry/DLQ — at-least-once).
 */
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  SupplierViewStore,
  SupplierViewStoreError,
} from '#src/modules/financial/application/ports/supplier-view-store.ts';
import type { SupplierView } from '#src/modules/financial/domain/supplier-view/types.ts';

export type ApplySupplierEventInput = Readonly<{ eventType: string; payload: string }>;

export type ApplySupplierEventError = 'supplier-event-payload-invalid' | SupplierViewStoreError;

type Deps = Readonly<{ store: SupplierViewStore }>;

// Eventos do contrato `partners → financial` que mantêm o read-model (ADR-0043).
const PUBLISHABLE: ReadonlySet<string> = new Set(['SupplierRegistered', 'SupplierEdited']);

const safeJsonParse = (raw: string): Result<unknown, 'supplier-event-payload-invalid'> => {
  try {
    return ok(JSON.parse(raw));
  } catch {
    return err('supplier-event-payload-invalid');
  }
};

const parsePayload = (raw: string): Result<SupplierView, 'supplier-event-payload-invalid'> => {
  const parsedJson = safeJsonParse(raw);
  if (!parsedJson.ok) return parsedJson;
  const parsed = parsedJson.value;
  if (typeof parsed !== 'object' || parsed === null) return err('supplier-event-payload-invalid');
  const { supplierRef, name, document, occurredAt } = parsed as Record<string, unknown>;
  if (
    typeof supplierRef !== 'string' ||
    typeof name !== 'string' ||
    typeof document !== 'string' ||
    typeof occurredAt !== 'string'
  ) {
    return err('supplier-event-payload-invalid');
  }
  const occurred = new Date(occurredAt);
  if (Number.isNaN(occurred.getTime())) return err('supplier-event-payload-invalid');
  return ok({ supplierRef, name, document, occurredAt: occurred });
};

export const applySupplierEvent =
  (deps: Deps) =>
  async (input: ApplySupplierEventInput): Promise<Result<void, ApplySupplierEventError>> => {
    if (!PUBLISHABLE.has(input.eventType)) return ok(undefined);
    const parsed = parsePayload(input.payload);
    if (!parsed.ok) return err(parsed.error);
    return deps.store.upsert(parsed.value);
  };
