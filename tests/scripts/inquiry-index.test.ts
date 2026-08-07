/**
 * INQUIRY-INDEX — o gerador do índice de inquiries (Fase 1 da spec 041).
 *
 * Estas asserções são as que viviam em `tests/cleanup/inquiry-hygiene.test.ts` cobrando o INDEX.md
 * escrito à mão: toda inquiry tem linha, uma linha por inquiry, nenhuma linha órfã. Com o índice
 * gerado elas deixaram de ser verificáveis lá — um arquivo derivado sempre passa —, mas continuam
 * sendo exatamente o que pode dar errado NO GERADOR. Aqui há fixture, e dá para provocá-las.
 *
 * O caso histórico que a terceira asserção protege: o gerador anterior (mantido à mão) colapsou 4
 * arquivos numa linha só, e o teste da época ficou verde porque todos os nomes seguiam presentes
 * no texto.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  parseFrontmatter,
  renderIndex,
  renderCounts,
  applyGeneratedRegion,
  countOpenQuestions,
  type Inquiry,
} from '../../scripts/handbook/inquiry-index.ts';

const inquiry = (over: Partial<Inquiry> = {}): Inquiry => ({
  id: '0001',
  file: '0001-alguma-coisa.md',
  title: 'Alguma coisa',
  state: 'open',
  opened: '2026-01-01',
  decided: '',
  ...over,
});

const FIXTURE: readonly Inquiry[] = [
  inquiry(),
  inquiry({ id: '0002', file: '0002-outra.md', title: 'Outra', state: 'blocked' }),
  inquiry({
    id: '0003',
    file: '0003-fechada.md',
    title: 'Fechada',
    state: 'decided',
    decided: '2026-02-02',
  }),
];

describe('INQUIRY-INDEX — frontmatter', () => {
  it('desembrulha aspas e descarta comentário inline', () => {
    const fm = parseFrontmatter('---\ntitle: "Com aspas"\nopen_outputs: 3  # migrar\n---\ncorpo');
    assert.equal(fm['title'], 'Com aspas');
    assert.equal(fm['open_outputs'], '3');
  });

  it('arquivo sem frontmatter não explode', () => {
    assert.deepEqual(parseFrontmatter('# só um título'), {});
  });
});

describe('INQUIRY-INDEX — o índice gerado', () => {
  const rows = (md: string): readonly string[] =>
    [...md.matchAll(/^\| \[(\d{4})\]\(\.\/(\d{4}-[^)\s]+\.md)\) \|/gm)]
      .map((m) => m[2])
      .filter((f): f is string => f !== undefined);

  it('toda inquiry ganha uma linha própria', () => {
    assert.deepEqual(rows(renderIndex(FIXTURE)), [
      '0001-alguma-coisa.md',
      '0002-outra.md',
      '0003-fechada.md',
    ]);
  });

  it('uma linha por inquiry — nunca colapsa duas na mesma', () => {
    assert.equal(rows(renderIndex(FIXTURE)).length, FIXTURE.length);
  });

  it('não cita arquivo que não veio do disco', () => {
    const cited = [...renderIndex(FIXTURE).matchAll(/\]\(\.\/(\d{4}-[^)\s#]+\.md)\)/g)].map(
      (m) => m[1],
    );
    const known = new Set(FIXTURE.map((i) => i.file));
    assert.deepEqual(
      cited.filter((f) => f !== undefined && !known.has(f)),
      [],
    );
  });

  it('agrupa por estado e omite seção vazia', () => {
    const md = renderIndex(FIXTURE);
    assert.match(md, /🟢 Em investigação/);
    assert.match(md, /⛔ Bloqueadas/);
    assert.match(md, /✅ Decididas/);
    assert.doesNotMatch(md, /♻️ Revisadas/, 'seção sem inquiry não deve ser emitida');
  });

  it('não carimba data de geração — derivado com data acende o gate sozinho amanhã', () => {
    assert.doesNotMatch(renderIndex(FIXTURE), /\d{4}-\d{2}-\d{2}\./);
  });
});

describe('INQUIRY-INDEX — a região gerada do checklist', () => {
  it('conta só as inquiries que esperam resposta', () => {
    const out = renderCounts(FIXTURE, 9);
    assert.match(out, /\*\*Inquiries cobertas:\*\* 2 de 3/);
    assert.match(out, /\*\*Total de perguntas em aberto:\*\* \*\*9\*\*/);
  });

  it('substitui só o miolo marcado, preservando a prosa em volta', () => {
    const doc = 'ANTES\n<!-- BEGIN:generated -->\nvelho\n<!-- END:generated -->\nDEPOIS';
    const out = applyGeneratedRegion(doc, '<!-- BEGIN:generated -->\nnovo\n<!-- END:generated -->');
    assert.equal(out, 'ANTES\n<!-- BEGIN:generated -->\nnovo\n<!-- END:generated -->\nDEPOIS');
  });

  it('documento sem marcadores volta intacto', () => {
    assert.equal(applyGeneratedRegion('sem marcador', 'qualquer coisa'), 'sem marcador');
  });

  it('conta checkbox aberto, ignorando o resolvido', () => {
    assert.equal(countOpenQuestions('- [ ] a\n- [x] b\n- [ ] c\ntexto'), 2);
  });
});
