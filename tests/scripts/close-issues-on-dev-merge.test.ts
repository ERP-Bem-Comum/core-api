/**
 * `fecha-issue-na-dev` — o conceito "issue fecha entrando na `dev`; a release é o ajuntamento que
 * fecha na `main`".
 *
 * A propriedade que estes testes protegem é **nenhum resultado silencioso**, e ela tem DOIS lados
 * de igual gravidade: fechar issue que o texto não mandou fechar, e deixar de fechar a que mandou.
 * O segundo é o mais traiçoeiro, porque não aparece nem no log — a referência que o extrator não
 * reconhece simplesmente não é mencionada.
 *
 * Quase todo caso abaixo é texto REAL de PR deste repositório, ou uma medição feita contra a API:
 *
 *   - "traslado do #983", "sucessor consolidado de #1052 e #1056" — menção, segue aberta;
 *   - "o defeito continua aberto, não corrigido" (#940) — negação, não fecha;
 *   - "Não houve regressão: fecha a #12" — negação de OUTRA coisa, tem de fechar;
 *   - `gh issue view 1061` devolve `MERGED` com exit 0 para um PULL REQUEST (gh 2.95.0).
 *
 * Estilo do workflow: asserção de ESTRUTURA sobre o texto do arquivo, sem parser YAML
 * (ADR-0011: zero dependência nova), no molde de `semgrep-workflow.test.ts`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  extractClosingRefs,
  stripQuotations,
  classifyProbe,
  isNotFound,
  closingComment,
} from '#scripts/ci/close-issues-on-dev-merge.ts';

const read = (rel: string): string =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8');

describe('extractClosingRefs — declarar fechamento', () => {
  it('reconhece a forma que este repositório de fato escreve', () => {
    assert.deepEqual(extractClosingRefs('Fecha a **#1059**. Dois commits.'), [1059]);
    assert.deepEqual(extractClosingRefs('Fecha também a **#993**.'), [993]);
  });

  it('reconhece as palavras-chave do GitHub em inglês', () => {
    assert.deepEqual(extractClosingRefs('Closes #12'), [12]);
    assert.deepEqual(extractClosingRefs('Fixes #7'), [7]);
    assert.deepEqual(extractClosingRefs('resolves #9'), [9]);
  });

  it('lê título e corpo como um texto só', () => {
    assert.deepEqual(extractClosingRefs('fix: o DV\n\nFecha a #816 e closes #820.'), [816, 820]);
  });
});

describe('extractClosingRefs — UM verbo governa a LISTA inteira', () => {
  // Capturar só a primeira é a pior falha do conjunto: o log imprime um fechamento, o autor conclui
  // que todas entraram, e as demais ficam abertas em silêncio.
  it('fecha todas as referências que compartilham o verbo', () => {
    assert.deepEqual(extractClosingRefs('Fecha as #816 e #820.'), [816, 820]);
    assert.deepEqual(extractClosingRefs('Fecha #816, #820 e #830.'), [816, 820, 830]);
    assert.deepEqual(extractClosingRefs('Fecha a #816 e a #820.'), [816, 820]);
    assert.deepEqual(extractClosingRefs('Closes #1, #2 and #3'), [1, 2, 3]);
  });

  it('devolve em ordem crescente e sem repetição', () => {
    assert.deepEqual(extractClosingRefs('fecha #30, closes #7 e fecha a #30 de novo'), [7, 30]);
  });
});

describe('extractClosingRefs — MENÇÃO não fecha', () => {
  it('ignora referência de contexto, que é a maioria real', () => {
    assert.deepEqual(extractClosingRefs('Sucessor consolidado de #1052 e #1056'), []);
    assert.deepEqual(extractClosingRefs('CNPJ alfanumérico (#863) — traslado do #983'), []);
    assert.deepEqual(extractClosingRefs('ver #930 e o que foi medido em #407'), []);
  });

  it('ignora `owner/repo#N`, que não é issue deste repositório', () => {
    assert.deepEqual(extractClosingRefs('fecha ERP-Bem-Comum/erp-infra#5'), []);
  });
});

describe('extractClosingRefs — negação ADJACENTE', () => {
  it('não fecha o que o texto declara ABERTO', () => {
    assert.deepEqual(extractClosingRefs('O defeito continua aberto: não fecha a #940'), []);
    assert.deepEqual(extractClosingRefs('contornado, nunca fecha #940'), []);
    assert.deepEqual(extractClosingRefs('Este PR ainda não resolve #59'), []);
  });

  it('negação de OUTRA coisa não impede o fechamento', () => {
    // Os três falhavam com a janela de 40 caracteres da primeira versão: não fechavam nada, e a
    // referência não aparecia no log. Falso negativo é tão silencioso quanto falso positivo.
    assert.deepEqual(extractClosingRefs('Não houve regressão: fecha a #12'), [12]);
    assert.deepEqual(extractClosingRefs('Mudança sem risco, fecha a #12'), [12]);
    assert.deepEqual(extractClosingRefs('Trabalho sem issue aberta e fecha a #12'), [12]);
    assert.deepEqual(extractClosingRefs('O contorno não serve. Fecha a #13.'), [13]);
  });
});

describe('stripQuotations — citação não é declaração', () => {
  it('ignora bloco de código, código inline e blockquote', () => {
    assert.deepEqual(extractClosingRefs('```\nFecha a #940\n```'), []);
    assert.deepEqual(extractClosingRefs('o corpo dizia `fecha a #940`'), []);
    assert.deepEqual(extractClosingRefs('> Fecha a #940\n\nmas não é o caso'), []);
  });

  it('a declaração FORA da citação continua valendo', () => {
    const texto = '> PR antigo: Fecha a #940\n\nFecha a #12.';
    assert.deepEqual(extractClosingRefs(texto), [12]);
  });

  it('remove o trecho citado, não o texto inteiro', () => {
    assert.match(stripQuotations('antes ```x``` depois'), /antes/u);
    assert.match(stripQuotations('antes ```x``` depois'), /depois/u);
    assert.doesNotMatch(stripQuotations('antes ```x``` depois'), /x/u);
  });
});

describe('classifyProbe — PR não é issue', () => {
  // ⚠️ `gh issue view 1061 --json state` devolve `MERGED` com exit 0 para um PULL REQUEST (medido
  // com gh 2.95.0). Só a chave `pull_request` da API distingue, e um PR ABERTO devolveria `OPEN` —
  // o script tentaria fechá-lo com um token que só tem `issues: write`.
  it('reconhece pull request pela chave da API', () => {
    assert.deepEqual(classifyProbe('MERGED|pr'), { tag: 'pull-request' });
    assert.deepEqual(classifyProbe('OPEN|pr'), { tag: 'pull-request' });
  });

  it('reconhece issue e normaliza o estado', () => {
    assert.deepEqual(classifyProbe('open|issue'), { tag: 'issue', state: 'OPEN' });
    assert.deepEqual(classifyProbe('CLOSED|issue'), { tag: 'issue', state: 'CLOSED' });
  });

  it('resposta sem state é INALCANÇÁVEL, nunca "não existe"', () => {
    assert.equal(classifyProbe('').tag, 'unreachable');
  });
});

describe('isNotFound — erro do autor vs defeito de infraestrutura', () => {
  // A primeira versão convertia QUALQUER falha em "não existe" e seguia verde: rate limit, 5xx e
  // token sem escopo fariam o job dizer que não havia nada a fechar.
  it('404 é erro do autor — segue', () => {
    assert.equal(isNotFound('gh: Not Found (HTTP 404)'), true);
    assert.equal(isNotFound('HTTP 404: Not Found'), true);
  });

  it('transporte, permissão e rate limit NÃO são 404 — têm de ficar vermelhos', () => {
    assert.equal(isNotFound('API rate limit exceeded'), false);
    assert.equal(isNotFound('HTTP 502: Bad Gateway'), false);
    assert.equal(isNotFound('HTTP 403: Resource not accessible by integration'), false);
    assert.equal(isNotFound('request failed: ECONNRESET'), false);
  });
});

describe('closingComment', () => {
  it('nomeia o PR e separa integrado de entregue', () => {
    const texto = closingComment('1062');
    assert.match(texto, /#1062/u, 'quem lê a issue precisa chegar ao PR que a integrou');
    assert.match(
      texto,
      /não está no ar/u,
      'o conceito inteiro depende de a issue NÃO afirmar entrega em produção',
    );
  });
});

describe('workflow fecha-issue-na-dev', () => {
  const yml = read('../../.github/workflows/close-issues-on-dev-merge.yml');

  it('dispara em PR FECHADO para a dev, e só quando houve merge', () => {
    assert.match(yml, /pull_request_target:/u);
    assert.match(yml, /types:\s*\[closed\]/u);
    assert.match(yml, /branches:\s*\[dev\]/u);
    assert.match(yml, /if:\s*github\.event\.pull_request\.merged\s*==\s*true/u);
  });

  it('pede issues: write e nada além de leitura no resto', () => {
    assert.match(yml, /issues:\s*write/u);
    assert.match(yml, /contents:\s*read/u);
    assert.doesNotMatch(
      yml,
      /pull-requests:\s*write/u,
      'não fecha PR — e o script recusa número de PR justamente por isso',
    );
  });

  it('faz checkout da BASE, nunca do código do PR', () => {
    assert.match(yml, /ref:\s*\$\{\{\s*github\.event\.pull_request\.base\.sha\s*\}\}/u);
    assert.doesNotMatch(yml, /ref:\s*\$\{\{\s*github\.event\.pull_request\.head/u);
  });

  it('tolera base.sha anterior ao próprio script, sem job vermelho falso', () => {
    // `base.sha` é o tip da `dev` ANTES do merge. Um PR mergeado enquanto BEHIND carrega um
    // base.sha anterior a este commit, onde o script ainda não existe — `node` morreria com
    // ERR_MODULE_NOT_FOUND e o vermelho não descreveria defeito nenhum.
    assert.match(yml, /if\s*\[\s*!\s*-f\s+scripts\/ci\/close-issues-on-dev-merge\.ts\s*\]/u);
  });

  it('toda action é pinada por SHA de 40 hex, nunca por tag (ADR-0011)', () => {
    const usos = [...yml.matchAll(/uses:\s*(\S+)/gu)].map((m) => m[1] ?? '');
    assert.ok(usos.length > 0, 'nenhum `uses:` encontrado — o teste ficaria verde por vacuidade');
    for (const uso of usos) {
      assert.match(uso, /@[0-9a-f]{40}$/u, `action não pinada por SHA: ${uso}`);
    }
  });

  it('declara o runtime por setup-node com node-version-file', () => {
    assert.match(yml, /actions\/setup-node@/u);
    assert.match(yml, /node-version-file:\s*\.nvmrc/u);
  });

  it('passa título e corpo por env, nunca interpolados no shell', () => {
    assert.match(yml, /PR_TITLE:\s*\$\{\{\s*github\.event\.pull_request\.title\s*\}\}/u);
    assert.match(yml, /PR_BODY:\s*\$\{\{\s*github\.event\.pull_request\.body\s*\}\}/u);
    const run = yml.slice(yml.indexOf('run: |'));
    assert.doesNotMatch(run, /\$\{\{\s*github\.event\.pull_request\.(title|body)/u);
  });

  it('não tem escape de gate', () => {
    assert.doesNotMatch(yml, /\|\|\s*true/u);
    assert.doesNotMatch(yml, /continue-on-error:\s*true/u);
  });
});
