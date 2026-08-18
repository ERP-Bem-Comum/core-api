/**
 * LOGBOOK — o diário de bordo das sessões, e a ausência que denuncia a queda.
 *
 * O valor deste artefato não é registrar que a sessão começou — é tornar consultável o caso em que
 * ela NÃO terminou. Sessão que cai (529 do provedor, crash, kill) não emite `SessionEnd`: apenas
 * para. Em 18/08/2026 descobrir isso custou garimpar 5,1 MB de transcript; o diário responde com
 * uma linha e o horário do óbito, que é o que se cruza com o status do provedor.
 *
 * Por isso os testes de "sem fim" são o núcleo desta suíte, não um caso de borda.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, accessSync, constants } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { summarize, render } from '../../scripts/claude/logbook.ts';

const HOOK = path.resolve(import.meta.dirname, '../../.claude/hooks/logbook.sh');

interface Evt {
  ts: string;
  session: string;
  event: string;
  branch?: string;
}

const line = (e: Evt): string => JSON.stringify(e);

describe('logbook — o hook grava o que precisa e nada além', () => {
  it('existe e é executável', () => {
    assert.doesNotThrow(() => {
      accessSync(HOOK, constants.X_OK);
    }, `${HOOK} ausente ou sem bit +x — o diário nunca é escrito`);
  });

  it('registra uma linha JSON com sessão e evento', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'logbook-'));
    mkdirSync(path.join(dir, '.claude'), { recursive: true });
    execFileSync('bash', [HOOK], {
      input: JSON.stringify({ session_id: 'ABC123', hook_event_name: 'SessionStart' }),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    });
    const written = readFileSync(path.join(dir, '.claude/.session-logbook.log'), 'utf8').trim();
    const parsed = JSON.parse(written) as { session: string; event: string; ts: string };
    assert.equal(parsed.session, 'ABC123');
    assert.equal(parsed.event, 'SessionStart');
    assert.match(parsed.ts, /^\d{4}-\d{2}-\d{2}T/, 'timestamp precisa ser ordenável');
  });

  it('não grava nada sem session_id — linha órfã não ajuda ninguém', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'logbook-'));
    mkdirSync(path.join(dir, '.claude'), { recursive: true });
    execFileSync('bash', [HOOK], {
      input: JSON.stringify({ hook_event_name: 'Stop' }),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    });
    assert.throws(() => readFileSync(path.join(dir, '.claude/.session-logbook.log'), 'utf8'));
  });
});

describe('logbook — a ausência de SessionEnd é o sinal de queda', () => {
  const morta = [
    line({
      ts: '2026-08-18T13:00:00-03:00',
      session: 'CAIU',
      event: 'SessionStart',
      branch: 'dev',
    }),
    line({ ts: '2026-08-18T13:31:00-03:00', session: 'CAIU', event: 'Stop' }),
  ];
  const viva = [
    line({ ts: '2026-08-18T14:00:00-03:00', session: 'OK', event: 'SessionStart', branch: 'dev' }),
    line({ ts: '2026-08-18T14:20:00-03:00', session: 'OK', event: 'SessionEnd' }),
  ];

  it('marca como não fechada a sessão sem SessionEnd', () => {
    const [caiu] = summarize(morta);
    assert.ok(caiu);
    assert.equal(caiu.closed, false);
    assert.equal(caiu.last, '2026-08-18T13:31:00-03:00', 'o último evento é a hora do óbito');
  });

  it('marca como fechada a sessão que emitiu SessionEnd', () => {
    const [ok] = summarize(viva);
    assert.ok(ok);
    assert.equal(ok.closed, true);
  });

  it('--dead lista só as que não fecharam', () => {
    const saida = render(summarize([...morta, ...viva]), true);
    assert.match(saida, /CAIU/);
    assert.doesNotMatch(saida, /\bOK\b/);
  });

  it('a saída diz onde investigar, não só que caiu', () => {
    const saida = render(summarize(morta));
    assert.match(saida, /SEM FIM/);
    assert.match(saida, /status\.claude\.com/, 'precisa apontar o provedor');
    assert.match(saida, /API Error/, 'precisa apontar como confirmar no transcript');
  });

  it('não inventa alarme quando tudo fechou', () => {
    assert.match(render(summarize(viva), true), /Nenhuma sessão sem fim/);
  });
});

describe('logbook — contagens e robustez', () => {
  it('conta turnos e compactações da sessão', () => {
    const [s] = summarize([
      line({ ts: '2026-08-18T10:00:00-03:00', session: 'S', event: 'SessionStart' }),
      line({ ts: '2026-08-18T10:05:00-03:00', session: 'S', event: 'Stop' }),
      line({ ts: '2026-08-18T10:09:00-03:00', session: 'S', event: 'PreCompact' }),
      line({ ts: '2026-08-18T10:10:00-03:00', session: 'S', event: 'Stop' }),
    ]);
    assert.ok(s);
    assert.equal(s.turns, 2);
    assert.equal(s.compactions, 1);
  });

  // A rotação corta o arquivo pela metade; a primeira linha do resultado pode estar partida. Um
  // leitor que abortasse aí perderia todo o diário justamente depois de uma sessão longa.
  it('ignora linha corrompida em vez de abortar', () => {
    const s = summarize([
      '{"ts":"2026-08-18T10:00:00-03:00","sess',
      '',
      line({ ts: '2026-08-18T10:01:00-03:00', session: 'S', event: 'SessionStart' }),
    ]);
    assert.equal(s.length, 1);
  });

  it('separa sessões distintas', () => {
    const s = summarize([
      line({ ts: '2026-08-18T10:00:00-03:00', session: 'A', event: 'SessionStart' }),
      line({ ts: '2026-08-18T11:00:00-03:00', session: 'B', event: 'SessionStart' }),
    ]);
    assert.equal(s.length, 2);
    assert.equal(s[0]?.session, 'B', 'mais recente primeiro — é o que se procura ao investigar');
  });
});
