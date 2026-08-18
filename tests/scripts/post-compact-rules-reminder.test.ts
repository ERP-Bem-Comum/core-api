/**
 * POST-COMPACT-RULES-REMINDER — a compactação não leva o harness embora em silêncio.
 *
 * Medido em 18/08/2026: rules de `.claude/rules/` entram por `load_reason: path_glob_match` e a
 * compactação as derruba sem reinjetar — 6 sessões produziram 14 `session_start` + 14
 * `path_glob_match` e ZERO `compact`, apesar de 4 compactações nos transcripts. Daí o padrão de
 * começar aderente e degradar no meio da sessão.
 *
 * O hook lê o próprio testemunho (`.claude/.last-instructions.log`) e devolve, no PostCompact, a
 * lista do que caiu. Os testes montam um projeto temporário com um log forjado — nunca dependem
 * do log real, que muda a cada sessão e tornaria o resultado não-determinístico.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, accessSync, constants } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const HOOK = path.resolve(
  import.meta.dirname,
  '../../.claude/hooks/post-compact-rules-reminder.sh',
);

interface Entry {
  session_id: string;
  load_reason: string;
  file_path: string;
}

const entry = (e: Entry): string => `2026-08-18T12:00:00-03:00\t${JSON.stringify(e)}`;

/** Monta um projeto temporário com o log indicado e roda o hook contra ele. */
const run = (lines: readonly string[], sessionId: string, event = 'PostCompact'): string => {
  const dir = mkdtempSync(path.join(tmpdir(), 'postcompact-'));
  mkdirSync(path.join(dir, '.claude'), { recursive: true });
  writeFileSync(path.join(dir, '.claude/.last-instructions.log'), lines.join('\n') + '\n');
  return execFileSync('bash', [HOOK], {
    input: JSON.stringify({ session_id: sessionId, hook_event_name: event }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
  }).trim();
};

const RULES_DIR = '/repo/.claude/rules';

describe('post-compact-rules-reminder — o hook alcança este repositório', () => {
  it('existe e é executável', () => {
    assert.doesNotThrow(() => {
      accessSync(HOOK, constants.X_OK);
    }, `${HOOK} ausente ou sem bit +x — o hook não roda`);
  });
});

describe('post-compact-rules-reminder — reporta o que a compactação derrubou', () => {
  it('nomeia as rules carregadas por glob na sessão', () => {
    const out = run(
      [
        entry({
          session_id: 'S1',
          load_reason: 'path_glob_match',
          file_path: `${RULES_DIR}/domain.md`,
        }),
        entry({
          session_id: 'S1',
          load_reason: 'path_glob_match',
          file_path: `${RULES_DIR}/testing.md`,
        }),
      ],
      'S1',
    );
    const parsed = JSON.parse(out) as {
      hookSpecificOutput: { hookEventName: string; additionalContext: string };
      systemMessage: string;
    };
    assert.equal(parsed.hookSpecificOutput.hookEventName, 'PostCompact');
    assert.match(parsed.hookSpecificOutput.additionalContext, /domain\.md/);
    assert.match(parsed.hookSpecificOutput.additionalContext, /testing\.md/);
  });

  // O script está registrado em DOIS eventos, porque a existência de `PostCompact` está em disputa
  // (duas leituras da doc o citam, uma não o encontrou) e `SessionStart` com matcher `compact` é
  // confirmado por todas. Devolver `hookEventName` hardcoded quebraria em silêncio no outro lado.
  it('ecoa o evento que de fato disparou, não um nome fixo', () => {
    const entradas = [
      entry({
        session_id: 'S1',
        load_reason: 'path_glob_match',
        file_path: `${RULES_DIR}/domain.md`,
      }),
    ];
    for (const evento of ['PostCompact', 'SessionStart']) {
      const parsed = JSON.parse(run(entradas, 'S1', evento)) as {
        hookSpecificOutput: { hookEventName: string };
      };
      assert.equal(parsed.hookSpecificOutput.hookEventName, evento);
    }
  });

  it('diz COMO recarregar — aviso sem ação é burocracia', () => {
    const out = run(
      [
        entry({
          session_id: 'S1',
          load_reason: 'path_glob_match',
          file_path: `${RULES_DIR}/domain.md`,
        }),
      ],
      'S1',
    );
    const ctx = (JSON.parse(out) as { hookSpecificOutput: { additionalContext: string } })
      .hookSpecificOutput.additionalContext;
    assert.match(ctx, /Read/, 'precisa dizer que Read é o gatilho');
    assert.match(ctx, /path_glob_match/, 'precisa nomear o mecanismo');
  });

  // `additionalContext` pode não ser honrado em PostCompact — a doc trunca a seção por evento.
  // O systemMessage é a garantia de que ao menos o humano vê. Um dos dois chega.
  it('avisa também pelo systemMessage, caso additionalContext seja ignorado', () => {
    const out = run(
      [
        entry({
          session_id: 'S1',
          load_reason: 'path_glob_match',
          file_path: `${RULES_DIR}/domain.md`,
        }),
      ],
      'S1',
    );
    const msg = (JSON.parse(out) as { systemMessage: string }).systemMessage;
    assert.match(msg, /rule/i);
  });

  it('conta cada rule uma vez, mesmo carregada várias vezes', () => {
    const out = run(
      [
        entry({
          session_id: 'S1',
          load_reason: 'path_glob_match',
          file_path: `${RULES_DIR}/domain.md`,
        }),
        entry({
          session_id: 'S1',
          load_reason: 'path_glob_match',
          file_path: `${RULES_DIR}/domain.md`,
        }),
      ],
      'S1',
    );
    const ctx = (JSON.parse(out) as { hookSpecificOutput: { additionalContext: string } })
      .hookSpecificOutput.additionalContext;
    assert.match(ctx, /1 rule\(s\)/, 'a rule repetida não pode ser contada duas vezes');
  });
});

describe('post-compact-rules-reminder — cala a boca quando não há o que dizer', () => {
  it('silencia quando a sessão não carregou rule por glob', () => {
    const out = run(
      [entry({ session_id: 'S1', load_reason: 'session_start', file_path: '/repo/CLAUDE.md' })],
      'S1',
    );
    assert.equal(out, '', 'só session_start: nada a lembrar');
  });

  it('não vaza rule de OUTRA sessão', () => {
    const out = run(
      [
        entry({
          session_id: 'OUTRA',
          load_reason: 'path_glob_match',
          file_path: `${RULES_DIR}/domain.md`,
        }),
      ],
      'S1',
    );
    assert.equal(out, '', 'a rule era de outra sessão — reportá-la seria mentir sobre o contexto');
  });

  it('silencia quando o payload não traz session_id', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'postcompact-'));
    mkdirSync(path.join(dir, '.claude'), { recursive: true });
    writeFileSync(
      path.join(dir, '.claude/.last-instructions.log'),
      entry({
        session_id: 'S1',
        load_reason: 'path_glob_match',
        file_path: `${RULES_DIR}/domain.md`,
      }) + '\n',
    );
    const out = execFileSync('bash', [HOOK], {
      input: JSON.stringify({ hook_event_name: 'PostCompact' }),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    }).trim();
    assert.equal(out, '');
  });

  it('silencia quando o log não existe — clone novo não pode quebrar', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'postcompact-'));
    const out = execFileSync('bash', [HOOK], {
      input: JSON.stringify({ session_id: 'S1', hook_event_name: 'PostCompact' }),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    }).trim();
    assert.equal(out, '');
  });
});
