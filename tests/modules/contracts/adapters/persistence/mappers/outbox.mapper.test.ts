/**
 * Testes de round-trip para `outbox.mapper.ts`.
 *
 * Cobre CA3 + CA7: eventToOutboxInsert + outboxRowToEvent para os 6 event types.
 * Verifica preservação semântica de Money.cents, Period.kind/start/end,
 * branded UUIDs, occurredAt ISO e schemaVersion mismatch.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  eventToOutboxInsert,
  outboxRowToEvent,
  OUTBOX_SCHEMA_VERSION,
} from '#src/modules/contracts/adapters/persistence/mappers/outbox.mapper.ts';
import type { OutboxRow } from '#src/modules/contracts/adapters/persistence/mappers/outbox.mapper.ts';
import { isOk, isErr } from '#src/shared/index.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as AmendmentId from '#src/modules/contracts/domain/shared/amendment-id.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import type { ContractsModuleEvent } from '#src/modules/contracts/application/ports/event-bus.ts';

// ─── helpers ──────────────────────────────────────────────────────────────────

const mkDate = (iso: string) => new Date(iso);
const NOW = mkDate('2026-01-15T10:00:00.000Z');

const unwrap = <T>(label: string, r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(`fixture broken (${label}): ${String(r.error)}`);
  return r.value;
};

const mkMoney = (cents: number) => unwrap('Money', Money.fromCents(cents));
const mkPlainDate = (iso: string) => unwrap('PlainDate', PlainDate.from(iso.slice(0, 10)));
const mkFixedPeriod = (start: string, end: string) =>
  unwrap('Period.Fixed', Period.create(mkPlainDate(start), mkPlainDate(end)));
const mkIndefinitePeriod = (start: string) => Period.createIndefinite(mkPlainDate(start));

// Converte OutboxInsert para OutboxRow adicionando os campos de controle ausentes
// (processedAt null, attempts 0) — simula o que o banco devolveria após INSERT.
const insertToRow = (insert: ReturnType<typeof eventToOutboxInsert>): OutboxRow => ({
  ...insert,
  processedAt: null,
  attempts: insert.attempts ?? 0,
});

// ─── round-trip helper ────────────────────────────────────────────────────────

const roundTrip = (event: ContractsModuleEvent) => {
  const insert = eventToOutboxInsert(event, NOW);
  const row = insertToRow(insert);
  return { insert, row, rehydrated: outboxRowToEvent(row) };
};

// ─── testes ───────────────────────────────────────────────────────────────────

describe('outbox.mapper — round-trip dos 6 event types', () => {
  it('OUTBOX_SCHEMA_VERSION é 1 (CA9)', () => {
    assert.equal(OUTBOX_SCHEMA_VERSION, 1);
  });

  describe('ContractCreated', () => {
    it('round-trip preserva contractId, occurredAt e eventType', () => {
      const contractId = ContractId.generate();
      const occurredAt = mkDate('2026-02-01T08:00:00.000Z');
      const event: ContractsModuleEvent = { type: 'ContractCreated', contractId, occurredAt };

      const { insert, rehydrated } = roundTrip(event);

      assert.equal(insert.eventType, 'ContractCreated');
      assert.equal(insert.aggregateType, 'Contract');
      assert.equal(insert.aggregateId, contractId as unknown as string);
      assert.equal(insert.schemaVersion, OUTBOX_SCHEMA_VERSION);

      assert.equal(
        isOk(rehydrated),
        true,
        `rehydration falhou: ${JSON.stringify(!rehydrated.ok ? rehydrated.error : '')}`,
      );
      if (!rehydrated.ok) return;
      assert.equal(rehydrated.value.type, 'ContractCreated');
      if (rehydrated.value.type === 'ContractCreated') {
        assert.equal(
          rehydrated.value.contractId as unknown as string,
          contractId as unknown as string,
        );
        assert.equal(rehydrated.value.occurredAt.toISOString(), occurredAt.toISOString());
      }
    });
  });

  // CTR-DOMAIN-CONTRACT-ACTIVATE — evento da transição Pending → Active.
  describe('ContractActivated', () => {
    it('round-trip preserva contractId, occurredAt e eventType', () => {
      const contractId = ContractId.generate();
      const occurredAt = mkDate('2026-03-15T08:00:00.000Z');
      const event: ContractsModuleEvent = { type: 'ContractActivated', contractId, occurredAt };

      const { insert, rehydrated } = roundTrip(event);

      assert.equal(insert.eventType, 'ContractActivated');
      assert.equal(insert.aggregateType, 'Contract');
      assert.equal(insert.aggregateId, contractId as unknown as string);

      assert.equal(
        isOk(rehydrated),
        true,
        `rehydration falhou: ${JSON.stringify(!rehydrated.ok ? rehydrated.error : '')}`,
      );
      if (!rehydrated.ok) return;
      assert.equal(rehydrated.value.type, 'ContractActivated');
      if (rehydrated.value.type === 'ContractActivated') {
        assert.equal(
          rehydrated.value.contractId as unknown as string,
          contractId as unknown as string,
        );
        assert.equal(rehydrated.value.occurredAt.toISOString(), occurredAt.toISOString());
      }
    });
  });

  describe('ContractStateUpdated', () => {
    it('round-trip preserva newCurrentValue.cents com Period.Fixed', () => {
      const contractId = ContractId.generate();
      const amendmentId = AmendmentId.generate();
      const money = mkMoney(150_000);
      const period = mkFixedPeriod('2026-01-01T00:00:00.000Z', '2026-12-31T00:00:00.000Z');
      const event: ContractsModuleEvent = {
        type: 'ContractStateUpdated',
        contractId,
        amendmentId,
        occurredAt: NOW,
        newCurrentValue: money,
        newCurrentPeriod: period,
      };

      const { rehydrated } = roundTrip(event);

      assert.equal(
        isOk(rehydrated),
        true,
        `rehydration falhou: ${JSON.stringify(!rehydrated.ok ? rehydrated.error : '')}`,
      );
      if (!rehydrated.ok) return;
      assert.equal(rehydrated.value.type, 'ContractStateUpdated');
      if (rehydrated.value.type === 'ContractStateUpdated') {
        assert.equal(rehydrated.value.newCurrentValue.cents, 150_000);
        assert.equal(rehydrated.value.newCurrentPeriod.kind, 'Fixed');
        if (rehydrated.value.newCurrentPeriod.kind === 'Fixed') {
          assert.equal(
            PlainDate.toISOString(rehydrated.value.newCurrentPeriod.start),
            '2026-01-01',
          );
          assert.equal(PlainDate.toISOString(rehydrated.value.newCurrentPeriod.end), '2026-12-31');
        }
      }
    });

    it('round-trip preserva Period.Indefinite (sem end)', () => {
      const contractId = ContractId.generate();
      const amendmentId = AmendmentId.generate();
      const money = mkMoney(50_000);
      const period = mkIndefinitePeriod('2026-03-01T00:00:00.000Z');
      const event: ContractsModuleEvent = {
        type: 'ContractStateUpdated',
        contractId,
        amendmentId,
        occurredAt: NOW,
        newCurrentValue: money,
        newCurrentPeriod: period,
      };

      const { rehydrated } = roundTrip(event);

      assert.equal(isOk(rehydrated), true);
      if (!rehydrated.ok) return;
      if (rehydrated.value.type === 'ContractStateUpdated') {
        assert.equal(rehydrated.value.newCurrentPeriod.kind, 'Indefinite');
        if (rehydrated.value.newCurrentPeriod.kind === 'Indefinite') {
          assert.equal(
            PlainDate.toISOString(rehydrated.value.newCurrentPeriod.start),
            '2026-03-01',
          );
        }
      }
    });
  });

  describe('ContractEnded', () => {
    it('round-trip preserva kind Expired', () => {
      const contractId = ContractId.generate();
      const event: ContractsModuleEvent = {
        type: 'ContractEnded',
        contractId,
        occurredAt: NOW,
        kind: 'Expired',
        terminationReason: null,
      };

      const { rehydrated } = roundTrip(event);

      assert.equal(isOk(rehydrated), true);
      if (!rehydrated.ok) return;
      assert.equal(rehydrated.value.type, 'ContractEnded');
      if (rehydrated.value.type === 'ContractEnded') {
        assert.equal(rehydrated.value.kind, 'Expired');
      }
    });

    it('round-trip preserva kind Terminated', () => {
      const contractId = ContractId.generate();
      const event: ContractsModuleEvent = {
        type: 'ContractEnded',
        contractId,
        occurredAt: NOW,
        kind: 'Terminated',
        terminationReason: 'Distrato por acordo entre as partes',
      };

      const { rehydrated } = roundTrip(event);

      assert.equal(isOk(rehydrated), true);
      if (!rehydrated.ok) return;
      if (rehydrated.value.type === 'ContractEnded') {
        assert.equal(rehydrated.value.kind, 'Terminated');
        // CTR-HTTP-DISTRATO-DOCUMENTO: o motivo sobrevive ao round-trip (serial/deserial).
        assert.equal(rehydrated.value.terminationReason, 'Distrato por acordo entre as partes');
      }
    });

    it('retrocompat: payload v1 sem terminationReason desserializa como null', () => {
      const contractId = ContractId.generate();
      const insert = eventToOutboxInsert(
        {
          type: 'ContractEnded',
          contractId,
          occurredAt: NOW,
          kind: 'Terminated',
          terminationReason: 'motivo qualquer',
        },
        NOW,
      );
      // Simula evento gravado antes da feature: remove o campo do payload JSON.
      const payloadV1 = JSON.parse(insert.payload) as Record<string, unknown>;
      delete payloadV1['terminationReason'];
      const rowV1 = insertToRow({ ...insert, payload: JSON.stringify(payloadV1) });

      const rehydrated = outboxRowToEvent(rowV1);
      assert.equal(isOk(rehydrated), true);
      if (rehydrated.ok && rehydrated.value.type === 'ContractEnded') {
        assert.equal(rehydrated.value.terminationReason, null);
      }
    });
  });

  describe('AmendmentCreated', () => {
    it('round-trip preserva amendmentId e contractId', () => {
      const amendmentId = AmendmentId.generate();
      const contractId = ContractId.generate();
      const event: ContractsModuleEvent = {
        type: 'AmendmentCreated',
        amendmentId,
        contractId,
        occurredAt: NOW,
      };

      const { rehydrated } = roundTrip(event);

      assert.equal(isOk(rehydrated), true);
      if (!rehydrated.ok) return;
      assert.equal(rehydrated.value.type, 'AmendmentCreated');
      if (rehydrated.value.type === 'AmendmentCreated') {
        assert.equal(
          rehydrated.value.amendmentId as unknown as string,
          amendmentId as unknown as string,
        );
        assert.equal(
          rehydrated.value.contractId as unknown as string,
          contractId as unknown as string,
        );
      }
    });
  });

  describe('AmendmentDocumentAttached', () => {
    it('round-trip preserva signedDocumentRef', () => {
      const amendmentId = AmendmentId.generate();
      const documentId = DocumentId.generate();
      const event: ContractsModuleEvent = {
        type: 'AmendmentDocumentAttached',
        amendmentId,
        signedDocumentRef: documentId,
        occurredAt: NOW,
      };

      const { rehydrated } = roundTrip(event);

      assert.equal(isOk(rehydrated), true);
      if (!rehydrated.ok) return;
      assert.equal(rehydrated.value.type, 'AmendmentDocumentAttached');
      if (rehydrated.value.type === 'AmendmentDocumentAttached') {
        assert.equal(
          rehydrated.value.signedDocumentRef as unknown as string,
          documentId as unknown as string,
        );
      }
    });
  });

  describe('AmendmentHomologated', () => {
    it('round-trip preserva homologatedBy (UserRef UUID)', () => {
      const amendmentId = AmendmentId.generate();
      const userRefRaw = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      const userRef = unwrap('UserRef', UserRef.rehydrate(userRefRaw));
      const event: ContractsModuleEvent = {
        type: 'AmendmentHomologated',
        amendmentId,
        homologatedBy: userRef,
        occurredAt: NOW,
      };

      const { rehydrated } = roundTrip(event);

      assert.equal(isOk(rehydrated), true);
      if (!rehydrated.ok) return;
      assert.equal(rehydrated.value.type, 'AmendmentHomologated');
      if (rehydrated.value.type === 'AmendmentHomologated') {
        assert.equal(rehydrated.value.homologatedBy as unknown as string, userRefRaw);
      }
    });
  });

  describe('erros de reidratação', () => {
    it('schemaVersion mismatch retorna err OutboxMapperSchemaVersionMismatch', () => {
      const contractId = ContractId.generate();
      const event: ContractsModuleEvent = { type: 'ContractCreated', contractId, occurredAt: NOW };
      const insert = eventToOutboxInsert(event, NOW);
      const row: OutboxRow = {
        ...insert,
        processedAt: null,
        attempts: insert.attempts ?? 0,
        schemaVersion: 99, // versão desconhecida
      };

      const result = outboxRowToEvent(row);
      assert.equal(isErr(result), true);
      if (!result.ok) {
        assert.equal(result.error.tag, 'OutboxMapperSchemaVersionMismatch');
        if (result.error.tag === 'OutboxMapperSchemaVersionMismatch') {
          assert.equal(result.error.expected, OUTBOX_SCHEMA_VERSION);
          assert.equal(result.error.actual, 99);
        }
      }
    });

    it('payload JSON inválido retorna err OutboxMapperInvalidPayload', () => {
      const contractId = ContractId.generate();
      const event: ContractsModuleEvent = { type: 'ContractCreated', contractId, occurredAt: NOW };
      const insert = eventToOutboxInsert(event, NOW);
      const row: OutboxRow = {
        ...insert,
        processedAt: null,
        attempts: insert.attempts ?? 0,
        payload: '{INVALID JSON{{{{',
      };

      const result = outboxRowToEvent(row);
      assert.equal(isErr(result), true);
      if (!result.ok) {
        assert.equal(result.error.tag, 'OutboxMapperInvalidPayload');
      }
    });

    it('eventType desconhecido no payload retorna err OutboxMapperUnknownEventType', () => {
      const contractId = ContractId.generate();
      const event: ContractsModuleEvent = { type: 'ContractCreated', contractId, occurredAt: NOW };
      const insert = eventToOutboxInsert(event, NOW);
      const row: OutboxRow = {
        ...insert,
        processedAt: null,
        attempts: insert.attempts ?? 0,
        eventType: 'UnknownEventType',
        payload: JSON.stringify({
          contractId: contractId as unknown as string,
          occurredAt: NOW.toISOString(),
        }),
      };

      const result = outboxRowToEvent(row);
      assert.equal(isErr(result), true);
      if (!result.ok) {
        assert.equal(result.error.tag, 'OutboxMapperUnknownEventType');
      }
    });
  });
});
