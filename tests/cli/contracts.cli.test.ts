import { describe, it, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

import { runCli } from './helpers/run-cli.ts';
import { newStateFile, removeStateFile } from './helpers/temp-state.ts';
import { extractUuidAfter } from './helpers/extract.ts';

// Sintaxe da CLI: <subcomando> [flags incluindo --state].
// O main.ts faz `const [subcommand, ...subArgv] = rawArgv;` e só depois
// `extractStateFlag(subArgv)`, então `--state` precisa vir DEPOIS do subcomando.

const requireUuid = (text: string, label: string, ctx: string): string => {
  const id = extractUuidAfter(text, label);
  assert.ok(id !== null, `${ctx}: UUID após "${label}" não encontrado`);
  return id;
};

const criarContrato = (
  statePath: string,
  overrides: Partial<{
    numero: string;
    titulo: string;
    objetivo: string;
    assinadoEm: string;
    valorCentavos: string;
    inicio: string;
    fim: string | null;
  }> = {},
) => {
  const args = [
    'criar-contrato',
    '--state',
    statePath,
    '--numero',
    overrides.numero ?? '001/2026',
    '--titulo',
    overrides.titulo ?? 'Contrato de Teste E2E',
    '--objetivo',
    overrides.objetivo ?? 'Validar fluxo ponta-a-ponta',
    '--assinado-em',
    overrides.assinadoEm ?? '2026-01-15',
    '--valor-centavos',
    overrides.valorCentavos ?? '10000000',
    '--inicio',
    overrides.inicio ?? '2026-02-01',
    '--contratado-tipo',
    'supplier',
    '--contratado-id',
    '55555555-5555-4555-8555-555555555555',
  ];
  if (overrides.fim !== null && overrides.fim !== undefined) {
    args.push('--fim', overrides.fim);
  } else if (overrides.fim === undefined) {
    args.push('--fim', '2026-12-31');
  }
  return runCli(args);
};

describe('CLI E2E — BDD 1.1: Persistência e numeração', () => {
  const state = newStateFile();
  after(() => {
    removeStateFile(state);
  });

  it('cria contrato com saída esperada e exit 0', () => {
    const r = criarContrato(state);
    assert.equal(r.exitCode, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /✅ Contrato criado\./);
    assert.match(r.stdout, /Contrato 001\/2026/);
    assert.match(r.stdout, /Valor original: R\$\s*100\.000,00/);
    assert.match(r.stdout, /Valor vigente: R\$\s*100\.000,00/);
    requireUuid(r.stdout, 'ID:', 'criar-contrato');
  });

  it('persiste arquivo de estado parseável após criação', () => {
    assert.equal(existsSync(state), true);
    const raw = readFileSync(state, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    assert.equal(typeof parsed === 'object' && parsed !== null, true);
    if (typeof parsed === 'object' && parsed !== null) {
      const snap = parsed as { contracts?: unknown; amendments?: unknown };
      assert.equal(Array.isArray(snap.contracts), true);
      assert.equal(Array.isArray(snap.amendments), true);
    }
  });

  it('rejeita número duplicado no mesmo state (Defeito #5)', () => {
    const r = criarContrato(state, { numero: '001/2026', titulo: 'Outro contrato' });
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /já existe um contrato com este número sequencial/i);
  });

  it('rejeita formato sequencial inválido (Defeito #6)', () => {
    const fresh = newStateFile();
    try {
      const r = criarContrato(fresh, { numero: '1/26' });
      assert.equal(r.exitCode, 1);
      assert.match(r.stderr, /sequencial.*formato|formato.*sequencial|XXX\/AAAA/i);
    } finally {
      removeStateFile(fresh);
    }
  });
});

describe('CLI E2E — BDD 1.2: Motor de cálculo (Addition)', () => {
  const state = newStateFile();
  after(() => {
    removeStateFile(state);
  });

  it('roda criar→aditivo→anexar→homologar e valor vigente vira R$ 105.000,00', () => {
    const created = criarContrato(state, { numero: '042/2026' });
    assert.equal(created.exitCode, 0, `criar-contrato falhou: ${created.stderr}`);
    const contractId = requireUuid(created.stdout, 'ID:', 'criar-contrato');

    const amendment = runCli([
      'criar-aditivo',
      '--state',
      state,
      '--contrato',
      contractId,
      '--numero',
      'AD 01-042/2026',
      '--descricao',
      'Acréscimo de 5%',
      '--tipo',
      'Addition',
      '--valor-centavos',
      '500000',
    ]);
    assert.equal(amendment.exitCode, 0, `criar-aditivo falhou: ${amendment.stderr}`);
    const amendmentId = requireUuid(amendment.stdout, 'ID:', 'criar-aditivo');

    const docId = randomUUID();
    // CTR-AMENDMENT-DOCUMENT-LINK: documento precisa existir no repo antes do attach.
    const upload = runCli([
      'subir-documento',
      '--state',
      state,
      '--parent-id',
      amendmentId,
      '--parent-tipo',
      'Amendment',
      '--doc-id',
      docId,
    ]);
    assert.equal(upload.exitCode, 0, `subir-documento falhou: ${upload.stderr}`);

    const attach = runCli([
      'anexar-documento',
      '--state',
      state,
      '--aditivo',
      amendmentId,
      '--documento',
      docId,
    ]);
    assert.equal(attach.exitCode, 0, `anexar-documento falhou: ${attach.stderr}`);
    assert.match(attach.stdout, /Documento anexado: sim/);

    const userId = randomUUID();
    const homologated = runCli([
      'homologar-aditivo',
      '--state',
      state,
      '--aditivo',
      amendmentId,
      '--contrato',
      contractId,
      '--usuario',
      userId,
    ]);
    assert.equal(homologated.exitCode, 0, `homologar-aditivo falhou: ${homologated.stderr}`);
    assert.match(homologated.stdout, /Status: Homologado/);
    assert.match(homologated.stdout, /Valor vigente: R\$\s*105\.000,00/);
    assert.match(homologated.stdout, /Aditivos homologados: 1/);
  });
});

describe('CLI E2E — BDD 2.1: Bloquear homologação sem documento', () => {
  const state = newStateFile();
  after(() => {
    removeStateFile(state);
  });

  it('homologar-aditivo sem anexar documento → exit 1 com mensagem específica', () => {
    const created = criarContrato(state, { numero: '021/2026' });
    assert.equal(created.exitCode, 0);
    const contractId = requireUuid(created.stdout, 'ID:', 'criar-contrato');

    const amendment = runCli([
      'criar-aditivo',
      '--state',
      state,
      '--contrato',
      contractId,
      '--numero',
      'AD 01-021/2026',
      '--descricao',
      'Aditivo sem doc',
      '--tipo',
      'Misc',
    ]);
    assert.equal(amendment.exitCode, 0);
    const amendmentId = requireUuid(amendment.stdout, 'ID:', 'criar-aditivo');

    const homologated = runCli([
      'homologar-aditivo',
      '--state',
      state,
      '--aditivo',
      amendmentId,
      '--contrato',
      contractId,
      '--usuario',
      randomUUID(),
    ]);
    assert.equal(homologated.exitCode, 1);
    assert.match(
      homologated.stderr,
      /Aditivo precisa ter documento assinado anexado para ser homologado\./,
    );
  });
});

describe('CLI E2E — BDD 2.2: Validação de magnitude (Suppression)', () => {
  const state = newStateFile();
  let contractId = '';
  after(() => {
    removeStateFile(state);
  });

  it('setup — cria contrato base', () => {
    const created = criarContrato(state, { numero: '022/2026' });
    assert.equal(created.exitCode, 0);
    contractId = requireUuid(created.stdout, 'ID:', 'setup');
  });

  it('Suppression com magnitude positiva (500.000) → exit 0', () => {
    const r = runCli([
      'criar-aditivo',
      '--state',
      state,
      '--contrato',
      contractId,
      '--numero',
      'AD 01-022/2026',
      '--descricao',
      'Supressão válida',
      '--tipo',
      'Suppression',
      '--valor-centavos',
      '500000',
    ]);
    assert.equal(r.exitCode, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /Tipo: Supressão/);
  });

  it('Suppression com valor negativo → exit 1 e money-negative-value', () => {
    const r = runCli([
      'criar-aditivo',
      '--state',
      state,
      '--contrato',
      contractId,
      '--numero',
      'AD 02-022/2026',
      '--descricao',
      'Magnitude negativa',
      '--tipo',
      'Suppression',
      '--valor-centavos',
      '-500000',
    ]);
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /Valor monetário não pode ser negativo|money-negative-value/);
  });

  it('Suppression com valor zero → exit 1 e amendment-impact-value-zero', () => {
    const r = runCli([
      'criar-aditivo',
      '--state',
      state,
      '--contrato',
      contractId,
      '--numero',
      'AD 03-022/2026',
      '--descricao',
      'Valor zero',
      '--tipo',
      'Suppression',
      '--valor-centavos',
      '0',
    ]);
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /Valor de impacto não pode ser zero|amendment-impact-value-zero/);
  });
});

