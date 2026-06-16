// Mapper de integração: SupplierEvent[] + agregado Supplier → OutboxMessage[].
//
// Monta o evento de INTEGRAÇÃO (contrato `partners → financial`, ADR-0043) a partir
// do evento de DOMÍNIO + snapshot do agregado. Os eventos de domínio atuais não
// carregam `name` (Opção A do research) — o payload é enriquecido aqui, no adapter.
//
//   - Filtra: só `SupplierRegistered` e `SupplierEdited` viram mensagem; demais (Deactivated/
//     Reactivated) são descartados (não fazem parte do contrato de read-model nome/CNPJ).
//   - Payload autocontido: `{ supplierRef, name, document, occurredAt }` (JSON.stringify — sem
//     JSON nativo, ADR-0020); `eventId` = UUID v4 novo; `aggregateType` = 'Supplier'.
//
// ADR-0015 (outbox), ADR-0014 (par_*), ADR-0006 (evento-de-integração ≠ evento-de-domínio).

import { newUuid } from '#src/shared/utils/id.ts';
import type { SupplierEvent } from '#src/modules/partners/domain/supplier/events.ts';
import type { Supplier } from '#src/modules/partners/domain/supplier/types.ts';
import type { OutboxMessage } from '#src/modules/partners/application/ports/outbox.ts';

// Eventos publicáveis no contrato `partners → financial` (clarify: cadastrado + atualizado).
type PublishableEventType = 'SupplierRegistered' | 'SupplierEdited';

const PUBLISHABLE: ReadonlySet<PublishableEventType> = new Set([
  'SupplierRegistered',
  'SupplierEdited',
]);

const isPublishable = (
  event: Readonly<SupplierEvent>,
): event is Readonly<SupplierEvent> & { type: PublishableEventType } =>
  PUBLISHABLE.has(event.type as PublishableEventType);

/** Payload de integração autocontido (snapshot pós-operação do agregado). */
type SupplierIntegrationPayload = Readonly<{
  supplierRef: string;
  name: string;
  document: string;
  occurredAt: string;
}>;

const buildPayload = (
  event: Readonly<SupplierEvent>,
  supplier: Readonly<Supplier>,
): SupplierIntegrationPayload => ({
  supplierRef: String(supplier.id),
  name: supplier.name,
  document: String(supplier.cnpj),
  occurredAt: event.occurredAt.toISOString(),
});

/**
 * supplierEventsToOutboxMessages — filtra os eventos publicáveis e monta as
 * OutboxMessage de integração a partir do snapshot atual do agregado.
 *
 * `supplier` é o estado pós-operação (já persistido nesta mesma `save`): em
 * `SupplierRegistered` é o recém-cadastrado; em `SupplierEdited` é o pós-edição.
 */
export const supplierEventsToOutboxMessages = (
  events: readonly SupplierEvent[],
  supplier: Readonly<Supplier>,
): readonly OutboxMessage[] =>
  events.filter(isPublishable).map((event) => ({
    eventId: newUuid(),
    aggregateId: String(supplier.id),
    aggregateType: 'Supplier',
    eventType: event.type,
    occurredAt: event.occurredAt,
    payload: JSON.stringify(buildPayload(event, supplier)),
  }));
