/**
 * GATE-BLOCKER — o pre-commit existe, alcança este repositório, e RECUSA commit vermelho.
 *
 * Origem: medição de 2026-07-29 registrada em
 * `.claude/.pipeline/HRN-BLOCKING-GATE/000-request.md`. A política de regressão zero nomeava um
 * backstop mecânico de commit que NÃO EXISTIA, em três camadas independentes — e cada uma sozinha
 * já bastaria para anular a rede:
 *
 *   1. `core.hooksPath` apontava para `.githooks`, diretório que não existia nesta branch;
 *   2. o git procura um arquivo chamado exatamente `pre-commit`, e havia apenas
 *      `pre-commit-typecheck.sh` — logo, nem quem seguisse a instrução documentada teria hook;
 *   3. o próprio script testava `${REPO_ROOT}/ERP-CONTRACTS/tsconfig.json`, path de outra topologia
 *      (o core-api É a raiz do repo), e saía 0 ANTES de qualquer verificação, para todo conteúdo.
 *
 * Esta suíte cobre a parte de COMMIT. O backstop de fim de turno é outro mecanismo — hoje o hook
 * `Stop` (`stop-quality-gate.sh`), que substituiu o `stop-typecheck.sh` para o qual a versão
 * original deste arquivo tinha asserções.
 *
 * Nenhum assert é constante: todos dependem de um artefato (arquivo, exit code, config) que ou não
 * existe, ou existe mal configurado. O caso mais forte monta um repositório git isolado em tmp e
 * exercita `git commit` de verdade — com scripts `format:check`/`lint`/`test` fake para manter o
 * teste rápido, deixando o `typecheck` como o único gate real.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { gitFixtureEnv } from '../support/git-fixture.ts';

const REPO_ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const PRE_COMMIT_SCRIPT = join(REPO_ROOT, '.claude/hooks/pre-commit-typecheck.sh');
const GITHOOKS_PRE_COMMIT = join(REPO_ROOT, '.githooks/pre-commit');
const TSC_BIN = join(REPO_ROOT, 'node_modules/.bin/tsc');

const tryRead = (path: string): string => {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return '';
  }
};

const TSCONFIG_FIXTURE = JSON.stringify(
  {
    compilerOptions: {
      strict: true,
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      skipLibCheck: true,
    },
    include: ['*.ts'],
  },
  null,
  2,
);

const tsFixtureContent = (valid: boolean): string =>
  valid ? 'export const ok: number = 1;\n' : 'export const ok: number = "broken";\n';

// ─── CA-6 — .claude/hooks/pre-commit-typecheck.sh não referencia path morto ─────────────────────
describe('CA-6 — pre-commit-typecheck.sh não referencia ERP-CONTRACTS nem path inexistente', () => {
  const content = tryRead(PRE_COMMIT_SCRIPT);

  it('não contém a substring literal "ERP-CONTRACTS" (nem no path-check, nem no filtro de staged)', () => {
    assert.ok(content.length > 0, '.claude/hooks/pre-commit-typecheck.sh não encontrado');
    assert.doesNotMatch(
      content,
      /ERP-CONTRACTS/,
      'o script referencia ERP-CONTRACTS — diretório que não existe nesta topologia (core-api é a raiz do repo)',
    );
  });

  it('toda referência a ${REPO_ROOT}/<subpath> aponta para um caminho que EXISTE no repo', () => {
    assert.ok(content.length > 0, '.claude/hooks/pre-commit-typecheck.sh não encontrado');
    const referenced = [...content.matchAll(/\$\{REPO_ROOT\}\/([A-Za-z0-9_./-]+)/g)].map(
      (m) => m[1] ?? '',
    );
    for (const rel of new Set(referenced)) {
      assert.ok(
        existsSync(join(REPO_ROOT, rel)),
        `\${REPO_ROOT}/${rel} não existe — script referencia path morto`,
      );
    }
  });
});

// ─── CA-4/CA-5 — .githooks/pre-commit instalado de fato ─────────────────────────────────────────
describe('CA-4/CA-5 — .githooks/pre-commit existe, é executável, e core.hooksPath aponta pra lá', () => {
  it('.githooks/pre-commit existe e é executável', () => {
    assert.ok(
      existsSync(GITHOOKS_PRE_COMMIT),
      '.githooks/pre-commit ainda não existe — nenhum git hook de commit está instalado',
    );
    const mode = statSync(GITHOOKS_PRE_COMMIT).mode;
    assert.notEqual(mode & 0o111, 0, '.githooks/pre-commit existe mas não é executável (chmod +x)');
  });

  // CA-9 por CONTEÚDO: o comando de instalação precisa estar documentado. Ao
  // contrário de `core.hooksPath`, isto é versionado e vale em qualquer clone.
  it('CLAUDE.md documenta o comando de instalação do hook', () => {
    const canonical = readFileSync(join(REPO_ROOT, 'CLAUDE.md'), 'utf-8');
    assert.match(
      canonical,
      /git config core\.hooksPath \.githooks/,
      'CLAUDE.md precisa trazer o comando exato de instalação — o hook não se instala sozinho',
    );
  });

  it('quando core.hooksPath ESTÁ instalado, resolve para um diretório com "pre-commit"', (t) => {
    // `core.hooksPath` é estado LOCAL de máquina (.git/config), não conteúdo
    // versionado — um clone limpo não o tem. Exigi-lo aqui reprovaria em CI e
    // derrubaria o gate required de todo PR, que é o oposto do objetivo deste
    // ticket. Leitura pura; nunca escrevemos no repo real.
    const cfg = spawnSync('git', ['config', '--get', 'core.hooksPath'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });
    if (cfg.status !== 0) {
      t.skip('core.hooksPath não instalado nesta cópia — instalação é manual (ver CLAUDE.md)');
      return;
    }
    const raw = cfg.stdout.trim();
    assert.ok(raw.length > 0, 'core.hooksPath configurado, mas com valor vazio');
    const resolved = isAbsolute(raw) ? raw : join(REPO_ROOT, raw);
    assert.ok(
      existsSync(join(resolved, 'pre-commit')),
      `core.hooksPath resolve para "${resolved}", que não contém um arquivo "pre-commit"`,
    );
  });
});

// ─── Blocker 2 — o filtro de staged precisa pegar delete e rename ───────────────────────────────
describe('CA-4 — o gate roda também quando o commit só apaga ou renomeia um .ts', () => {
  it('o filtro de staged usa --diff-filter que inclui D e R', () => {
    const content = readFileSync(PRE_COMMIT_SCRIPT, 'utf-8');
    const match = /--diff-filter=([A-Z]+)/.exec(content);
    assert.ok(match, 'o script precisa declarar --diff-filter explicitamente');
    const filter = match[1] ?? '';
    assert.ok(
      filter.includes('D'),
      `--diff-filter=${filter} não inclui D — apagar um .ts importado por outros quebra o tsc e o gate seria pulado`,
    );
    assert.ok(
      filter.includes('R'),
      `--diff-filter=${filter} não inclui R — git mv vira R100 e sumiria do filtro`,
    );
  });
});

// ─── Blocker 3 — sem pnpm no PATH o gate precisa FALHAR, não liberar ────────────────────────────
describe('CA-4 — gate que não pôde rodar não aprova (fail-closed)', () => {
  it('o ramo "pnpm ausente" marca falha em vez de seguir', () => {
    const content = readFileSync(PRE_COMMIT_SCRIPT, 'utf-8');
    // O else do `if [ -n "${PNPM_CMD}" ]` é o caminho sem pnpm.
    const elseBranch = content.slice(content.indexOf('  else'), content.indexOf('\n}'));
    assert.match(
      elseBranch,
      /FAILED=1/,
      'sem pnpm no PATH o script precisa setar FAILED=1 — git hooks rodam em shell ' +
        'não-login, que não carrega o rc onde o fnm injeta o PATH do pnpm',
    );
  });
});

// ─── CA-4 — repositório isolado: gate vermelho recusa commit, gate verde aceita ─────────────────
//
// Contrato assumido (documentado no REPORT.md §"O que precisa existir para virar GREEN"): o W1
// corrige `.claude/hooks/pre-commit-typecheck.sh` para calcular REPO_ROOT via
// `git rev-parse --show-toplevel` (dinâmico — já é assim hoje) e usar esse valor diretamente como
// diretório do projeto (sem concatenar ERP-CONTRACTS), e cria `.githooks/pre-commit` executável
// que, direta ou indiretamente, aciona esse mesmo script. Por isso este fixture replica AMBOS os
// arquivos (`.githooks/pre-commit` e `.claude/hooks/pre-commit-typecheck.sh`) na mesma estrutura
// relativa dentro do repositório isolado — cobre tanto um `.githooks/pre-commit` autocontido quanto
// um que delegue para `.claude/hooks/pre-commit-typecheck.sh` via `git rev-parse --show-toplevel`.
describe('CA-4 — git commit é recusado com o gate vermelho e aceito com o gate verde (repo isolado)', () => {
  // `scriptOverrides` permite variar QUAL gate fica vermelho sem duplicar o
  // fixture. Por padrão só o `typecheck` é real (tsc); os outros três são fakes
  // verdes — daí a lacuna que o review apontou em I-6, coberta pelo último caso.
  const buildFixtureRepo = (scriptOverrides: Readonly<Record<string, string>> = {}): string => {
    const dir = mkdtempSync(join(tmpdir(), 'hrn-blocking-gate-'));

    // `env` sanitizado além do `cwd`: dentro de um `git commit` o hook roda esta suíte com
    // `GIT_DIR` exportado, e ele vence o `cwd` — estes cinco comandos reconfigurariam o
    // repositório REAL. Ver `tests/support/git-fixture.ts`.
    const env = gitFixtureEnv();
    spawnSync('git', ['init', '-q'], { cwd: dir, env });
    spawnSync('git', ['config', 'user.email', 'w0-fixture@example.com'], { cwd: dir, env });
    spawnSync('git', ['config', 'user.name', 'W0 Fixture'], { cwd: dir, env });
    spawnSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: dir, env });
    spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: dir, env });

    mkdirSync(join(dir, '.githooks'), { recursive: true });
    cpSync(GITHOOKS_PRE_COMMIT, join(dir, '.githooks/pre-commit'));
    chmodSync(join(dir, '.githooks/pre-commit'), 0o755);

    if (existsSync(PRE_COMMIT_SCRIPT)) {
      mkdirSync(join(dir, '.claude/hooks'), { recursive: true });
      cpSync(PRE_COMMIT_SCRIPT, join(dir, '.claude/hooks/pre-commit-typecheck.sh'));
      chmodSync(join(dir, '.claude/hooks/pre-commit-typecheck.sh'), 0o755);
    }

    const noop = 'node -e "process.exit(0)"';
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify(
        {
          name: 'hrn-blocking-gate-fixture',
          private: true,
          scripts: {
            'format:check': noop,
            lint: noop,
            test: noop,
            typecheck: `${TSC_BIN} --noEmit`,
            ...scriptOverrides,
          },
        },
        null,
        2,
      ),
    );
    writeFileSync(join(dir, 'tsconfig.json'), TSCONFIG_FIXTURE);
    return dir;
  };

  const commitFixture = (dir: string, valid: boolean, message: string) => {
    writeFileSync(join(dir, 'fixture.ts'), tsFixtureContent(valid));
    spawnSync('git', ['add', '-A'], { cwd: dir, env: gitFixtureEnv() });
    return spawnSync('git', ['commit', '-m', message], {
      cwd: dir,
      env: gitFixtureEnv(),
      encoding: 'utf-8',
      timeout: 60_000,
    });
  };

  const commitCount = (dir: string): string =>
    spawnSync('git', ['log', '--oneline'], {
      cwd: dir,
      env: gitFixtureEnv(),
      encoding: 'utf-8',
    }).stdout.trim();

  it('pré-condição: .githooks/pre-commit precisa existir para este teste ter sinal', () => {
    assert.ok(
      existsSync(GITHOOKS_PRE_COMMIT),
      '.githooks/pre-commit ausente — não há hook para instalar no repositório isolado',
    );
  });

  it('RED: commit com erro de tipo staged é recusado (exit != 0), nenhum commit é criado', () => {
    if (!existsSync(GITHOOKS_PRE_COMMIT)) {
      assert.fail('.githooks/pre-commit ausente — pulando cenário RED (ver teste de pré-condição)');
    }
    const dir = buildFixtureRepo();
    try {
      const r = commitFixture(dir, false, 'red: tipo quebrado');
      assert.notEqual(
        r.status,
        0,
        `commit deveria ter sido recusado; status=${String(r.status)} stdout=${r.stdout} stderr=${r.stderr}`,
      );
      assert.equal(commitCount(dir), '', 'nenhum commit deveria existir após a recusa');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('GREEN: commit com tipos válidos passa (exit 0), o commit é criado', () => {
    if (!existsSync(GITHOOKS_PRE_COMMIT)) {
      assert.fail(
        '.githooks/pre-commit ausente — pulando cenário GREEN (ver teste de pré-condição)',
      );
    }
    const dir = buildFixtureRepo();
    try {
      const r = commitFixture(dir, true, 'green: tipos ok');
      assert.equal(
        r.status,
        0,
        `commit deveria ter passado; status=${String(r.status)} stdout=${r.stdout} stderr=${r.stderr}`,
      );
      assert.notEqual(commitCount(dir), '', 'deveria existir 1 commit após o gate verde');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // I-6 do review: os casos acima variam só o `typecheck`, então a acumulação de
  // FAILED em `run_pnpm_script` era exercitada num único dos 4 call sites. Foi
  // essa lacuna que deixou o Blocker 3 (fail-open sem pnpm) passar pelo W0 e W1.
  it('QUALQUER gate vermelho recusa o commit — não só o typecheck', () => {
    if (!existsSync(GITHOOKS_PRE_COMMIT)) {
      assert.fail('.githooks/pre-commit ausente — pulando (ver teste de pré-condição)');
    }
    // Só `format:check` vermelho; typecheck/lint/test verdes. Nenhum prettier real
    // roda — o custo é um fork de `node -e`.
    const dir = buildFixtureRepo({ 'format:check': 'node -e "process.exit(1)"' });
    try {
      const r = commitFixture(dir, true, 'red: format quebrado, tipos ok');
      assert.notEqual(
        r.status,
        0,
        `commit deveria ter sido recusado por format:check; status=${String(r.status)} stderr=${r.stderr}`,
      );
      assert.equal(
        commitCount(dir),
        '',
        'nenhum commit deveria existir — format:check é o único gate vermelho',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ─── CA-1/CA-2 — hook Stop bloqueia com gate vermelho, libera com gate verde ─────────────────────