describe('CLI E2E — side-effects de --state / --no-state', () => {
  it('--no-state roda criar-contrato sem persistir estado', () => {
    const r = runCli([
      'criar-contrato',
      '--no-state',
      '--numero',
      '999/2026',
      '--titulo',
      'Efêmero',
      '--objetivo',
      'Sem persistência',
      '--assinado-em',
      '2026-01-01',
      '--valor-centavos',
      '100000',
      '--inicio',
      '2026-01-01',
      '--contratado-tipo',
      'supplier',
      '--contratado-id',
      '55555555-5555-4555-8555-555555555555',
    ]);
    assert.equal(r.exitCode, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /✅ Contrato criado\./);
  });

  it('listar-contratos em state vazio → "Nenhum contrato cadastrado." e exit 0', () => {
    const empty = newStateFile();
    try {
      const r = runCli(['listar-contratos', '--state', empty]);
      assert.equal(r.exitCode, 0, `stderr: ${r.stderr}`);
      assert.match(r.stdout, /Nenhum contrato cadastrado\./);
    } finally {
      removeStateFile(empty);
    }
  });
});

describe('CLI E2E — help / usage', () => {
  // REGR #8 (2026-05-15): `--help` intencional vai para stdout (não stderr)
  // para suportar `cli --help | less` no padrão GNU/POSIX.
  it('--help lista os 6 subcomandos e retorna exit 0', () => {
    const r = runCli(['--help']);
    assert.equal(r.exitCode, 0);
    for (const cmd of [
      'criar-contrato',
      'listar-contratos',
      'mostrar-contrato',
      'criar-aditivo',
      'anexar-documento',
      'homologar-aditivo',
    ]) {
      assert.match(r.stdout, new RegExp(cmd));
    }
  });

  it('sem argumentos → exit 64 (EX_USAGE)', () => {
    const r = runCli([]);
    assert.equal(r.exitCode, 64);
  });

  it('subcomando inexistente → exit 64 com mensagem', () => {
    const r = runCli(['comando-que-nao-existe']);
    assert.equal(r.exitCode, 64);
    assert.match(r.stderr, /Subcomando desconhecido/);
  });
});

describe('CLI E2E — Defeito #12 (state file corrompido)', () => {
  it('state file com JSON inválido → exit 74 (EX_IOERR)', () => {
    const corrupt = newStateFile();
    try {
      writeFileSync(corrupt, '{ not valid json', 'utf-8');
      const r = runCli(['listar-contratos', '--state', corrupt]);
      assert.equal(r.exitCode, 74);
      assert.match(r.stderr, /❌/);
    } finally {
      removeStateFile(corrupt);
    }
  });
});
