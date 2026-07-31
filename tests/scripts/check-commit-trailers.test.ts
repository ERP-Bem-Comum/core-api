/**
 * ASSISTED-BY-TRAILER-CHECK (#549) — W0 RED.
 *
 * Enforcement mecânico da ADR-0054 §1 (formato do trailer `Assisted-by`) via check de CI, no
 * modelo LABEL-GATED (decisão do dono, 2026-07-24):
 *   - PR com label `ai-assisted` → TODO commit do range deve ter `Assisted-by` bem-formado.
 *   - PR sem a label → só valida o FORMATO quando o trailer está presente (não exige presença;
 *     um commit humano puro legitimamente não tem o trailer).
 *
 * Testa a função PURA `checkCommitTrailers` (o parsing de git fica no `main()`, glue fina). RED
 * agora porque `scripts/ci/check-commit-trailers.ts` ainda não existe.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkCommitTrailers } from '../../scripts/ci/check-commit-trailers.ts';

describe('checkCommitTrailers — presença (label-gated)', () => {
  it('CA1: PR ai-assisted + commit sem Assisted-by → violação missing-assisted-by', () => {
    const v = checkCommitTrailers([{ sha: 'abc123', assistedBy: [] }], { aiAssisted: true });
    assert.equal(v.length, 1);
    assert.equal(v[0]?.kind, 'missing-assisted-by');
    assert.equal(v[0]?.sha, 'abc123');
  });

  it('CA2: PR ai-assisted + todos com Assisted-by bem-formado → sem violação', () => {
    const v = checkCommitTrailers([{ sha: 'abc', assistedBy: ['Claude-Code:claude-opus-4-8'] }], {
      aiAssisted: true,
    });
    assert.deepEqual(v, []);
  });

  it('CA4: PR sem label + commit sem Assisted-by → sem violação (não exige presença)', () => {
    const v = checkCommitTrailers([{ sha: 'abc', assistedBy: [] }], { aiAssisted: false });
    assert.deepEqual(v, []);
  });
});

describe('checkCommitTrailers — merge commit não é autoria (ADR-0054 §1)', () => {
  // O ADR-0054 §1 exige o trailer em "todo commit cujo CONTEÚDO foi gerado ou materialmente
  // modificado por um assistente de IA". Um merge commit não gera nem modifica conteúdo — integra
  // duas linhas de história. Exigir trailer dele é o gate ser mais restritivo que a norma, e quebra
  // qualquer PR atualizado pelo botão "Update branch" do GitHub (que gera o merge sem trailer).
  it('CA7: merge commit sem Assisted-by → sem violação, mesmo com label ai-assisted', () => {
    const v = checkCommitTrailers([{ sha: 'merge01', assistedBy: [], parentCount: 2 }], {
      aiAssisted: true,
    });
    assert.deepEqual(v, []);
  });

  it('CA8: commit normal sem Assisted-by continua violando (a isenção é só do merge)', () => {
    const v = checkCommitTrailers([{ sha: 'plain01', assistedBy: [], parentCount: 1 }], {
      aiAssisted: true,
    });
    assert.equal(v.length, 1);
    assert.equal(v[0]?.kind, 'missing-assisted-by');
  });

  it('CA9: merge commit COM trailer malformado ainda viola formato', () => {
    const v = checkCommitTrailers([{ sha: 'merge02', assistedBy: ['Foo'], parentCount: 2 }], {
      aiAssisted: true,
    });
    assert.equal(v.length, 1);
    assert.equal(v[0]?.kind, 'malformed-assisted-by');
  });
});

describe('checkCommitTrailers — formato (sempre, independe da label)', () => {
  it('CA3: Assisted-by malformado (sem :MODEL) → violação malformed, mesmo sem label', () => {
    const v = checkCommitTrailers([{ sha: 'abc', assistedBy: ['Foo'] }], { aiAssisted: false });
    assert.equal(v.length, 1);
    assert.equal(v[0]?.kind, 'malformed-assisted-by');
    assert.equal(v[0]?.detail, 'Foo');
  });

  it('CA5: formato com [ferramenta] opcional → ok', () => {
    const v = checkCommitTrailers(
      [{ sha: 'abc', assistedBy: ['Kimi-Code:kimi-k2 [coccinelle]'] }],
      {
        aiAssisted: true,
      },
    );
    assert.deepEqual(v, []);
  });

  it('CA6: múltiplos Assisted-by, um malformado → 1 violação apontando o valor', () => {
    const v = checkCommitTrailers(
      [{ sha: 'abc', assistedBy: ['Claude-Code:claude-opus-4-8', 'bad'] }],
      { aiAssisted: true },
    );
    assert.equal(v.length, 1);
    assert.equal(v[0]?.kind, 'malformed-assisted-by');
    assert.equal(v[0]?.detail, 'bad');
  });
});
