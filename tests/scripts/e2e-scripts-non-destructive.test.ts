// Os smokes de e2e não podem destruir o ambiente de dev de quem os roda (#517).
//
// Duas naturezas de verificação, e as duas são necessárias:
//
//   1. ESTRUTURAL — nenhum script volta a chamar `docker compose` sem projeto isolado nem a apagar
//      secrets sem backup. É o que impede a regressão de voltar por cópia, que foi exatamente como
//      ela nasceu: a #500 corrigiu o runner de integração e os quatro `.sh` ficaram para trás.
//   2. FUNCIONAL — o backup/restore realmente devolve o que existia e remove o que não existia.
//      Roda o shell de verdade, sem Docker: o que se prova aqui é o contrato dos secrets.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';

const E2E_DIR = 'scripts/e2e';
const HELPER = '_e2e-env.sh';

const scriptsUnderTest = (): readonly string[] =>
  readdirSync(E2E_DIR)
    .filter((f) => f.endsWith('.sh') && f !== HELPER)
    .map((f) => join(E2E_DIR, f));

describe('scripts de e2e — não destroem o ambiente de dev (#517)', () => {
  // Guarda contra verde por vacuidade: se o glob esvaziar, os testes abaixo passariam sem verificar
  // nada. Asserta a PROPRIEDADE "há scripts a verificar", não a contagem — que muda legitimamente.
  it('há scripts de e2e a verificar', () => {
    assert.ok(scriptsUnderTest().length > 0, 'nenhum script encontrado em scripts/e2e/');
  });

  it('nenhum script invoca `docker compose` diretamente — todos passam pelo projeto isolado', () => {
    for (const path of scriptsUnderTest()) {
      const body = readFileSync(path, 'utf8');
      assert.equal(
        /^\s*docker\s+compose\b/m.test(body),
        false,
        `${path} chama 'docker compose' direto; use e2e_compose (projeto core-api-test)`,
      );
    }
  });

  it('nenhum script apaga secrets sem passar pelo backup', () => {
    for (const path of scriptsUnderTest()) {
      const body = readFileSync(path, 'utf8');
      assert.equal(
        /rm\s+-f\s+secrets\//.test(body),
        false,
        `${path} apaga secrets/ direto; use e2e_setup/e2e_teardown, que restauram os do dev`,
      );
    }
  });

  it('todo script carrega o helper — a lógica vive num lugar só', () => {
    for (const path of scriptsUnderTest()) {
      const body = readFileSync(path, 'utf8');
      assert.ok(body.includes(HELPER), `${path} não faz source de ${HELPER}`);
    }
  });

  // Paridade com o runner de integração: os dois derrubam o MESMO projeto. Se um mudar de nome e o
  // outro não, volta a existir um caminho que apaga o volume errado.
  it('o projeto do helper é o mesmo do runner de integração', () => {
    const helper = readFileSync(join(E2E_DIR, HELPER), 'utf8');
    const runner = readFileSync('scripts/ci/compose-project.ts', 'utf8');
    const nameOf = (src: string): string | undefined => /core-api-test/.exec(src)?.[0];
    assert.equal(nameOf(helper), nameOf(runner));
    assert.equal(nameOf(helper), 'core-api-test');
  });
});

describe('scripts de e2e — backup/restore dos secrets, exercitado de verdade', () => {
  // Roda as funções do helper num diretório temporário. Sem Docker: `e2e_setup` e
  // `e2e_restore_secrets` só tocam o filesystem, e é o filesystem que o dev perde quando dá errado.
  // Devolve o sandbox para quem chamou inspecionar o resultado — e limpar depois.
  const runInSandbox = (script: string): string => {
    const sandbox = mkdtempSync(join(tmpdir(), 'e2e-secrets-'));
    try {
      mkdirSync(join(sandbox, 'secrets'), { recursive: true });
      const helperSrc = readFileSync(join(E2E_DIR, HELPER), 'utf8');
      writeFileSync(join(sandbox, 'helper.sh'), helperSrc);
      writeFileSync(join(sandbox, 'run.sh'), `set -uo pipefail\nsource ./helper.sh\n${script}\n`);
      execFileSync('bash', ['run.sh'], { cwd: sandbox, stdio: 'pipe' });
      return sandbox;
    } catch (e) {
      rmSync(sandbox, { recursive: true, force: true });
      throw e;
    }
  };

  it('secret preexistente do dev volta byte-a-byte depois do teardown', () => {
    const sandbox = runInSandbox(`
      printf 'SENTINELA-DO-DEV' > secrets/mysql_root_password.txt
      e2e_setup
      # durante o teste, o valor é o efêmero
      grep -q 'rootpw-migration-test-only' secrets/mysql_root_password.txt || exit 1
      e2e_restore_secrets
    `);
    try {
      const restored = readFileSync(join(sandbox, 'secrets/mysql_root_password.txt'), 'utf8');
      assert.equal(restored, 'SENTINELA-DO-DEV');
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  it('secret que NÃO existia antes é removido, não deixado para trás', () => {
    const sandbox = runInSandbox(`
      e2e_setup
      e2e_restore_secrets
    `);
    try {
      assert.equal(
        existsSync(join(sandbox, 'secrets/mysql_root_password.txt')),
        false,
        'quem não tinha secrets deve continuar sem — não herdar os de teste',
      );
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
