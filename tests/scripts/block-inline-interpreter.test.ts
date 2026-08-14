/**
 * BLOCK-INLINE-INTERPRETER — o agente não reescreve arquivo com interpretador improvisado.
 *
 * Origem: sessão de 14/08/2026. Duas vezes no mesmo turno o agente contornou Edit/Write —
 * `python3 - <<'PY'` para inserir um teste e `perl -0pi -e` para acrescentar campos a fakes. O
 * segundo acertou alguns pontos, DUPLICOU outros, e nada acusou até o typecheck. Edit/Write têm o
 * que falta ali: passam pelos PostToolUse (prettier), respeitam o estado de leitura do arquivo e
 * falham alto quando o alvo não casa.
 *
 * O risco que este gate cobre não é "linguagem errada" — é edição textual cega sobre código.
 *
 * Nenhum assert é constante: cada um depende do hook existir, ser executável e classificar o
 * comando. Os casos de ALLOW são metade da suíte de propósito — um bloqueador que recusa tudo
 * passaria num teste só de deny e inviabilizaria trabalho legítimo.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import path from 'node:path';

const HOOK = path.resolve(import.meta.dirname, '../../.claude/hooks/block-inline-interpreter.sh');

type Decision = 'allow' | 'deny';

// Contrato do PreToolUse: stdout vazio = allow silencioso; JSON com permissionDecision = veredito.
const decide = (command: string): Decision => {
  const out = execFileSync('bash', [HOOK], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
  }).trim();
  if (out === '') return 'allow';
  const parsed: unknown = JSON.parse(out);
  const decision = (parsed as { hookSpecificOutput?: { permissionDecision?: string } })
    .hookSpecificOutput?.permissionDecision;
  return decision === 'deny' ? 'deny' : 'allow';
};

describe('block-inline-interpreter — o hook alcança este repositório', () => {
  it('existe e é executável', () => {
    assert.doesNotThrow(() => {
      accessSync(HOOK, constants.X_OK);
    }, `${HOOK} ausente ou sem bit +x — o hook não roda`);
  });
});

describe('block-inline-interpreter — recusa interpretador em posição de comando', () => {
  // O caso literal que motivou o gate: heredoc multilinha, a forma que o `if:` do settings.json
  // não consegue parsear e deixa passar para o script.
  it('recusa o heredoc python que editou arquivo nesta base', () => {
    assert.equal(decide("python3 - <<'PY'\nprint(1)\nPY"), 'deny');
  });

  for (const cmd of [
    'python -c "print(1)"',
    'python3 script.py',
    'cat x | python3 -',
    'pnpm build && python3 gen.py',
    'FOO=1 python3 x.py',
  ]) {
    it(`recusa: ${cmd.split('\n')[0] ?? cmd}`, () => {
      assert.equal(decide(cmd), 'deny');
    });
  }

  // Perl inline foi o segundo deslize — e o que causou dano real (duplicação silenciosa).
  for (const cmd of [
    "perl -0pi -e 's/a/b/' arquivo.ts",
    "perl -e 'print 1'",
    "perl -pe 's/x/y/' f",
    "cat f | perl -ne 'print'",
  ]) {
    it(`recusa perl inline: ${cmd}`, () => {
      assert.equal(decide(cmd), 'deny');
    });
  }
});

describe('block-inline-interpreter — MENÇÃO não é uso', () => {
  // Varredura por nome que acusa a menção é o erro reincidente desta base. Um gate que bloqueasse
  // `grep python` seria abandonado na primeira semana — e gate abandonado não protege nada.
  for (const cmd of [
    'grep python arquivo.txt',
    'brew list | grep python',
    'ls /usr/bin/python3',
    'echo "use python?" >> notas.md',
    'rg "python" src/',
  ]) {
    it(`permite: ${cmd}`, () => {
      assert.equal(decide(cmd), 'allow');
    });
  }

  // O caso que quase matou o hook na estreia: ele bloqueou o PRÓPRIO commit que o introduzia,
  // porque a mensagem descrevia o gate e tinha `python` abrindo uma linha dentro do heredoc. Como
  // o grep casa `^` por linha, a menção virou "posição de comando". Um gate que recusa qualquer
  // heredoc citando python é desligado no mesmo dia.
  it('permite heredoc cujo CORPO menciona python e perl', () => {
    const cmd = [
      "git commit -F - <<'EOF'",
      'chore: descreve o gate',
      '',
      'python para inserir teste e um `perl -0pi -e` para editar fakes.',
      'perl -e também aparece aqui, como menção.',
      'EOF',
    ].join('\n');
    assert.equal(decide(cmd), 'allow');
  });

  // …mas a linha que ABRE o heredoc continua sendo comando. É onde mora o caso real.
  it('ainda recusa quando o interpretador ABRE o heredoc', () => {
    assert.equal(decide("python3 - <<'PY'\nprint('oi')\nPY"), 'deny');
    assert.equal(decide("cat <<'EOF' | python3 -\nx\nEOF"), 'deny');
  });

  // Perl como runner de script continua liberado: o alvo é o interpretador improvisado, não a
  // linguagem. E as ferramentas de texto do shell seguem disponíveis.
  for (const cmd of [
    'perl script.pl',
    "sed -i '' 's/a/b/' f.ts",
    "awk '{print $1}' f",
    'jq -r .name package.json',
    'pnpm test',
  ]) {
    it(`permite: ${cmd}`, () => {
      assert.equal(decide(cmd), 'allow');
    });
  }
});

describe('block-inline-interpreter — a recusa é acionável', () => {
  it('nomeia a alternativa em vez de só negar', () => {
    const out = execFileSync('bash', [HOOK], {
      input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'python3 x.py' } }),
      encoding: 'utf8',
    });
    const reason = (JSON.parse(out) as { hookSpecificOutput: { permissionDecisionReason: string } })
      .hookSpecificOutput.permissionDecisionReason;
    assert.match(reason, /Edit/, 'a recusa precisa apontar a ferramenta a usar');
    assert.match(reason, /python3 x\.py/, 'a recusa precisa ecoar o comando bloqueado');
  });
});
