// =============================================================================
// Testes RED de regressão — derivados dos relatórios:
//   - tests/reports/REVIEW.md             (Gemini, 2026-05-14)
//   - tests/reports/E2E-SECURITY-REVIEW.md (Claude security-reviewer, 2026-05-15)
//
// Fundamentação (skill tdd-strategist, modo strict, livro canônico Kent Beck):
//
// > "Qual é a primeira coisa que você faz quando um defeito é informado? Escreva
// > o menor teste possível que falhe e que, uma vez rodado, será reparado.
// >
// > Testes de regressão são testes que, com perfeito conhecimento prévio, você
// > teria escrito quando estava codificando originalmente. Cada vez que você tem
// > que escrever um teste de regressão, pense em como poderia saber, em primeiro
// > lugar, escrever o teste."
// >   — (Linha 4241–4243, p. 157–158, Kent Beck, *TDD: Test-Driven Development*)
//
// Também aplica o padrão "Lista de Testes":
//
// > "O que você deveria testar? Antes de começar, escreva uma lista de todos os
// > testes que sabe que terá que escrever. (...) Aplicado ao desenvolvimento
// > dirigido por testes, o que pusemos na lista são os testes que queremos
// > implementar. Primeiro, coloque na lista exemplos de cada operação que você
// > sabe que precisa implementar."
// >   — (Linha 3958–3968, p. 146–147, Kent Beck, *TDD: Test-Driven Development*)
//
// Test list (1:1 com as Issues dos reports):
//   #1  loadState rejeita state com status fora do enum / UUID inválido / cents<0
//   #2  CLI contra state tampered sai com Result (EX_IOERR=74), nunca via throw
//   #3  Dois CLIs concorrentes preservam ambos os contratos (ou falham explícito)
//   #4  Título com ANSI escape é sanitizado na renderização
//   #5  sqlite-driver com --db inválido NÃO vaza "[sqlite-driver:open] ..." em stderr
//   #6  Flags globais antes do subcomando funcionam ou rejeitam com msg específica
//   #7  Aditivo Suppression com valor > currentValue.cents falha na criação
//   #8  contratos-cli --help (intencional) escreve em stdout
//   #9  Flag duplicada (--numero X --numero Y) avisa/rejeita; não sobrescreve em silêncio
//   #10 Flag desconhecida (--xyz) rejeita com EXIT=64; não cai em rest
//
// Todos os testes esperam o COMPORTAMENTO CORRIGIDO. Hoje (estado RED) eles falham.
// =============================================================================

