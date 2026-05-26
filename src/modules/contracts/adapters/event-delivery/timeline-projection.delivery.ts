import { ok, err } from '../../../../shared/primitives/result.ts';
import type { ContractId, AmendmentId } from '../../domain/shared/ids.ts';
import type { TimelineRepository } from '../../domain/timeline/repository.ts';
import { toTimelineEntry } from '../../domain/timeline/projection.ts';
import type { EventDelivery } from '../../application/ports/event-delivery.ts';
import { deliveryUnavailable } from '../../application/ports/event-delivery.ts';

/**
 * Projetor da Timeline como `EventDelivery` (consumer 'timeline') — ADR-0022.
 * O worker já entrega cada evento; este consumer resolve o `contractId` e projeta
 * a entrada (idempotente por `eventId`). Evento não-atribuível → skip (CA-7).
 */
export const TimelineProjectionDelivery = (repo: TimelineRepository): EventDelivery => ({
  consumerId: 'timeline',
  deliver: async (processed) => {
    const event = processed.event;

    // Resolução do contractId: direto quando o evento o carrega; senão via índice
    // amendmentId→contractId (`parentId` de documento é `ContractId | AmendmentId`,
    // discriminado por `parentType` — cast seguro sob a guarda).
    let contractId: ContractId | null = null;
    switch (event.type) {
      case 'ContractCreated':
      case 'ContractStateUpdated':
      case 'ContractEnded':
      case 'AmendmentCreated':
        contractId = event.contractId;
        break;
      case 'AmendmentDocumentAttached':
      case 'AmendmentHomologated': {
        const r = await repo.findContractIdByAmendment(event.amendmentId);
        if (!r.ok) return err(deliveryUnavailable(r.error));
        contractId = r.value;
        break;
      }
      case 'ContractDocumentAttached':
      case 'ContractDocumentDeleted':
      case 'ContractDocumentSuperseded': {
        if (event.parentType === 'Contract') {
          contractId = event.parentId as ContractId;
        } else {
          const r = await repo.findContractIdByAmendment(event.parentId as AmendmentId);
          if (!r.ok) return err(deliveryUnavailable(r.error));
          contractId = r.value;
        }
        break;
      }
    }

    if (contractId === null) return ok(undefined); // não-atribuível → skip (CA-7)

    const appended = await repo.append(toTimelineEntry(event, processed.eventId, contractId));
    if (!appended.ok) return err(deliveryUnavailable(appended.error));
    return ok(undefined);
  },
});
