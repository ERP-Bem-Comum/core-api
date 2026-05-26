import { describe, it, after } from 'node:test';
import { strict as assert } from 'node:assert';

import { runCli } from './helpers/run-cli.ts';
import { newStateFile, removeStateFile } from './helpers/temp-state.ts';
import { extractUuidAfter } from './helpers/extract.ts';

// W0 RED — CTR-USECASE-END-CONTRACT (UC-07): comando `encerrar-contrato`.
// Sintaxe: encerrar-contrato --state <path> --contrato <uuid> --motivo <expiracao|distrato>

const requireUuid = (text: string, label: string, ctx: string): string => {
  const id = extractUuidAfter(text, label);
  assert.ok(id !== null, `${ctx}: UUID após "${label}" não encontrado`);
  return id;
};

const criarContrato = (
  statePath: string,
  overrides: { numero?: string; inicio?: string; fim?: string } = {},
) =>
  runCli([
    'criar-contrato',
    '--state',
    statePath,
    '--numero',
    overrides.numero ?? '700/2026',
    '--titulo',
    'Contrato E2E encerramento',
    '--objetivo',
    'Validar UC-07',
    '--assinado-em',
    '2026-01-01',
    '--valor-centavos',
    '10000000',
    '--inicio',
    overrides.inicio ?? '2026-02-01',
    '--fim',
    overrides.fim ?? '2026-12-31',
  ]);

describe('CLI E2E — encerrar-contrato (UC-07)', () => {
  const state = newStateFile();
  after(() => {
    removeStateFile(state);
  });

  it('CA-7: distrato → exit 0 e status Distratado', () => {
    const created = criarContrato(state, { numero: '700/2026' });
    assert.equal(created.exitCode, 0, `criar-contrato falhou: ${created.stderr}`);
    const id = requireUuid(created.stdout, 'ID:', 'criar-contrato');

    const r = runCli([
      'encerrar-contrato',
      '--state',
      state,
      '--contrato',
      id,
      '--motivo',
      'distrato',
    ]);
    assert.equal(r.exitCode, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /Distratado/);
  });

  it('expiracao antes da data fim → exit 1 com mensagem de regra', () => {
    const fresh = newStateFile();
    try {
      const created = criarContrato(fresh, { numero: '701/2026', fim: '2099-12-31' });
      assert.equal(created.exitCode, 0, `criar-contrato falhou: ${created.stderr}`);
      const id = requireUuid(created.stdout, 'ID:', 'criar-contrato');

      const r = runCli([
        'encerrar-contrato',
        '--state',
        fresh,
        '--contrato',
        id,
        '--motivo',
        'expiracao',
      ]);
      assert.equal(r.exitCode, 1, `esperava exit 1; stdout: ${r.stdout}`);
      assert.match(r.stderr, /ainda não pode expirar|data fim não chegou/i);
    } finally {
      removeStateFile(fresh);
    }
  });

  it('CA-8: --motivo inválido → exit 64', () => {
    const fresh = newStateFile();
    try {
      const created = criarContrato(fresh, { numero: '702/2026' });
      const id = requireUuid(created.stdout, 'ID:', 'criar-contrato');
      const r = runCli([
        'encerrar-contrato',
        '--state',
        fresh,
        '--contrato',
        id,
        '--motivo',
        'foobar',
      ]);
      assert.equal(r.exitCode, 64, `stdout: ${r.stdout} / stderr: ${r.stderr}`);
    } finally {
      removeStateFile(fresh);
    }
  });

  it('CA-8: --motivo ausente → exit 64', () => {
    const fresh = newStateFile();
    try {
      const created = criarContrato(fresh, { numero: '703/2026' });
      const id = requireUuid(created.stdout, 'ID:', 'criar-contrato');
      const r = runCli(['encerrar-contrato', '--state', fresh, '--contrato', id]);
      assert.equal(r.exitCode, 64, `stdout: ${r.stdout} / stderr: ${r.stderr}`);
    } finally {
      removeStateFile(fresh);
    }
  });

  it('contrato inexistente → exit 1 com "não encontrado"', () => {
    const fresh = newStateFile();
    try {
      const r = runCli([
        'encerrar-contrato',
        '--state',
        fresh,
        '--contrato',
        '7f3a1234-5678-4abc-9def-fedcba987654',
        '--motivo',
        'distrato',
      ]);
      assert.equal(r.exitCode, 1, `stdout: ${r.stdout} / stderr: ${r.stderr}`);
      assert.match(r.stderr, /não encontrado/i);
    } finally {
      removeStateFile(fresh);
    }
  });
});
