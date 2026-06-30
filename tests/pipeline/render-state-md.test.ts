/**
 * W0 (RED) — Tests para `scripts/pipeline/render-state-md.ts`.
 *
 * Ticket: CTR-PIPELINE-STATE-JSON.
 *
 * Cobre CA-T6 (determinismo) e CA-T7 (compat com hook `inject-ticket-context.sh`,
 * que detecta tickets pelo header `# Estado do Ticket <ID>` e parseia a tabela
 * de waves com `| W0 ` / `| W1 ` / `| W2 ` / `| W3 `).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { renderStateMd } from '../../scripts/pipeline/render-state-md.ts';
import type { PipelineState } from '../../scripts/pipeline/state-schema.ts';

const fixture = (): PipelineState => ({
  schemaVersion: 1,
  ticket: 'CTR-EXAMPLE',
  size: 'S',
  createdAt: '2026-05-21T10:00:00.000Z',
  closedAt: null,
  currentWave: 'W1',
  status: 'in-progress',
  waves: [
    {
      id: 'W0',
      status: 'done',
      agent: 'tdd-strategist',
      startedAt: '2026-05-21T10:00:00.000Z',
      finishedAt: '2026-05-21T10:30:00.000Z',
      rounds: 1,
      reportPath: '.claude/.pipeline/CTR-EXAMPLE/002-tests/REPORT.md',
      outcome: 'RED',
    },
    {
      id: 'W1',
      status: 'in-progress',
      agent: 'ts-domain-modeler',
      startedAt: '2026-05-21T10:31:00.000Z',
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
  lastEvent: 'W0 closed RED',
});

describe('renderStateMd — determinismo e compat com hook', () => {
  it('CA-T6: produz string idêntica em chamadas sucessivas com mesmo input', () => {
    // Arrange
    const state = fixture();

    // Act
    const a = renderStateMd(state);
    const b = renderStateMd(state);

    // Assert
    assert.equal(a, b);
  });

  it('CA-T7: output contém marcadores esperados pelo hook (header + 4 linhas de tabela de waves)', () => {
    // Arrange
    const state = fixture();

    // Act
    const md = renderStateMd(state);

    // Assert — ID do ticket no header
    assert.ok(md.includes('CTR-EXAMPLE'), 'deve conter o ID do ticket');

    // Tabela de waves W0..W3 em formato Markdown table
    assert.ok(md.includes('| W0 '), 'deve conter linha da W0');
    assert.ok(md.includes('| W1 '), 'deve conter linha da W1');
    assert.ok(md.includes('| W2 '), 'deve conter linha da W2');
    assert.ok(md.includes('| W3 '), 'deve conter linha da W3');

    // Status atual + outcome do W0 visíveis
    assert.ok(md.includes('in-progress'), 'deve refletir status atual W1');
    assert.ok(md.includes('done'), 'deve refletir W0 done');
    assert.ok(md.includes('RED'), 'deve refletir outcome RED do W0');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CTR-PIPELINE-SUPERSEDE-STATUS — STATE.md de ticket superseded cita o vencedor.
// ─────────────────────────────────────────────────────────────────────────────

describe('renderStateMd — superseded (CTR-PIPELINE-SUPERSEDE-STATUS)', () => {
  it('CA-R1: rotula status superseded e cita o ticket que substituiu', () => {
    const state: PipelineState = {
      ...fixture(),
      ticket: 'CTR-LOSER',
      status: 'superseded',
      closedAt: '2026-05-27T00:00:00.000Z',
      supersededBy: 'CTR-WINNER',
    };

    const md = renderStateMd(state);

    assert.match(md, /superseded/i, 'header deve mostrar o status superseded');
    assert.match(md, /CTR-WINNER/, 'STATE.md deve citar o ticket que substituiu');
  });
});
