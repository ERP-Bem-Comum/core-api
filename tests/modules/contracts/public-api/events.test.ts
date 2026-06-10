/**
 * Testes para `src/modules/contracts/public-api/events.ts`.
 *
 * Cobre CA-T1..T8 conforme 000-request §3:
 *  CA-T1  CONTRACTS_SCHEMA_VERSION === 1
 *  CA-T2  isContractsModuleEvent aceita event type válido
 *  CA-T3  isContractsModuleEvent rejeita type desconhecido
 *  CA-T4  isContractsModuleEvent rejeita não-objetos e objetos sem type
 *  CA-T5  decodeContractsModuleEventV1 desserializa row v1 válida → ok
 *  CA-T6  decodeContractsModuleEventV1 detecta schema version mismatch
 *  CA-T7  decodeContractsModuleEventV1 detecta payload corrompido
 *  CA-T8  type-level smoke test: ContractsModuleEvent cobre os 6 event types
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  CONTRACTS_SCHEMA_VERSION,
  isContractsModuleEvent,
  decodeContractsModuleEventV1,
  decoderInvalidShape,
  decoderSchemaVersionMismatch,
  decoderInvalidPayload,
} from '#src/modules/contracts/public-api/events.ts';
import type {
  ContractsModuleEvent,
  DecoderError,
  DecoderInvalidShape,
  DecoderSchemaVersionMismatch,
  DecoderInvalidPayload,
  OutboxRow,
} from '#src/modules/contracts/public-api/events.ts';
import { isOk, isErr } from '#src/shared/index.ts';

// ─── helpers ──────────────────────────────────────────────────────────────────

const mkDate = (iso: string) => new Date(iso);
const NOW = mkDate('2026-01-15T10:00:00.000Z');

// UUIDs v4 válidos (formato: xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx)
const UUID_EVENT = '12345678-1234-4abc-8def-123456789012';
const UUID_CONTRACT = 'abcdef12-abcd-4abc-9abc-abcdef123456';

/** Cria uma OutboxRow v1 válida para ContractCreated. */
const mkValidContractCreatedRow = (): OutboxRow => ({
  eventId: UUID_EVENT,
  aggregateId: UUID_CONTRACT,
  aggregateType: 'Contract',
  eventType: 'ContractCreated',
  schemaVersion: 1,
  occurredAt: NOW,
  enqueuedAt: NOW,
  processedAt: null,
  attempts: 0,
  payload: JSON.stringify({
    contractId: UUID_CONTRACT,
    occurredAt: NOW.toISOString(),
  }),
});

// ─── CA-T1 ────────────────────────────────────────────────────────────────────

describe('CONTRACTS_SCHEMA_VERSION', () => {
  it('CA-T1: deve ser 1', () => {
    assert.strictEqual(CONTRACTS_SCHEMA_VERSION, 1);
  });
});

// ─── CA-T2 ────────────────────────────────────────────────────────────────────

describe('isContractsModuleEvent — casos válidos', () => {
  const validTypes = [
    'ContractCreated',
    'ContractStateUpdated',
    'ContractEnded',
    'AmendmentCreated',
    'AmendmentDocumentAttached',
    'AmendmentHomologated',
  ] as const;

  for (const eventType of validTypes) {
    it(`CA-T2: deve aceitar { type: '${eventType}' }`, () => {
      // Arrange
      const candidate = { type: eventType, contractId: 'some-id', occurredAt: NOW };

      // Act
      const result = isContractsModuleEvent(candidate);

      // Assert
      assert.strictEqual(result, true);
    });
  }
});

// ─── CA-T3 ────────────────────────────────────────────────────────────────────

