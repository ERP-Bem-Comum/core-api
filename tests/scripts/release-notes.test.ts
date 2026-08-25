/**
 * RELEASE-NOTES — o CHANGELOG erra para MOSTRAR, nunca para esconder.
 *
 * Origem: a release `1.0.0-rc.1`, primeira do repositório. O gerador precisou existir porque um
 * CHANGELOG redigido à mão vira registro que mente sobre o código na semana seguinte — e a release
 * que ele descreve é a que a P.O. lê para decidir o CA0 da #873.
 *
 * A propriedade que esta suíte trava não é a classificação de cada commit: é a ASSIMETRIA da regra.
 * Quando a classificação está em dúvida — tipo ambíguo, escopo desconhecido, escopo ausente — a
 * entrada aparece em seção visível. Uma release pode dar-se ao luxo de mostrar ruído; não pode
 * dar-se ao luxo de omitir que uma rota de download de dado bancário passou a existir em produção
 * porque quem commitou escreveu `chore` (PR #855, e está neste range).
 *
 * O segundo invariante é o descarte visível: o que o parser não classifica sai NOMEADO no documento.
 * Sem isso o leitor não teria como suspeitar que a lista está incompleta — a forma mais cara de
 * registro mentiroso é a que não deixa sintoma.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseEntry,
  sectionFor,
  renderChangelog,
  repoUrlFrom,
  type ReleaseEntry,
} from '#scripts/ci/release-notes.ts';

function entry(over: Partial<ReleaseEntry> = {}): ReleaseEntry {
  return {
    sha: 'abc1234def',
    pr: 1,
    type: 'chore',
    scope: null,
    description: 'algo',
    breaking: false,
    ...over,
  };
}

describe('parseEntry — as duas estratégias de merge do histórico', () => {
  it('merge commit: o nº do PR vem do assunto e a mensagem vem do corpo', () => {
    const parsed = parseEntry(
      'aaa111',
      'Merge pull request #872 from ERP-Bem-Comum/fix/cnab-p013',
      'fix(cnab): P013 sai da forma do lote',
    );
    assert.deepEqual(parsed, {
      sha: 'aaa111',
      pr: 872,
      type: 'fix',
      scope: 'cnab',
      description: 'P013 sai da forma do lote',
      breaking: false,
    });
  });

  it('squash: a mensagem É o assunto, e o "(#N)" do fim não se repete na descrição', () => {
    const parsed = parseEntry('bbb222', 'fix(reports): gráficos sob collaborator:read (#499)', '');
    assert.equal(parsed?.pr, 499);
    assert.equal(parsed?.description, 'gráficos sob collaborator:read');
    assert.ok(
      !(parsed?.description ?? '').includes('#499'),
      'o nº vira link no render; mantê-lo no texto o imprimiria duas vezes',
    );
  });

  it('entrega consolidada: acha o cabeçalho convencional mesmo depois de prosa', () => {
    const parsed = parseEntry(
      'ccc333',
      'Merge pull request #835 from ERP-Bem-Comum/chore/integra',
      'Entrega consolidada das frentes abertas.\n\nfeat(financial): reserva sob lock',
    );
    assert.equal(parsed?.type, 'feat');
    assert.equal(parsed?.scope, 'financial');
  });

  it('sem nenhuma linha convencional, devolve null em vez de chutar um tipo', () => {
    assert.equal(parseEntry('ddd444', 'Merge branch dev into x', 'Prosa pura, sem tipo.'), null);
  });

  it('reconhece a quebra de contrato tanto por "!" quanto por BREAKING CHANGE no corpo', () => {
    assert.equal(parseEntry('e1', 'feat(financial)!: muda o PATCH (#825)', '')?.breaking, true);
    assert.equal(
      parseEntry(
        'e2',
        'feat(financial): muda o PATCH (#825)',
        'BREAKING CHANGE: dueDate obrigatório',
      )?.breaking,
      true,
    );
  });
});

describe('sectionFor — na dúvida, mostra', () => {
  it('quebra de contrato vence o tipo do commit, seja ele qual for', () => {
    for (const type of ['feat', 'fix', 'chore', 'docs', 'test']) {
      assert.equal(
        sectionFor(entry({ type, scope: 'harness', breaking: true })),
        'Alterado',
        `${type} marcado breaking precisa sair em seção visível`,
      );
    }
  });

  it('feat e fix vão para as seções canônicas', () => {
    assert.equal(sectionFor(entry({ type: 'feat' })), 'Adicionado');
    assert.equal(sectionFor(entry({ type: 'fix' })), 'Corrigido');
  });

  it('revert é Alterado: desfaz comportamento publicado, não corrige defeito nem adiciona', () => {
    assert.equal(sectionFor(entry({ type: 'revert', scope: 'financial' })), 'Alterado');
  });

  // O caso que motivou a regra inteira. PR #855, e está no range desta release.
  it('chore em escopo de NEGÓCIO é visível — o tipo diz "interno" e o escopo desmente', () => {
    assert.equal(sectionFor(entry({ type: 'chore', scope: 'financial' })), 'Alterado');
    assert.equal(sectionFor(entry({ type: 'chore', scope: 'auth' })), 'Alterado');
  });

  it('chore em escopo de PROCESSO é interno', () => {
    // `pipeline` é o escopo de chore mais frequente do range (11) e descreve o harness W0→W3 removido
    // em 2026-08-06. Escapou da primeira medição porque os merges que o carregam são squash, e o
    // parser ainda não lia o assunto — o mesmo defeito, achado duas vezes.
    for (const scope of ['harness', 'handbook', 'ci', 'ts', 'lint', 'deploy', 'pipeline']) {
      assert.equal(sectionFor(entry({ type: 'chore', scope })), 'Interno', scope);
    }
  });

  it('docs e test são internos mesmo em escopo de negócio — não mudam comportamento', () => {
    assert.equal(sectionFor(entry({ type: 'docs', scope: 'financial' })), 'Interno');
    assert.equal(sectionFor(entry({ type: 'test', scope: 'financial' })), 'Interno');
    assert.equal(sectionFor(entry({ type: 'refactor', scope: 'financial' })), 'Interno');
  });

  /**
   * A assimetria, provada nos dois lados. Ela é o invariante: a lista enumerada é a de PROCESSO, de
   * modo que o desconhecido caia do lado visível. Uma lista de NEGÓCIO produziria o oposto — módulo
   * novo ausente dela sumiria da release em silêncio.
   */
  it('escopo desconhecido e escopo ausente caem do lado visível, nunca em Interno', () => {
    assert.equal(
      sectionFor(entry({ type: 'chore', scope: 'modulo-que-ainda-nao-existe' })),
      'Alterado',
    );
    assert.equal(sectionFor(entry({ type: 'chore', scope: null })), 'Alterado');
    assert.equal(sectionFor(entry({ type: 'tipo-novo-qualquer', scope: null })), 'Alterado');
  });
});