import { describe, it, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { writeFileSync, mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { isErr } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryAmendmentRepository } from '#src/modules/contracts/adapters/persistence/repos/amendment-repository.in-memory.ts';
import { InMemoryDocumentRepository } from '#src/modules/contracts/adapters/persistence/repos/document-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import { createContract } from '#src/modules/contracts/application/use-cases/create-contract.ts';
import { createAmendment } from '#src/modules/contracts/application/use-cases/create-amendment.ts';
import { loadState } from '#src/modules/contracts/cli/state.ts';

import { runCli } from '../cli/helpers/run-cli.ts';
import { newStateFile, removeStateFile } from '../cli/helpers/temp-state.ts';

// =============================================================================
// SETUP COMUM
// =============================================================================

const tempDir = mkdtempSync(join(tmpdir(), 'regr-reports-'));
after(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

const writeTampered = (path: string, body: unknown): void => {
  writeFileSync(path, JSON.stringify(body), 'utf-8');
};

// Réplica do payload usado em E2E case 76 — state-tamper.json.
const TAMPERED_SNAPSHOT = {
  contracts: [
    {
      id: 'fake-id-not-uuid',
      sequentialNumber: 'INJ/2026',
      title: 'Tampered',
      objective: 'x',
      signedAt: '2026-01-15T00:00:00.000Z',
      originalValue: { cents: -1000 },
      originalPeriod: {
        kind: 'Fixed',
        start: '2026-02-01T00:00:00.000Z',
        end: '2026-12-31T00:00:00.000Z',
      },
      currentValue: { cents: -1000 },
      currentPeriod: {
        kind: 'Fixed',
        start: '2026-02-01T00:00:00.000Z',
        end: '2026-12-31T00:00:00.000Z',
      },
      status: 'PWNED',
      homologatedAmendmentIds: [],
      endedAt: null,
      extraField: 'should-not-load',
    },
  ],
  amendments: [],
};

// =============================================================================
// ISSUE #1 — loadState carrega entidades sem revalidar via smart constructor
//   Report: tests/reports/E2E-SECURITY-REVIEW.md §"Issue #1"
//   Arquivo afetado: src/modules/contracts/cli/state.ts:39-43, 74-79
//   Erro esperado (após fix): novo código 'state-entity-invalid'.
// =============================================================================

describe('REGR #1 — loadState rejeita state tampered (smart constructor na borda)', () => {
  it('retorna Err state-entity-invalid quando contract.status está fora do enum', () => {
    const path = join(tempDir, 'tampered-status.json');
    writeTampered(path, TAMPERED_SNAPSHOT);

    const contractRepo = InMemoryContractRepository();
    const amendmentRepo = InMemoryAmendmentRepository();
    const documentRepo = InMemoryDocumentRepository();

    const r = loadState(path, contractRepo, amendmentRepo, documentRepo);

    assert.equal(isErr(r), true, 'loadState deve falhar com state tampered');
    if (!r.ok) {
      assert.equal(
        r.error,
        'state-entity-invalid',
        'erro deve ser state-entity-invalid (novo código a ser adicionado em StateError)',
      );
    }
    assert.equal(
      contractRepo.store().length,
      0,
      'nenhum contrato deve ser injetado no repo quando o snapshot é inválido',
    );
  });

  it('retorna Err state-entity-invalid quando id não é UUID v4', () => {
    const path = join(tempDir, 'tampered-uuid.json');
    writeTampered(path, {
      contracts: [{ ...TAMPERED_SNAPSHOT.contracts[0], status: 'Active' }],
      amendments: [],
    });

    const contractRepo = InMemoryContractRepository();
    const amendmentRepo = InMemoryAmendmentRepository();
    const documentRepo = InMemoryDocumentRepository();
    const r = loadState(path, contractRepo, amendmentRepo, documentRepo);

    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'state-entity-invalid');
  });

  it('retorna Err state-entity-invalid quando originalValue.cents é negativo', () => {
    const path = join(tempDir, 'tampered-cents.json');
    writeTampered(path, {
      contracts: [
        {
          ...TAMPERED_SNAPSHOT.contracts[0],
          id: 'a06f4299-eda4-4a29-a0d2-6b0b93b64c83',
          status: 'Active',
          // originalValue.cents: -1000 permanece — único campo inválido aqui.
        },
      ],
      amendments: [],
    });

    const contractRepo = InMemoryContractRepository();
    const amendmentRepo = InMemoryAmendmentRepository();
    const documentRepo = InMemoryDocumentRepository();
    const r = loadState(path, contractRepo, amendmentRepo, documentRepo);

    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'state-entity-invalid');
  });
});

// =============================================================================
// ISSUE #2 — `throw new Error("unreachable: …")` é alcançável e quebra "Zero throw"
//   Report: tests/reports/E2E-SECURITY-REVIEW.md §"Issue #2"
//   Report: tests/reports/REVIEW.md §"Issue 1 — Quebra da regra 'Zero throw'"
//   Arquivos afetados:
//     - src/modules/contracts/cli/main.ts:50
//     - src/modules/contracts/cli/commands/criar-aditivo.ts:64
//     - src/modules/contracts/domain/contract/contract.ts:145
//     - src/modules/contracts/domain/amendment/amendment.ts:60, 167
//     - src/modules/contracts/application/use-cases/create-amendment.ts:74
// =============================================================================

