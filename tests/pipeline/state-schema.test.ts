/**
 * W0 (RED) — Tests para `scripts/pipeline/state-schema.ts`.
 *
 * Ticket: CTR-PIPELINE-STATE-JSON.
 *
 * Cobre CA-T1..T4: parser de `PipelineState` (schema v1) com tagged errors.
 *
 * Estes tests DEVEM FALHAR em W0 — `scripts/pipeline/state-schema.ts` ainda não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  PIPELINE_STATE_SCHEMA_VERSION,
  parsePipelineState,
  type PipelineState,
} from '../../scripts/pipeline/state-schema.ts';

const validStateJson = JSON.stringify({
  schemaVersion: 1,
  ticket: 'CTR-EXAMPLE',
  size: 'S',
  createdAt: '2026-05-21T10:00:00.000Z',
  closedAt: null,
  currentWave: null,
  status: 'open',
  waves: [
    {
      id: 'W0',
      status: 'pending',
      agent: null,
      startedAt: null,
      finishedAt: null,
      rounds: 1,
      reportPath: null,
      outcome: null,
    },
    {
      id: 'W1',
      status: 'pending',
      agent: null,
      startedAt: null,
      finishedAt: null,
      rounds: 1,
      reportPath: null,
      outcome: null,
    },
    {
      id: 'W2',
      status: 'pending',
      agent: null,
      startedAt: null,
      finishedAt: null,
      rounds: 1,
      reportPath: null,
      outcome: null,
    },
    {
      id: 'W3',
      status: 'pending',
      agent: null,
      startedAt: null,
      finishedAt: null,
      rounds: 1,
      reportPath: null,
      outcome: null,
    },
  ],
  blockers: [],
  lastEvent: 'init',
});

describe('parsePipelineState — schema v1', () => {
  it('CA-T1: aceita JSON válido v1 e retorna PipelineState', () => {
    // Act
    const r = parsePipelineState(validStateJson);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      const value: PipelineState = r.value;
      assert.equal(value.schemaVersion, PIPELINE_STATE_SCHEMA_VERSION);
      assert.equal(value.ticket, 'CTR-EXAMPLE');
      assert.equal(value.size, 'S');
      assert.equal(value.status, 'open');
      assert.equal(value.waves.length, 4);
      assert.equal(value.waves[0]?.id, 'W0');
      assert.equal(value.waves[3]?.id, 'W3');
    }
  });

  it('CA-T2: rejeita JSON malformado com tag InvalidJson', () => {
    // Act
    const r = parsePipelineState('not a json {');

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error.tag, 'InvalidJson');
    }
  });

  it('CA-T3: rejeita schemaVersion incompatível com tag SchemaVersionMismatch', () => {
    // Arrange
    const raw = JSON.parse(validStateJson) as Record<string, unknown>;
    raw['schemaVersion'] = 2;

    // Act
    const r = parsePipelineState(JSON.stringify(raw));

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok && r.error.tag === 'SchemaVersionMismatch') {
      assert.equal(r.error.expected, 1);
      assert.equal(r.error.actual, 2);
    } else {
      assert.fail(`esperado SchemaVersionMismatch, recebeu: ${JSON.stringify(r)}`);
    }
  });

  it('CA-T4: rejeita JSON sem campo obrigatório com tag MissingField', () => {
    // Arrange
    const raw = JSON.parse(validStateJson) as Record<string, unknown>;
    delete raw['ticket'];

    // Act
    const r = parsePipelineState(JSON.stringify(raw));

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok && r.error.tag === 'MissingField') {
      assert.equal(r.error.field, 'ticket');
    } else {
      assert.fail(`esperado MissingField('ticket'), recebeu: ${JSON.stringify(r)}`);
    }
  });
});