describe('renderChangelog — o documento não esconde o que não soube classificar', () => {
  it('entrada breaking sai UMA vez, na seção de destaque', () => {
    const md = renderChangelog('1.0.0-rc.1', '2026-08-25', [
      entry({
        type: 'feat',
        scope: 'financial',
        description: 'muda o PATCH',
        breaking: true,
        pr: 825,
      }),
    ]);
    const occurrences = md.split('muda o PATCH').length - 1;
    assert.equal(
      occurrences,
      1,
      'repetir na seção temática é ruído onde o leitor precisa de sinal',
    );
    assert.match(md, /### ⚠️ Mudanças incompatíveis/u);
  });

  it('os merges não classificados aparecem NOMEADOS no documento, não só no stderr', () => {
    const md = renderChangelog('1.0.0-rc.1', '2026-08-25', [entry({ type: 'feat' })], {
      skipped: [
        {
          sha: 'b0c63e6f1122',
          subject: 'Merge pull request #835 from ERP-Bem-Comum/chore/integra',
        },
      ],
    });
    assert.match(md, /### Não classificado/u);
    assert.match(md, /b0c63e6f/u);
    assert.match(md, /#835/u);
  });

  it('sem descartes, a seção de não classificados não existe', () => {
    const md = renderChangelog('1.0.0-rc.1', '2026-08-25', [entry({ type: 'feat' })], {
      skipped: [],
    });
    assert.ok(!md.includes('Não classificado'));
  });

  it('o link do PR usa a URL passada, não uma constante do gerador', () => {
    const md = renderChangelog('1.0.0-rc.1', '2026-08-25', [entry({ type: 'feat', pr: 42 })], {
      repoUrl: 'https://github.com/exemplo/outro-repo',
    });
    assert.match(md, /\(\[#42\]\(https:\/\/github\.com\/exemplo\/outro-repo\/pull\/42\)\)/u);
  });

  it('carimba a versão e a data recebidas — a data é a do commit, não a do relógio', () => {
    const md = renderChangelog('1.0.0-rc.1', '2026-08-25', [entry({ type: 'feat' })]);
    assert.match(md, /## \[1\.0\.0-rc\.1\] — 2026-08-25/u);
  });
});

/**
 * O endereço do repositório vive no `package.json`, não numa constante do gerador. Duplicá-lo em
 * dois arquivos é como o segundo passa a mentir no dia em que o primeiro muda — o mesmo mecanismo
 * que este gerador existe para evitar no CHANGELOG.
 */
describe('repoUrlFrom — a URL de link sai do manifesto', () => {
  it('descasca a convenção de clone: `git+` na frente e `.git` no fim', () => {
    assert.equal(
      repoUrlFrom('git+https://github.com/ERP-Bem-Comum/core-api.git'),
      'https://github.com/ERP-Bem-Comum/core-api',
    );
  });

  it('deixa intacta a URL que já é navegável', () => {
    assert.equal(
      repoUrlFrom('https://github.com/ERP-Bem-Comum/core-api'),
      'https://github.com/ERP-Bem-Comum/core-api',
    );
  });

  it('cai no fallback quando o manifesto não declara repository', () => {
    for (const ausente of [undefined, null, '', '   ', 42, {}]) {
      assert.equal(repoUrlFrom(ausente), 'https://github.com/ERP-Bem-Comum/core-api');
    }
  });
});
