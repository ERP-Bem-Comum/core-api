/**
 * Testes E2E do entrypoint `src/modules/financial/cli/main.ts`.
 *
 * Ticket FIN-CLI-WIRE (W0 — RED).
 *
 * Cobre CA-3..CA-6 do `.claude/.pipeline/FIN-CLI-WIRE/000-request.md`:
 *  CA-3  `--help` → stdout, exit 0
 *  CA-4  vazio    → stderr, exit 64 (EX_USAGE)
 *  CA-5  subcomando desconhecido → stderr "Subcomando desconhecido: <x>", exit 64
 *  CA-6  `-h` (alias curto) → idêntico a `--help`
 *
 * CA-1 (script no package.json) e CA-2 (arquivo existe + não throw) são
 * validados indiretamente: o spawn falharia com ENOENT se main.ts não existisse.
 *
 * Estratégia: subprocess via `spawnSync` capturando stdout/stderr/exitCode.
 * Spawn direto do `node` (não `pnpm`) — referência D4 do helper `run-cli.ts`.
 *
 * Estado esperado em W0: RED — arquivo `src/modules/financial/cli/main.ts`
 * não existe; spawn retorna exit code não-zero por ENOENT do `node`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { runFinancialCli } from '../../../cli/helpers/run-financial-cli.ts';

describe('financial/cli main entrypoint', () => {
  it('CA-3: --help imprime ajuda em stdout e sai com exit 0', () => {
    const { stdout, stderr, exitCode } = runFinancialCli(['--help']);
    assert.equal(exitCode, 0, `exit code esperado 0, recebido ${exitCode}. stderr=${stderr}`);
    assert.ok(stdout.length > 0, 'stdout deveria conter mensagem de ajuda');
    assert.match(stdout, /Uso: financial-cli/i, 'stdout deveria começar com cabeçalho "Uso:"');
    // Atualizado por FIN-CLI-APROVAR-TITULO: REGISTRY agora tem ao menos um
    // subcomando real. CA-3 original esperava "nenhum ainda" (estado vazio).
    assert.match(stdout, /Subcomandos disponíveis/i, 'help lista a seção de subcomandos');
    assert.match(
      stdout,
      /aprovar-titulo/,
      'help deve listar pelo menos o subcomando "aprovar-titulo" (FIN-CLI-APROVAR-TITULO)',
    );
  });

  it('CA-6: -h (alias curto) comporta-se idêntico a --help', () => {
    const { stdout, exitCode } = runFinancialCli(['-h']);
    assert.equal(exitCode, 0);
    assert.match(stdout, /Uso: financial-cli/i);
  });

  it('CA-4: sem argumentos imprime uso em stderr e sai com exit 64 (EX_USAGE)', () => {
    const { stdout, stderr, exitCode } = runFinancialCli([]);
    assert.equal(exitCode, 64, `exit code esperado 64 (EX_USAGE), recebido ${exitCode}`);
    assert.equal(stdout, '', 'stdout deveria estar vazio quando uso é inválido');
    assert.ok(stderr.length > 0, 'stderr deveria conter mensagem de uso');
    assert.match(stderr, /Uso: financial-cli/i);
  });

  it('CA-5: subcomando desconhecido imprime erro em stderr e sai com exit 64', () => {
    const { stdout, stderr, exitCode } = runFinancialCli(['foo']);
    assert.equal(exitCode, 64);
    assert.equal(stdout, '');
    assert.match(
      stderr,
      /Subcomando desconhecido:\s*foo/,
      'stderr deveria reportar o subcomando desconhecido literalmente',
    );
    assert.match(stderr, /Uso: financial-cli/i, 'stderr deveria também imprimir o help');
  });
});

// ─── Scaffold tests (FIN-CLI-SCAFFOLD) ──────────────────────────────────────

describe('financial/cli scaffold — driver flags integration', () => {
  it('CA-NEW-1: --driver mysql exercita o caminho cli-driver-not-supported-yet (REGISTRY agora tem aprovar-titulo)', () => {
    // Atualizado por FIN-CLI-APROVAR-TITULO: com REGISTRY contendo aprovar-titulo,
    // o lookup do REGISTRY passa e o pipeline chega ao buildContext, que rejeita
    // `--driver mysql` com `cli-driver-not-supported-yet`. Mensagem deve citar
    // FIN-ADAPTER-DRIZZLE-PAYABLE (formatter atualizado em FIN-CLI-SCAFFOLD).
    const { stdout, stderr, exitCode } = runFinancialCli([
      '--driver',
      'mysql',
      'aprovar-titulo',
      '--payable-id',
      'a1b2c3d4-5678-4abc-9def-fedcba987654',
      '--approved-by',
      'a1b2c3d4-5678-4abc-9def-fedcba987654',
    ]);
    assert.equal(exitCode, 64, `exit code esperado 64, recebido ${exitCode}. stderr=${stderr}`);
    assert.equal(stdout, '');
    assert.match(
      stderr,
      /FIN-ADAPTER-DRIZZLE-PAYABLE|driver mysql ainda não está disponível/i,
      'stderr deve explicar que driver mysql será adicionado quando adapter Drizzle existir',
    );
  });

  it('CA-NEW-2: --driver memory --no-state com subcomando inexistente → stderr "Subcomando desconhecido"', () => {
    // Atualizado por FIN-CLI-APROVAR-TITULO: usa subcomando garantidamente
    // inexistente (`fake-cmd-xyz`) para validar o fallback do REGISTRY.
    // O comando `aprovar-titulo` agora existe e foi movido para testes
    // próprios em commands/aprovar-titulo.test.ts.
    const { stdout, stderr, exitCode } = runFinancialCli([
      '--driver',
      'memory',
      '--no-state',
      'fake-cmd-xyz',
    ]);
    assert.equal(exitCode, 64, `exit code esperado 64, recebido ${exitCode}. stderr=${stderr}`);
    assert.equal(stdout, '');
    assert.match(
      stderr,
      /Subcomando desconhecido:\s*fake-cmd-xyz/,
      'stderr deve reportar fallback de subcomando inexistente',
    );
    assert.doesNotMatch(
      stderr,
      /cli-driver-unknown|cli-driver-missing-value|cli-driver-flag-conflict/i,
      'parser de driver flags não deveria ter falhado',
    );
  });

  it('CA-NEW-3: --driver invalido foo → stderr exit 64 com cli-driver-unknown formatado', () => {
    const { stdout, stderr, exitCode } = runFinancialCli(['--driver', 'invalido', 'foo']);
    assert.equal(exitCode, 64, `exit code esperado 64, recebido ${exitCode}. stderr=${stderr}`);
    assert.equal(stdout, '');
    assert.match(
      stderr,
      /Driver desconhecido|cli-driver-unknown|memory.*mysql/i,
      'stderr deveria formatar cli-driver-unknown em PT-BR',
    );
  });
});