describe('isContractsModuleEvent — type desconhecido', () => {
  it("CA-T3: deve rejeitar { type: 'UnknownEvent' }", () => {
    // Arrange
    const candidate = { type: 'UnknownEvent', contractId: 'some-id' };

    // Act
    const result = isContractsModuleEvent(candidate);

    // Assert
    assert.strictEqual(result, false);
  });

  it("CA-T3: deve rejeitar { type: 'contractcreated' } (case-sensitive)", () => {
    // Arrange
    const candidate = { type: 'contractcreated' };

    // Act
    const result = isContractsModuleEvent(candidate);

    // Assert
    assert.strictEqual(result, false);
  });
});

// ─── CA-T4 ────────────────────────────────────────────────────────────────────

describe('isContractsModuleEvent — não-objetos e objetos sem type', () => {
  it('CA-T4: deve rejeitar null', () => {
    assert.strictEqual(isContractsModuleEvent(null), false);
  });

  it('CA-T4: deve rejeitar string primitiva', () => {
    assert.strictEqual(isContractsModuleEvent('ContractCreated'), false);
  });

  it('CA-T4: deve rejeitar número primitivo', () => {
    assert.strictEqual(isContractsModuleEvent(42), false);
  });

  it('CA-T4: deve rejeitar objeto sem campo type', () => {
    assert.strictEqual(isContractsModuleEvent({ contractId: 'abc' }), false);
  });

  it('CA-T4: deve rejeitar objeto com type não-string (número)', () => {
    assert.strictEqual(isContractsModuleEvent({ type: 123 }), false);
  });

  it('CA-T4: deve rejeitar undefined', () => {
    assert.strictEqual(isContractsModuleEvent(undefined), false);
  });
});

// ─── CA-T5 ────────────────────────────────────────────────────────────────────

describe('decodeContractsModuleEventV1 — row válida v1', () => {
  it('CA-T5: deve retornar ok com ContractCreated reidratado', () => {
    // Arrange
    const row = mkValidContractCreatedRow();

    // Act
    const result = decodeContractsModuleEventV1(row);

    // Assert
    assert.ok(isOk(result), `esperado ok, obtido: ${JSON.stringify(result)}`);
    assert.strictEqual(result.value.type, 'ContractCreated');
  });

  it('CA-T5: event reidratado passa no type guard isContractsModuleEvent', () => {
    // Arrange
    const row = mkValidContractCreatedRow();

    // Act
    const result = decodeContractsModuleEventV1(row);

    // Assert
    assert.ok(isOk(result));
    assert.ok(isContractsModuleEvent(result.value));
  });
});

// ─── CA-T6 ────────────────────────────────────────────────────────────────────

describe('decodeContractsModuleEventV1 — schema version mismatch', () => {
  it('CA-T6: deve retornar err(DecoderSchemaVersionMismatch) para schemaVersion 2', () => {
    // Arrange
    const row: OutboxRow = { ...mkValidContractCreatedRow(), schemaVersion: 2 };

    // Act
    const result = decodeContractsModuleEventV1(row);

    // Assert
    assert.ok(isErr(result), `esperado err, obtido: ${JSON.stringify(result)}`);
    assert.strictEqual(result.error.tag, 'DecoderSchemaVersionMismatch');
    const e = result.error as DecoderSchemaVersionMismatch;
    assert.strictEqual(e.expected, 1);
    assert.strictEqual(e.actual, 2);
  });
});

// ─── CA-T7 ────────────────────────────────────────────────────────────────────

describe('decodeContractsModuleEventV1 — payload corrompido', () => {
  it('CA-T7: deve retornar err(DecoderInvalidPayload) para payload JSON inválido', () => {
    // Arrange
    const row: OutboxRow = { ...mkValidContractCreatedRow(), payload: 'not-valid-json{{' };

    // Act
    const result = decodeContractsModuleEventV1(row);

    // Assert
    assert.ok(isErr(result), `esperado err, obtido: ${JSON.stringify(result)}`);
    assert.strictEqual(result.error.tag, 'DecoderInvalidPayload');
  });

  it('CA-T7: deve retornar err(DecoderInvalidPayload) para payload sem campo contractId', () => {
    // Arrange — payload bem formado mas faltando campo obrigatório
    const row: OutboxRow = {
      ...mkValidContractCreatedRow(),
      payload: JSON.stringify({ occurredAt: NOW.toISOString() }),
    };

    // Act
    const result = decodeContractsModuleEventV1(row);

    // Assert
    assert.ok(isErr(result), `esperado err, obtido: ${JSON.stringify(result)}`);
    assert.strictEqual(result.error.tag, 'DecoderInvalidPayload');
  });
});