describe('REGR #2 — state tampered não dispara throw "unreachable" (regra Zero throw)', () => {
  it('listar-contratos contra state tampered sai com EX_IOERR=74 e mensagem traduzida', () => {
    const path = join(tempDir, 'unreachable.json');
    writeTampered(path, TAMPERED_SNAPSHOT);

    const r = runCli(['listar-contratos', '--state', path]);

    // Hoje: EXIT=1 com '❌ Erro inesperado: Error: unreachable: "PWNED"'.
    // Esperado pós-fix: EX_IOERR=74 (Result mapped em main.ts:90).
    assert.equal(r.exitCode, 74, `exit esperado=74 (EX_IOERR), recebido=${r.exitCode}`);

    // Nenhum vazamento da string interna do throw em stderr.
    assert.doesNotMatch(
      r.stderr,
      /unreachable/i,
      'stderr não pode revelar a string "unreachable" (vazamento interno)',
    );
    assert.doesNotMatch(
      r.stderr,
      /Erro inesperado/i,
      'stderr não pode ter o handler de fallback de exceção',
    );
    assert.doesNotMatch(r.stderr, /PWNED/, 'stderr não pode ecoar o status tampered');

    // O fluxo correto imprime SÓ a mensagem traduzida via formatErrorCode.
    assert.match(r.stderr, /❌/, 'mensagem de erro traduzida (prefix ❌) deve estar presente');
  });

  it('listar-contratos contra state tampered NÃO imprime "1 contrato(s):" antes do erro', () => {
    // Hoje, antes do crash, sai "1 contrato(s):" e SÓ DEPOIS o throw — saída
    // corrompida em pipeline. Pós-fix, nada deve ir para stdout porque o
    // erro acontece em loadState (antes de qualquer formatter).
    const path = join(tempDir, 'no-partial-output.json');
    writeTampered(path, TAMPERED_SNAPSHOT);

    const r = runCli(['listar-contratos', '--state', path]);

    assert.equal(
      r.stdout.trim(),
      '',
      'stdout deve estar vazio quando state tampered impede a carga',
    );
  });
});

// =============================================================================
// ISSUE #3 — Race condition em saveState (perda silenciosa)
//   Report: tests/reports/E2E-SECURITY-REVIEW.md §"Issue #3"
//   Evidência: tests/reports/e2e-scratch/state-cc.json (apenas "602/2026" persistiu)
//   Arquivo afetado: src/modules/contracts/cli/state.ts:83-98
// =============================================================================

const CLI_ENTRY = fileURLToPath(
  new URL('../../src/modules/contracts/cli/main.ts', import.meta.url),
);
const CWD = resolve(fileURLToPath(new URL('../../', import.meta.url)));

const runCliAsync = async (
  args: readonly string[],
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> =>
  new Promise((resolvePromise) => {
    const child = spawn(
      'node',
      ['--experimental-strip-types', '--no-warnings', CLI_ENTRY, ...args],
      { cwd: CWD, env: { ...process.env, NODE_NO_WARNINGS: '1' } },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf-8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8');
    });
    child.on('close', (code) => {
      resolvePromise({ exitCode: code ?? -1, stdout, stderr });
    });
  });

describe('REGR #3 — saveState concorrente preserva ambos contratos OU falha explícito', () => {
  it('dois processos gravando o mesmo --state em paralelo não perdem dados', async () => {
    const statePath = newStateFile();
    after(() => {
      removeStateFile(statePath);
    });

    const baseArgs = (numero: string, titulo: string): readonly string[] => [
      'criar-contrato',
      '--state',
      statePath,
      '--numero',
      numero,
      '--titulo',
      titulo,
      '--objetivo',
      'concorrencia',
      '--assinado-em',
      '2026-01-15',
      '--valor-centavos',
      '1000',
      '--inicio',
      '2026-02-01',
      '--contratado-tipo',
      'supplier',
      '--contratado-id',
      '55555555-5555-4555-8555-555555555555',
      '--sem-fim',
    ];

    const [r1, r2] = await Promise.all([
      runCliAsync(baseArgs('700/2026', 'P1')),
      runCliAsync(baseArgs('701/2026', 'P2')),
    ]);

    // Aceita 3 finais válidos:
    //   (a) ambos sucesso E ambos persistidos (atomic write/lock funcionando), OU
    //   (b) um sucesso + um erro explícito (ex: state-stale-concurrent-write).
    // O que NÃO se aceita: ambos exit=0 com state contendo apenas 1 contrato (caso atual).
    const numerosNoState = (() => {
      if (!existsSync(statePath)) return [];
      const raw = readFileSync(statePath, 'utf-8');
      const snap = JSON.parse(raw) as {
        contracts: readonly { sequentialNumber: string }[];
      };
      return snap.contracts.map((c) => c.sequentialNumber).sort();
    })();

    const ambosOk = r1.exitCode === 0 && r2.exitCode === 0;
    const umFalhouExplicito =
      (r1.exitCode === 0 && r2.exitCode !== 0 && /concurrent|stale|lock/i.test(r2.stderr)) ||
      (r2.exitCode === 0 && r1.exitCode !== 0 && /concurrent|stale|lock/i.test(r1.stderr));

    if (ambosOk) {
      assert.deepEqual(
        numerosNoState,
        ['700/2026', '701/2026'],
        `ambos exit=0 mas state perdeu um contrato — encontrado: ${JSON.stringify(numerosNoState)}`,
      );
    } else {
      assert.ok(
        umFalhouExplicito,
        `quando concorrência conflita, um lado deve falhar explícito.\n` +
          `r1=${r1.exitCode} stderr=${r1.stderr}\nr2=${r2.exitCode} stderr=${r2.stderr}`,
      );
      assert.equal(numerosNoState.length, 1, 'um dos contratos deve estar persistido');
    }
  });
});

