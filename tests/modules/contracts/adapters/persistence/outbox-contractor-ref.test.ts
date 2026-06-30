/**
 * CTR-CONTRACT-EVENT-CONTRACTOR-REF (US6a) — W0 (RED).
 *
 * Enriquecimento ADITIVO do wire-format v1 do `ctr_outbox` com `contractorRef` (Opção A do
 * ADR-0046 — montado no adapter a partir do snapshot; domínio/evento/decoder de domínio intocados)
 * + exposição no `public-api` para o consumidor de contagem (partners, US6b).
 *
 * DEVE FALHAR: `contractEventsToOutboxInserts` (mapper) e `decodeContractContractorRefV1`
 * (public-api) ainda não existem. GREEN quando o W1 entregar a função enriquecedora (espelho do
 * `supplier-outbox.mapper.ts`) + o accessor, sem bump de `OUTBOX_SCHEMA_VERSION`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor.ts';
import type { ContractsModuleEvent } from '#src/modules/contracts/application/ports/event-bus.ts';
// RED: símbolos ainda inexistentes (W1 cria).
import {
  contractEventsToOutboxInserts,
  outboxRowToEvent,
  type OutboxRow,
} from '#src/modules/contracts/adapters/persistence/mappers/outbox.mapper.ts';
import { decodeContractContractorRefV1 } from '#src/modules/contracts/public-api/events.ts';

const NOW = new Date('2026-06-17T12:00:00.000Z');
const CONTRACT_UUID = '11111111-1111-4111-8111-111111111111';
const CONTRACTOR_UUID = '22222222-2222-4222-8222-222222222222';

let idSeq = 0;
const idGen = (): string => `evt-${(idSeq += 1)}`;

const contractId = () => {
  const r = ContractId.rehydrate(CONTRACT_UUID);
  if (!r.ok) throw new Error('fixture contractId');
  return r.value;
};
const contractor = () => {
  const r = ContractorRef.make('collaborator', CONTRACTOR_UUID);
  if (!r.ok) throw new Error(`fixture contractor: ${r.error}`);
  return r.value;
};

const payloadOf = (events: readonly ContractsModuleEvent[]): Record<string, unknown> => {
  const inserts = contractEventsToOutboxInserts(events, contractor(), NOW, idGen);
  assert.equal(inserts.length, 1);
  return JSON.parse(inserts[0]!.payload) as Record<string, unknown>;
};

describe('US6a — contractorRef aditivo no wire-format v1 do ctr_outbox', () => {
  it('CA1: ContractCreated enriquecido carrega contractorRef { type, id }; v1 preservado; sem bump', () => {
    const events: readonly ContractsModuleEvent[] = [
      { type: 'ContractCreated', contractId: contractId(), occurredAt: NOW },
    ];
    const inserts = contractEventsToOutboxInserts(events, contractor(), NOW, idGen);
    const payload = JSON.parse(inserts[0]!.payload) as Record<string, unknown>;
    assert.equal(payload['contractId'], CONTRACT_UUID, 'campo v1 preservado');
    assert.deepEqual(payload['contractorRef'], { type: 'collaborator', id: CONTRACTOR_UUID });
    assert.equal(inserts[0]!.schemaVersion, 1, 'aditivo — sem bump de schemaVersion');
  });

  it('CA2: ContractCancelled e ContractEnded também carregam contractorRef', () => {
    const cancelled = payloadOf([
      { type: 'ContractCancelled', contractId: contractId(), occurredAt: NOW },
    ]);
    assert.deepEqual(cancelled['contractorRef'], { type: 'collaborator', id: CONTRACTOR_UUID });
    const ended = payloadOf([
      {
        type: 'ContractEnded',
        contractId: contractId(),
        occurredAt: NOW,
        kind: 'Terminated',
        terminationReason: null,
      } as ContractsModuleEvent,
    ]);
    assert.deepEqual(ended['contractorRef'], { type: 'collaborator', id: CONTRACTOR_UUID });
  });

  it('CA3: public-api expõe contractorRef ao consumidor (decodeContractContractorRefV1)', () => {
    const insert = contractEventsToOutboxInserts(
      [{ type: 'ContractCreated', contractId: contractId(), occurredAt: NOW }],
      contractor(),
      NOW,
      idGen,
    )[0]!;
    const decoded = decodeContractContractorRefV1({
      eventType: insert.eventType,
      schemaVersion: insert.schemaVersion,
      payload: insert.payload,
      occurredAt: NOW,
    });
    assert.ok(decoded.ok);
    if (decoded.ok) {
      assert.notEqual(decoded.value, null);
      assert.equal(decoded.value?.contractRef, CONTRACT_UUID);
      assert.deepEqual(decoded.value?.contractorRef, {
        type: 'collaborator',
        id: CONTRACTOR_UUID,
      });
    }
  });

  it('CA4: retrocompat — outboxRowToEvent (decoder de domínio) ignora o campo extra', () => {
    const insert = contractEventsToOutboxInserts(
      [{ type: 'ContractCreated', contractId: contractId(), occurredAt: NOW }],
      contractor(),
      NOW,
      idGen,
    )[0]!;
    const decoded = outboxRowToEvent({
      schemaVersion: insert.schemaVersion,
      eventType: insert.eventType,
      payload: insert.payload,
      occurredAt: NOW,
    } as unknown as OutboxRow);
    assert.ok(decoded.ok);
    if (decoded.ok) assert.equal(decoded.value.type, 'ContractCreated');
  });

  it('CA5: contractorRef malformado (id faltando) → DecoderInvalidShape (defesa na borda)', () => {
    const decoded = decodeContractContractorRefV1({
      eventType: 'ContractCreated',
      schemaVersion: 1,
      payload: JSON.stringify({
        contractId: CONTRACT_UUID,
        contractorRef: { type: 'collaborator' },
      }),
      occurredAt: NOW,
    });
    assert.ok(!decoded.ok);
    if (!decoded.ok) assert.equal(decoded.error.tag, 'DecoderInvalidShape');
  });
});
