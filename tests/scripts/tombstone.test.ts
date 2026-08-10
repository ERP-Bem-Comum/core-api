/**
 * TOMBSTONE — o gate que impede a remoção SILENCIOSA de documento citado (Fase 2 da spec 041).
 *
 * O caso real que ele existe para impedir: `handbook/domain/` deixou de existir num commit levando
 * 59 referências junto, e nada acusou. Três meses depois, o custo caiu sobre quem foi seguir os
 * links — e metade deles não pode nem ser consertada, porque vive em ADR imutável.
 *
 * A lápide (`to: null`) PASSA de propósito. O gate não decide se um documento pode morrer; decide
 * que a morte precisa ser declarada.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  checkTombstones,
  buildBacklinks,
  formatViolations,
  stagedRemovedMarkdown,
  type TombstoneViolation,
} from '../../scripts/handbook/tombstone.ts';

const backlinks = (pairs: readonly (readonly [string, readonly string[]])[]) =>
  new Map<string, readonly string[]>(pairs);

describe('TOMBSTONE — quando recusar', () => {
  it('remover documento citado, sem declaração, é violação', () => {
    const out = checkTombstones({
      removed: ['handbook/domain/x.md'],
      backlinks: backlinks([['handbook/domain/x.md', ['handbook/README.md', 'CLAUDE.md']]]),
      redirects: new Map(),
    });
    assert.equal(out.length, 1);
    assert.deepEqual(out[0]?.citedBy, ['CLAUDE.md', 'handbook/README.md']);
  });

  it('remover documento órfão passa — ninguém quebra', () => {
    const out = checkTombstones({
      removed: ['handbook/domain/orfao.md'],
      backlinks: backlinks([['handbook/outro.md', ['handbook/README.md']]]),
      redirects: new Map(),
    });
    assert.deepEqual(out, []);
  });

  it('redirect com destino declarado passa', () => {
    const out = checkTombstones({
      removed: ['handbook/domain/x.md'],
      backlinks: backlinks([['handbook/domain/x.md', ['handbook/README.md']]]),
      redirects: new Map([['handbook/domain/x.md', 'handbook/domain_questions/x.md']]),
    });
    assert.deepEqual(out, []);
  });

  it('lápide (to: null) passa — declarar a morte é o que o gate exige', () => {
    const out = checkTombstones({
      removed: ['handbook/domain/x.md'],
      backlinks: backlinks([['handbook/domain/x.md', ['handbook/README.md']]]),
      redirects: new Map<string, string | null>([['handbook/domain/x.md', null]]),
    });
    assert.deepEqual(out, []);
  });

  it('acusa cada removido separadamente', () => {
    const out = checkTombstones({
      removed: ['a.md', 'b.md', 'c.md'],
      backlinks: backlinks([
        ['a.md', ['x.md']],
        ['b.md', ['y.md']],
      ]),
      redirects: new Map(),
    });
    assert.deepEqual(
      out.map((v) => v.path),
      ['a.md', 'b.md'],
    );
  });
});

describe('TOMBSTONE — backlinks a partir do disco', () => {
  let root = '';

  before(() => {
    root = mkdtempSync(join(tmpdir(), 'tombstone-'));
    mkdirSync(join(root, 'handbook/sub'), { recursive: true });
    mkdirSync(join(root, '.claude'), { recursive: true });
    writeFileSync(join(root, 'handbook/alvo.md'), '# alvo\n');
    writeFileSync(join(root, 'handbook/cita.md'), 'veja [alvo](./alvo.md)\n');
    writeFileSync(join(root, 'handbook/sub/relativo.md'), 'sobe [alvo](../alvo.md)\n');
    // Citado de FORA do handbook — o caso que motivou varrer .claude/ e context/ também.
    writeFileSync(join(root, '.claude/regra.md'), 'ver [alvo](../handbook/alvo.md)\n');
    // Menção, não uso: em crase não conta e não deve travar remoção.
    writeFileSync(join(root, 'handbook/menciona.md'), 'exemplo: `[alvo](./alvo.md)`\n');
  });

  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('encontra quem cita, inclusive de fora do handbook e por caminho relativo', () => {
    const map = buildBacklinks(root);
    assert.deepEqual([...(map.get('handbook/alvo.md') ?? [])].sort(), [
      '.claude/regra.md',
      'handbook/cita.md',
      'handbook/sub/relativo.md',
    ]);
  });

  it('menção em crase não conta como citação', () => {
    const citers = buildBacklinks(root).get('handbook/alvo.md') ?? [];
    assert.equal(
      citers.includes('handbook/menciona.md'),
      false,
      'documento que só EXIBE a sintaxe não deve impedir a remoção do alvo',
    );
  });

  it('diretório de origem inexistente não quebra a varredura', () => {
    assert.doesNotThrow(() => buildBacklinks(root, ['handbook', 'nao-existe']));
  });
});

describe('TOMBSTONE — rename devolve o caminho ANTIGO (o que derrubou a 1ª reorganização)', () => {
  let repo = '';

  before(() => {
    repo = mkdtempSync(join(tmpdir(), 'tombstone-rename-'));
    const git = (...args: readonly string[]): void => {
      execFileSync('git', [...args], { cwd: repo, stdio: 'ignore' });
    };
    git('init', '--quiet');
    git('config', 'user.email', 'teste@exemplo.dev');
    git('config', 'user.name', 'Teste');
    mkdirSync(join(repo, 'todo'), { recursive: true });
    writeFileSync(join(repo, 'todo/card.md'), '# card\n');
    git('add', '.');
    git('commit', '--quiet', '-m', 'inicial');
    mkdirSync(join(repo, 'done'), { recursive: true });
    git('mv', 'todo/card.md', 'done/card.md');
  });

  after(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('reporta o caminho que deixou de existir, não o recém-criado', () => {
    // Com `--name-only`, o git devolve o DESTINO do rename: o gate lia o arquivo novo como
    // removido e recusava toda reorganização de pasta — inclusive a que preserva os links.
    assert.deepEqual(stagedRemovedMarkdown(repo), ['todo/card.md']);
  });
});

describe('TOMBSTONE — a mensagem', () => {
  it('diz o que fazer, com as duas saídas', () => {
    const v: readonly TombstoneViolation[] = [
      { path: 'handbook/domain/x.md', citedBy: ['handbook/README.md'] },
    ];
    const msg = formatViolations(v);
    assert.match(msg, /handbook\/domain\/x\.md/);
    assert.match(msg, /redirects\.json/);
    assert.match(msg, /"to": null/);
    assert.match(msg, /--no-verify/);
  });

  it('resume a lista longa em vez de despejar tudo', () => {
    const citedBy = Array.from({ length: 12 }, (_, i) => `f${String(i)}.md`);
    const msg = formatViolations([{ path: 'x.md', citedBy }]);
    assert.match(msg, /citado por 12 arquivo\(s\)/);
    assert.match(msg, /… e mais 7/);
  });
});
