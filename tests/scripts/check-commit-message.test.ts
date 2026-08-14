/**
 * CHECK-COMMIT-MESSAGE — o trailer `Assisted-by` é cobrado ANTES do commit existir.
 *
 * Origem: sessão de 14/08/2026. Um commit do agente saiu sem o trailer (ADR-0054 §1); ao consertar
 * por `--amend`, a linha foi colada logo abaixo de `Refs #708`, sem linha em branco. O git deixa de
 * reconhecer o bloco nessa forma, então a mensagem PARECIA corrigida e continuava inválida — foi
 * preciso um terceiro amend.
 *
 * O gate de CI (`check-commit-trailers.ts`) pegaria os dois casos, mas só depois da história
 * escrita, quando o conserto é rebase. Este roda no `commit-msg`.
 *
 * A regra de formato NÃO é redefinida aqui: `check-commit-message.ts` importa `ASSISTED_BY_FORMAT`
 * do gate de CI. E quem decide o que é bloco de trailers é o próprio git — a suíte cobre
 * exatamente essa delegação, porque é ela que distingue este gate de um `grep 'Assisted-by:'`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { accessSync, constants } from 'node:fs';
import path from 'node:path';

import { checkCommitMessage, parseTrailers } from '#scripts/ci/check-commit-message.ts';
import { ASSISTED_BY_FORMAT } from '#scripts/ci/check-commit-trailers.ts';

const TRAILER = 'Assisted-by: Claude-Code:claude-opus-5';
const HOOK = path.resolve(import.meta.dirname, '../../.githooks/commit-msg');

describe('commit-msg — o hook alcança este repositório', () => {
  it('existe e é executável', () => {
    assert.doesNotThrow(() => {
      accessSync(HOOK, constants.X_OK);
    }, `${HOOK} ausente ou sem bit +x — o git não o executa`);
  });
});

describe('parseTrailers — quem decide o bloco é o git, não um regex nosso', () => {
  it('reconhece o trailer no último parágrafo', () => {
    const msg = `titulo\n\ncorpo\n\nRefs #708\n\n${TRAILER}\n`;
    assert.deepEqual(parseTrailers(msg, 'Assisted-by'), ['Claude-Code:claude-opus-5']);
  });

  // O caso que custou um amend extra: sem linha em branco após `Refs #708`, o bloco não se forma.
  // Um validador por substring aprovaria esta mensagem — e o CI a reprovaria depois.
  it('NÃO reconhece o trailer colado numa linha comum', () => {
    const msg = `titulo\n\ncorpo\n\nRefs #708\n${TRAILER}\n`;
    assert.deepEqual(parseTrailers(msg, 'Assisted-by'), []);
  });

  it('devolve vazio quando não há trailer algum', () => {
    assert.deepEqual(parseTrailers('titulo\n\ncorpo\n', 'Assisted-by'), []);
  });

  it('aceita o trailer sozinho, sem outras linhas no bloco', () => {
    assert.deepEqual(parseTrailers(`titulo\n\n${TRAILER}\n`, 'Assisted-by'), [
      'Claude-Code:claude-opus-5',
    ]);
  });
});

describe('checkCommitMessage — presença exigida só de quem é agente', () => {
  it('recusa mensagem sem trailer quando o commit é do agente', () => {
    const v = checkCommitMessage([], { requirePresence: true });
    assert.equal(v.length, 1);
    assert.equal(v[0]?.kind, 'missing-assisted-by');
  });

  // Commit humano legitimamente não tem o trailer (ADR-0054 §2: a IA nunca assina DCO). Exigi-lo de
  // todos transformaria um gate de IA em obstáculo para o time — e gate que atrapalha é desligado.
  it('aceita mensagem sem trailer quando o commit é humano', () => {
    assert.deepEqual(checkCommitMessage([], { requirePresence: false }), []);
  });

  it('valida o FORMATO nos dois casos, presente ou não exigido', () => {
    for (const requirePresence of [true, false]) {
      const v = checkCommitMessage(['sem-dois-pontos'], { requirePresence });
      assert.equal(v.length, 1, `requirePresence=${String(requirePresence)}`);
      assert.equal(v[0]?.kind, 'malformed-assisted-by');
    }
  });

  it('aceita o formato canônico do ADR-0054', () => {
    assert.deepEqual(
      checkCommitMessage(['Claude-Code:claude-opus-5'], { requirePresence: true }),
      [],
    );
    assert.deepEqual(
      checkCommitMessage(['Claude-Code:claude-opus-5 [worktree]'], { requirePresence: true }),
      [],
    );
  });
});

describe('check-commit-message — não redefine a regra do CI', () => {
  // Se alguém trocar o regex num dos lados, os dois gates passam a discordar e o commit vira
  // aprovado localmente e recusado no CI. A importação compartilhada é o que impede isso; este
  // teste garante que ela continua sendo a MESMA constante, não uma cópia com o mesmo valor.
  it('usa a constante exportada pelo gate de CI', () => {
    assert.ok(ASSISTED_BY_FORMAT.test('Claude-Code:claude-opus-5'));
    assert.ok(!ASSISTED_BY_FORMAT.test('Claude Code claude-opus-5'));
    // A prova de compartilhamento: `checkCommitMessage` aprova exatamente o que a constante aprova.
    for (const value of ['A:B', 'A:B [x]', 'sem-dois-pontos', 'com espaço:x']) {
      const aprovadoPeloGate = checkCommitMessage([value], { requirePresence: true }).length === 0;
      assert.equal(aprovadoPeloGate, ASSISTED_BY_FORMAT.test(value), value);
    }
  });
});