// ─── CA-T8 — compile-time smoke ───────────────────────────────────────────────

describe('ContractsModuleEvent — smoke type-level', () => {
  it('CA-T8: o tipo deve aceitar todos os 6 event types (compile-time smoke)', () => {
    // Arrange — este teste valida em tempo de compilação que o tipo aceita cada variante.
    // Se algum type for removido de ContractsModuleEvent, o compilador falha aqui.
    const examples: ContractsModuleEvent[] = [
      { type: 'ContractCreated', contractId: 'id' as never, occurredAt: NOW },
      {
        type: 'ContractStateUpdated',
        contractId: 'id' as never,
        amendmentId: 'id' as never,
        occurredAt: NOW,
        newCurrentValue: { cents: 100 } as never,
        newCurrentPeriod: {} as never,
      },
      {
        type: 'ContractEnded',
        contractId: 'id' as never,
        occurredAt: NOW,
        kind: 'Expired',
        terminationReason: null,
      },
      {
        type: 'AmendmentCreated',
        amendmentId: 'id' as never,
        contractId: 'id' as never,
        occurredAt: NOW,
      },
      {
        type: 'AmendmentDocumentAttached',
        amendmentId: 'id' as never,
        signedDocumentRef: 'id' as never,
        occurredAt: NOW,
      },
      {
        type: 'AmendmentHomologated',
        amendmentId: 'id' as never,
        homologatedBy: 'id' as never,
        occurredAt: NOW,
      },
    ];

    // Assert — runtime: ao menos 6 variantes
    assert.strictEqual(examples.length, 6);
  });
});

// ─── case constructors (Padrão D) ────────────────────────────────────────────

describe('Case constructors de DecoderError', () => {
  it('decoderInvalidShape produz tagged record correto', () => {
    // Arrange + Act
    const e: DecoderInvalidShape = decoderInvalidShape('missing-field');

    // Assert
    assert.strictEqual(e.tag, 'DecoderInvalidShape');
    assert.strictEqual(e.reason, 'missing-field');
  });

  it('decoderSchemaVersionMismatch produz tagged record correto', () => {
    // Arrange + Act
    const e: DecoderSchemaVersionMismatch = decoderSchemaVersionMismatch(1, 2);

    // Assert
    assert.strictEqual(e.tag, 'DecoderSchemaVersionMismatch');
    assert.strictEqual(e.expected, 1);
    assert.strictEqual(e.actual, 2);
  });

  it('decoderInvalidPayload produz tagged record correto', () => {
    // Arrange
    const mapperError = {
      tag: 'OutboxMapperInvalidPayload' as const,
      reason: 'missing-contractId',
    };

    // Act
    const e: DecoderInvalidPayload = decoderInvalidPayload(mapperError);

    // Assert
    assert.strictEqual(e.tag, 'DecoderInvalidPayload');
    assert.deepStrictEqual(e.mapperError, mapperError);
  });

  it('DecoderError discriminated union cobre os 3 tags', () => {
    // Arrange — verifica exhaustiveness em compile time
    const errors: DecoderError[] = [
      decoderInvalidShape('r'),
      decoderSchemaVersionMismatch(1, 2),
      decoderInvalidPayload({ tag: 'OutboxMapperInvalidPayload', reason: 'r' }),
    ];

    // Assert
    assert.strictEqual(errors.length, 3);
  });
});