// =============================================================================
// ISSUE #4 — ANSI escape / terminal hijacking via campos texto
//   Report: tests/reports/E2E-SECURITY-REVIEW.md §"Issue #4"
//   Arquivo afetado: src/modules/contracts/cli/formatters/contract.ts:7-23
// =============================================================================

describe('REGR #4 — formatter sanitiza chars de controle no título', () => {
  it('título com \\r\\x1b[31m não aparece verbatim na saída do mostrar-contrato', () => {
    const statePath = newStateFile();
    after(() => {
      removeStateFile(statePath);
    });

    // \r reposiciona o cursor; \x1b[31m liga vermelho. Em terminal real,
    // sobrescreve linhas e mascara mensagens. Saída deve ser escapada/strippada.
    const titulo = 'inicio\rDEPOIS\x1b[31mRED';

    const create = runCli([
      'criar-contrato',
      '--state',
      statePath,
      '--numero',
      '900/2026',
      '--titulo',
      titulo,
      '--objetivo',
      'sanitizacao',
      '--assinado-em',
      '2026-01-15',
      '--valor-centavos',
      '1000',
      '--inicio',
      '2026-02-01',
      '--contratado-tipo',
      'supplier',
      '--contratado-id',
      '55555555-5555-4555-8555-555555555555',
      '--sem-fim',
    ]);
    assert.equal(create.exitCode, 0, `criar-contrato falhou: ${create.stderr}`);

    const list = runCli(['listar-contratos', '--state', statePath]);
    assert.equal(list.exitCode, 0);

    // Pós-fix: nenhum char de controle (exceto \n) deve sair em stdout.
    /* eslint-disable no-control-regex */
    assert.doesNotMatch(
      list.stdout,
      /\x1b\[/,
      'stdout não pode conter sequência CSI (\\x1b[) — atacante injeta cor/cursor',
    );
    /* eslint-enable no-control-regex */
    assert.doesNotMatch(
      list.stdout,
      /\r/,
      'stdout não pode conter \\r — atacante sobrescreve linhas anteriores',
    );
  });
});

// =============================================================================
// ISSUE #5 — DELETADO em CTR-CLEANUP-SQLITE (#5).
//   Testava o `sqlite-driver` (vazamento de mensagens nativas em stderr).
//   SQLite foi removido como driver — bloco inteiro removido.
//   Histórico em tests/reports/E2E-SECURITY-REVIEW.md §"Issue #5".
// =============================================================================

// =============================================================================
// ISSUE #6 — Parser exige subcomando em argv[0]; --driver antes vira "subcomando desconhecido"
//   Report: tests/reports/E2E-SECURITY-REVIEW.md §"Issue #6"
//   Arquivo afetado: src/modules/contracts/cli/main.ts:63-74
// =============================================================================

describe('REGR #6 — ordem de --driver vs subcomando', () => {
  it('contratos-cli --driver memory listar-contratos funciona OU rejeita com msg explícita', () => {
    // CTR-CLEANUP-SQLITE (#5): SQLite removido — exercita o mesmo flow com `--driver memory`.
    const r = runCli(['--driver', 'memory', '--no-state', 'listar-contratos']);

    // Caminho A (preferido): parser reordena e roda normalmente, exit=0.
    // Caminho B (aceitável): rejeita com EXIT=64 e mensagem ESPECÍFICA explicando
    //   que flags globais devem vir depois do subcomando.
    // O que NÃO se aceita: mensagem "Subcomando desconhecido: --driver" (atual).
    if (r.exitCode === 0) {
      assert.match(r.stdout, /contrato/i);
    } else {
      assert.equal(r.exitCode, 64, `EXIT esperado=64, recebido=${r.exitCode}`);
      assert.doesNotMatch(
        r.stderr,
        /Subcomando desconhecido: --driver/,
        'mensagem "Subcomando desconhecido: --driver" confunde — deve indicar ordem das flags',
      );
      assert.match(
        r.stderr,
        /(ordem|antes do subcomando|posiç|flag global)/i,
        'stderr deve explicar que flags globais devem vir depois do subcomando',
      );
    }
  });
});

// =============================================================================
// ISSUE #7 — Aditivo Suppression aceito mesmo excedendo valor vigente
//   Report: tests/reports/E2E-SECURITY-REVIEW.md §"Issue #7"
//   Arquivo afetado: src/modules/contracts/application/use-cases/create-amendment.ts
// =============================================================================

describe('REGR #7 — createAmendment rejeita Suppression que excede currentValue', () => {
  it('Suppression com impactValueCents > contract.currentValue.cents falha na CRIAÇÃO', async () => {
    const outbox = InMemoryOutbox();
    const contractRepo = InMemoryContractRepository(outbox.port);
    const amendmentRepo = InMemoryAmendmentRepository(outbox.port);
    const clock = ClockFixed(new Date('2026-03-01'));

    const created = await createContract({
      contractRepo: contractRepo.repo,
      clock,
    })({
      sequentialNumber: '001/2026',
      title: 'X',
      objective: 'O',
      signedAt: '2026-01-01',
      originalValueCents: 100_000, // R$ 1.000,00
      originalPeriodStart: '2026-01-01',
      originalPeriodEnd: '2026-12-31',
      contractorType: 'supplier',
      contractorId: '55555555-5555-4555-8555-555555555555',
    });
    if (!created.ok) throw new Error(`fixture broken: ${JSON.stringify(created.error)}`);

    // Limpa o outbox após setup do contrato (isola eventos do teste)
    outbox.clear();

    const r = await createAmendment({
      contractRepo: contractRepo.repo,
      amendmentRepo: amendmentRepo.repo,
      clock,
    })({
      contractId: created.value.contract.id as unknown as string,
      amendmentNumber: 'AD-SUP-001',
      description: 'Supressão absurda',
      kind: 'Suppression',
      // 9_999_999_999_999 centavos >>> 100_000 centavos do contrato.
      impactValueCents: 9_999_999_999_999,
    });

    assert.equal(isErr(r), true, 'Suppression que excede valor deve falhar na CRIAÇÃO');
    if (!r.ok) {
      assert.equal(
        r.error,
        'amendment-suppression-exceeds-current-value',
        'erro deve ser amendment-suppression-exceeds-current-value (novo código a ser adicionado)',
      );
    }
    assert.equal(
      amendmentRepo.store().length,
      0,
      'nenhum aditivo deve ser persistido quando excede valor',
    );
    assert.equal(
      outbox.all().length,
      0,
      'nenhum evento AmendmentCreated deve ser publicado no outbox',
    );
  });
});

// =============================================================================
// ISSUE #8 — --help escreve em stderr
//   Report: tests/reports/E2E-SECURITY-REVIEW.md §"Issue #8"
//   Arquivo afetado: src/modules/contracts/cli/main.ts:7-25, 58-61
// =============================================================================

describe('REGR #8 — --help explícito escreve em stdout (convenção GNU/POSIX)', () => {
  it('contratos-cli --help: exit=0 e usage vai para stdout, não stderr', () => {
    const r = runCli(['--help']);

    assert.equal(r.exitCode, 0, 'exit=0 quando --help é solicitado explicitamente');
    assert.match(
      r.stdout,
      /contratos-cli/,
      'usage deve estar em stdout para suportar `cli --help | less`',
    );
    assert.equal(
      r.stderr,
      '',
      'stderr deve estar vazio quando --help é solicitado intencionalmente',
    );
  });

  it('contratos-cli (sem args): usage vai para stderr e EXIT=64 (uso inválido)', () => {
    const r = runCli([]);

    assert.equal(r.exitCode, 64, 'sem args = uso inválido = EX_USAGE');
    assert.match(r.stderr, /contratos-cli/, 'usage para stderr quando inválido');
  });
});

// =============================================================================
// ISSUE #9 — Flag duplicada silenciosamente sobrescrita
//   Report: tests/reports/E2E-SECURITY-REVIEW.md §"Issue #9"
//   Arquivo afetado: src/modules/contracts/cli/parse-flags.ts:6-26
// =============================================================================

describe('REGR #9 — flag duplicada não é aceita silenciosamente', () => {
  it('--numero 300/2026 --numero 999/2026: rejeita com EXIT=64 OU avisa em stderr', () => {
    const statePath = newStateFile();
    after(() => {
      removeStateFile(statePath);
    });

    const r = runCli([
      'criar-contrato',
      '--state',
      statePath,
      '--numero',
      '300/2026',
      '--numero',
      '999/2026', // duplicada
      '--titulo',
      'Dup',
      '--objetivo',
      'detecta duplicata',
      '--assinado-em',
      '2026-01-15',
      '--valor-centavos',
      '1000',
      '--inicio',
      '2026-02-01',
      '--contratado-tipo',
      'supplier',
      '--contratado-id',
      '55555555-5555-4555-8555-555555555555',
      '--sem-fim',
    ]);

    // Caminho A: rejeita.
    // Caminho B: aceita, mas emite warning em stderr.
    // O que NÃO se aceita: silêncio total (exit=0, stderr vazio).
    if (r.exitCode === 0) {
      assert.match(
        r.stderr,
        /(duplicad|repetida|--numero)/i,
        'flag duplicada deve gerar warning em stderr',
      );
    } else {
      assert.equal(r.exitCode, 64, `EXIT esperado=64, recebido=${r.exitCode}`);
      assert.match(r.stderr, /duplicad|repetida/i);
    }
  });
});

// =============================================================================
// ISSUE #10 — Flag desconhecida cai em `rest` silenciosamente
//   Report: tests/reports/E2E-SECURITY-REVIEW.md §"Issue #10"
//   Arquivo afetado: src/modules/contracts/cli/parse-driver-flags.ts:87
// =============================================================================

describe('REGR #10 — flag desconhecida é detectada (não cai silenciosa em rest)', () => {
  it('listar-contratos --xyz=1 rejeita com EXIT=64 e mensagem clara', () => {
    const r = runCli(['listar-contratos', '--xyz=1', '--no-state']);

    // Pós-fix: EXIT=64 com mensagem identificando a flag.
    assert.equal(r.exitCode, 64, `EXIT esperado=64, recebido=${r.exitCode}`);
    assert.match(r.stderr, /--xyz/, 'stderr deve nomear a flag desconhecida');
    assert.match(
      r.stderr,
      /(desconhecid|unknown|inválid)/i,
      'stderr deve explicar que a flag é desconhecida',
    );
  });

  it('typo de --no-state (--no-stat) não cria arquivo default cli-state.json', () => {
    // Atacante / typo: --no-stat (em vez de --no-state). Hoje, vira rest e o
    // driver aplica DEFAULT_MEMORY_STATE_PATH = ./cli-state.json. Operador
    // achou que estava efêmero, mas deixou state no FS.
    const r = runCli(['listar-contratos', '--no-stat']);

    assert.equal(r.exitCode, 64, 'typo de flag deve falhar, não silenciar');
    assert.match(r.stderr, /--no-stat/);
  });
});
