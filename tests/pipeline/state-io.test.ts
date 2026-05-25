/**
 * W0 (RED) — Tests para `scripts/pipeline/state-io.ts`.
 *
 * Ticket: CTR-PIPELINE-STATE-JSON.
 *
 * Cobre CA-T5: atomic write — `writeState` usa `tmpfile + rename`. Em falha
 * do rename, o STATE.json original permanece intacto.
 *
 * **Constraint para W1:** o impl precisa importar `node:fs/promises` via
 * namespace (`import * as fsp from 'node:fs/promises'`) e chamar
 * `fsp.rename(...)`. Isso permite o `t.mock.method(fsp, 'rename', ...)`
 * deste test substituir a função real.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import * as fsp from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readState, writeState } from '../../scripts/pipeline/state-io.ts';
import type { PipelineState } from '../../scripts/pipeline/state-schema.ts';

const fixture = (ticket = 'CTR-EXAMPLE'): PipelineState => ({
  schemaVersion: 1,
  ticket,
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

describe('writeState / readState — atomic IO', () => {
  it('CA-T5a: writeState happy path produz STATE.json válido e sem .tmp residual', async () => {
    // Arrange
    const dir = await fsp.mkdtemp(join(tmpdir(), 'ctr-pipeline-io-'));
    const state = fixture();

    // Act
    const w = await writeState(dir, state);

    // Assert — write retornou ok
    assert.equal(w.ok, true);

    // Arquivo final existe
    const filePath = join(dir, 'STATE.json');
    assert.ok(existsSync(filePath), 'STATE.json deve existir após writeState');

    // Sem tmpfile residual
    const tmpPath = join(dir, 'STATE.json.tmp');
    assert.ok(!existsSync(tmpPath), 'STATE.json.tmp não deve sobrar');

    // Read traz o mesmo estado
    const r = await readState(dir);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.ticket, state.ticket);
      assert.equal(r.value.waves.length, 4);
    }
  });

  it('CA-T5b: writeState com falha simulada no rename preserva STATE.json original intacto', async () => {
    // Arrange — STATE.json existente com conteúdo A
    const dir = await fsp.mkdtemp(join(tmpdir(), 'ctr-pipeline-io-'));
    const stateA = fixture('CTR-EXAMPLE-A');
    const stateB = fixture('CTR-EXAMPLE-B');
    await fsp.writeFile(join(dir, 'STATE.json'), JSON.stringify(stateA), 'utf8');

    // Act — injeta rename que falha via DI explícita (opts.rename)
    // `t.mock.method(fsp, 'rename', ...)` não funciona em módulos nativos
    // (propriedades non-configurable). DI evita esse problema e mantém o impl
    // de produção limpo (opts é opcional e padrão usa fsp real).
    const w = await writeState(dir, stateB, {
      rename: async () => {
        await Promise.resolve();
        throw new Error('simulated rename failure');
      },
    });

    // Assert — write deve retornar err
    assert.equal(w.ok, false);

    // STATE.json original permanece intacto
    const content = await fsp.readFile(join(dir, 'STATE.json'), 'utf8');
    const parsed = JSON.parse(content) as { ticket: string };
    assert.equal(parsed.ticket, 'CTR-EXAMPLE-A');
  });
});
