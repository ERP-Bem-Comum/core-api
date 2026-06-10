/**
 * CTR-NUMBER-PROGRAM — W0 (RED) — composição do bloco `program` na borda (ADR-0032/0006/0014).
 *
 * DEVE FALHAR: `program-composition.ts` e o `ProgramReadPort` (programs/public-api) ainda não existem.
 * GREEN no W1. Espelha a composição do contratado (Parceiros): degrada p/ `snapshot: null`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/index.ts';
import type { ProgramReadPort, ProgramView } from '#src/modules/programs/public-api/index.ts';
import {
  composeProgramBlock,
  composeProgramBlocks,
} from '#src/modules/contracts/adapters/http/program-composition.ts';

const PROG_A = '77777777-7777-4777-8777-777777777777';
const PROG_B = '88888888-8888-4888-8888-888888888888';

const viewA: ProgramView = {
  id: PROG_A,
  name: 'Programa Mãe Atende',
  sigla: 'PMA',
  programNumber: 1,
};

// Fake port: devolve só os ids conhecidos (B é "inexistente").
const fakePort: ProgramReadPort = {
  getProgramViews: (ids) => {
    const map = new Map<string, ProgramView>();
    for (const id of ids) if (id === PROG_A) map.set(PROG_A, viewA);
    return Promise.resolve(ok(map));
  },
};

describe('composeProgramBlock (single — detalhe)', () => {
  it('programId null → bloco null (contrato sem programa)', async () => {
    assert.equal(await composeProgramBlock(fakePort, null), null);
  });

  it('programId encontrado → { id, snapshot: {name, sigla, programNumber} }', async () => {
    const block = await composeProgramBlock(fakePort, PROG_A);
    assert.deepEqual(block, {
      id: PROG_A,
      snapshot: { name: 'Programa Mãe Atende', sigla: 'PMA', programNumber: 1 },
    });
  });

  it('programId inexistente → { id, snapshot: null }', async () => {
    assert.deepEqual(await composeProgramBlock(fakePort, PROG_B), { id: PROG_B, snapshot: null });
  });

  it('port null (degrada) → { id, snapshot: null }', async () => {
    assert.deepEqual(await composeProgramBlock(null, PROG_A), { id: PROG_A, snapshot: null });
  });
});

describe('composeProgramBlocks (batch — listagem, sem N+1)', () => {
  it('mapeia ids → snapshot (um getProgramViews para a página)', async () => {
    let calls = 0;
    const counting: ProgramReadPort = {
      getProgramViews: async (ids) => {
        calls += 1;
        return fakePort.getProgramViews(ids);
      },
    };
    const map = await composeProgramBlocks(counting, [PROG_A, PROG_B, null]);
    assert.equal(calls, 1); // batch: uma única chamada
    assert.deepEqual(map.get(PROG_A), {
      name: 'Programa Mãe Atende',
      sigla: 'PMA',
      programNumber: 1,
    });
    assert.equal(map.get(PROG_B) ?? null, null);
  });

  it('port null → mapa vazio (tudo degrada p/ null)', async () => {
    const map = await composeProgramBlocks(null, [PROG_A]);
    assert.equal(map.get(PROG_A) ?? null, null);
  });
});
