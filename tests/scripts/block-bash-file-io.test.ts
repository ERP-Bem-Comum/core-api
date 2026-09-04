/**
 * BLOCK-BASH-FILE-IO — o agente não substitui Read/Edit/Write por shell.
 *
 * Origem: medição de 18/08/2026 (Claude Code 2.1.234). As rules de `.claude/rules/` entram em
 * contexto por `load_reason: path_glob_match`, e quem dispara é a FERRAMENTA DEDICADA, não o
 * conteúdo lido. Experimento controlado, testemunhado por `.claude/.last-instructions.log`:
 * `head -15 src/shared/kernel/cnpj.ts` via Bash não carregou rule alguma; o `Read` do MESMO arquivo
 * gravou `{"load_reason":"path_glob_match","trigger_file_path":".../cnpj.ts"}` e injetou
 * `rules/domain.md` na hora.
 *
 * Ou seja: ler código por `cat` é operar sem o harness, silenciosamente. O modo `auto` induz
 * exatamente esse padrão. Escrever por `sed -i` / `>` tem o mesmo defeito do outro lado — fura o
 * `PostToolUse(Edit|Write)` e o Prettier não roda.
 *
 * Como no `block-inline-interpreter`, os casos de ALLOW são metade da suíte de propósito: um
 * bloqueador que recusa pipeline, `grep` ou `git show` inviabiliza trabalho legítimo e é desligado
 * na primeira semana. Nenhum assert é constante — todos dependem do hook classificar.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import path from 'node:path';

const PROJECT_DIR = path.resolve(import.meta.dirname, '../..');
const HOOK = path.join(PROJECT_DIR, '.claude/hooks/block-bash-file-io.sh');

type Decision = 'allow' | 'deny';

const run = (command: string): string =>
  execFileSync('bash', [HOOK], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: PROJECT_DIR },
  }).trim();

// Contrato do PreToolUse: stdout vazio = allow silencioso; JSON com permissionDecision = veredito.
const decide = (command: string): Decision => {
  const out = run(command);
  if (out === '') return 'allow';
  const parsed: unknown = JSON.parse(out);
  const decision = (parsed as { hookSpecificOutput?: { permissionDecision?: string } })
    .hookSpecificOutput?.permissionDecision;
  return decision === 'deny' ? 'deny' : 'allow';
};

describe('block-bash-file-io — o hook alcança este repositório', () => {
  it('existe e é executável', () => {
    assert.doesNotThrow(() => {
      accessSync(HOOK, constants.X_OK);
    }, `${HOOK} ausente ou sem bit +x — o hook não roda`);
  });

  it('a lib de heredoc que ele compartilha existe e é legível', () => {
    assert.doesNotThrow(() => {
      accessSync(path.join(PROJECT_DIR, '.claude/hooks/lib/heredoc.sh'), constants.R_OK);
    }, 'lib/heredoc.sh ausente — os dois hooks que a consomem quebram juntos');
  });
});

describe('block-bash-file-io — recusa LEITURA de código por Bash', () => {
  // O caso literal medido: foi este comando que provou que a rule não carrega.
  it('recusa o comando que originou o gate', () => {
    assert.equal(decide('head -15 src/shared/kernel/cnpj.ts'), 'deny');
  });

  for (const cmd of [
    'cat src/server.ts',
    'tail -20 tests/cleanup/module-boundary.test.ts',
    "sed -n '1,20p' src/server.ts",
    'cat compose.yaml',
    'cat package.json',
    'less src/modules/contracts/domain/contract.ts',
  ]) {
    it(`recusa: ${cmd}`, () => {
      assert.equal(decide(cmd), 'deny');
    });
  }
});

describe('block-bash-file-io — recusa ESCRITA de código por Bash', () => {
  for (const cmd of [
    'echo "export const a = 1" > src/foo.ts',
    'echo x >> src/modules/contracts/domain/contract.ts',
    "sed -i '' 's/a/b/' src/server.ts",
    'tee src/foo.ts',
  ]) {
    it(`recusa: ${cmd}`, () => {
      assert.equal(decide(cmd), 'deny');
    });
  }

  // A linha que ABRE o heredoc é comando — é onde mora a escrita real.
  it('recusa heredoc que grava arquivo de código', () => {
    assert.equal(decide("cat > src/novo.ts <<'EOF'\nexport const a = 1\nEOF"), 'deny');
  });
});

describe('block-bash-file-io — o shell continua utilizável', () => {
  // Pipeline é processamento, não substituição de Read: Grep e jq não têm equivalente dedicado.
  for (const cmd of [
    'cat src/server.ts | grep -n fastify',
    'head -50 src/server.ts | grep prefix',
    'grep -rn "createPool" src/',
    'rg "AUTH_RBAC_MODE" src/',
    'wc -l src/server.ts',
    'ls src/modules/*/public-api/index.ts',
    'jq -r .version package.json',
    'git show HEAD:src/server.ts',
    'git diff src/server.ts',
    'pnpm test',
  ]) {
    it(`permite: ${cmd}`, () => {
      assert.equal(decide(cmd), 'allow');
    });
  }

  // Só arquivo que o Prettier conhece e que as rules cobrem. Log e script ficam de fora — ler o
  // testemunho do gate é trabalho legítimo e diário.
  for (const cmd of [
    'cat .claude/.last-quality-gate.log',
    'cat .claude/.last-instructions.log',
    'head -5 scripts/e2e/bruno-all.sh',
    'cat db/drizzle/0001_init.sql',
  ]) {
    it(`permite (não é código formatável): ${cmd}`, () => {
      assert.equal(decide(cmd), 'allow');
    });
  }

  // Fora do repositório o hook se cala — o scratchpad da sessão é o lugar certo para temporário.
  for (const cmd of [
    'echo x > /tmp/foo.ts',
    'cat /tmp/analise.json',
    'cat /tmp/a.ts > /tmp/b.ts',
  ]) {
    it(`permite (fora do repo): ${cmd}`, () => {
      assert.equal(decide(cmd), 'allow');
    });
  }
});

describe('block-bash-file-io — MENÇÃO não é uso', () => {
  // O erro que quase matou o hook irmão na estreia: ele bloqueou o próprio commit que o introduzia,
  // porque a mensagem descrevia o gate. Corpo de heredoc não é comando.
  it('permite commit cuja mensagem descreve o próprio gate', () => {
    const cmd = [
      "git commit -F - <<'EOF'",
      'chore(harness): barra leitura de código por Bash',
      '',
      'O hook recusa `cat src/x.ts` e `sed -i` em .ts porque não disparam',
      'o path_glob_match das rules.',
      'EOF',
    ].join('\n');
    assert.equal(decide(cmd), 'allow');
  });

  it('permite quando o nome do arquivo é argumento de busca, não alvo de leitura', () => {
    assert.equal(decide('grep -l "server.ts" docs/*.md'), 'allow');
  });
});

describe('block-bash-file-io — a recusa é acionável', () => {
  it('nomeia a ferramenta a usar e ecoa o comando bloqueado', () => {
    const parsed = JSON.parse(run('cat src/server.ts')) as {
      hookSpecificOutput: { permissionDecisionReason: string };
    };
    const reason = parsed.hookSpecificOutput.permissionDecisionReason;
    assert.match(reason, /Read/, 'a recusa precisa apontar a ferramenta a usar');
    assert.match(reason, /cat src\/server\.ts/, 'a recusa precisa ecoar o comando bloqueado');
    assert.match(
      reason,
      /path_glob_match|rules/,
      'a recusa precisa dizer POR QUE — senão vira burocracia e é contornada',
    );
  });
});
