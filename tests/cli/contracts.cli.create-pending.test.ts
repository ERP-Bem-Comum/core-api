/**
 * W0 (RED) — CTR-CLI-CRIAR-CONTRATO-PENDING
 *
 * `criar-contrato` SEM `--assinado-em` cadastra um contrato Pendente (ADR-0023).
 * Com `--assinado-em`, segue criando Ativo (regressão, coberta por contracts.cli.test.ts).
 *
 * Estado W0: hoje `--assinado-em` é obrigatória — omiti-la falha com exit 64
 * ("Flag obrigatória ausente: --assinado-em"), não cria Pendente → CA1 RED.
 */

import { describe, it, after } from 'node:test';
import { strict as assert } from 'node:assert';

import { runCli } from './helpers/run-cli.ts';
import { newStateFile, removeStateFile } from './helpers/temp-state.ts';
import { extractUuidAfter } from './helpers/extract.ts';

const criarPendente = (statePath: string, numero = '700/2026') =>
  runCli([
    'criar-contrato',
    '--state',
    statePath,
    '--numero',
    numero,
    '--titulo',
    'Contrato Pendente E2E',
    '--objetivo',
    'Aguardando assinatura',
    '--valor-centavos',
    '10000000',
    '--inicio',
    '2026-02-01',
    '--fim',
    '2026-12-31',
    '--contratado-tipo',
    'supplier',
    '--contratado-id',
    '55555555-5555-4555-8555-555555555555',
    // SEM --assinado-em → caminho Pending
  ]);

describe('CLI E2E — criar-contrato caminho Pendente (CTR-CLI-CRIAR-CONTRATO-PENDING)', () => {
  const state = newStateFile();
  after(() => {
    removeStateFile(state);
  });

  it('CA1: sem --assinado-em → cria contrato Pendente (exit 0), status Pendente', () => {
    const r = criarPendente(state);
    assert.equal(r.exitCode, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /✅ Contrato criado\./);
    assert.match(r.stdout, /Pendente/, 'saída deve indicar status Pendente');
    const id = extractUuidAfter(r.stdout, 'ID:');
    assert.ok(id !== null, 'deve imprimir o ID do contrato Pendente');
  });

  it('CA1b: contrato Pendente não exibe valor/vigência vigente', () => {
    const r = criarPendente(state, '701/2026');
    assert.equal(r.exitCode, 0, `stderr: ${r.stderr}`);
    assert.doesNotMatch(r.stdout, /Valor vigente/, 'Pendente não tem valor vigente');
  });
});
