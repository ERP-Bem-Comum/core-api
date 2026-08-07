/**
 * INQUIRY-HYGIENE — o acervo de investigação declara seu estado, e o índice bate com o disco.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Origem: levantamento de 2026-08-06 sobre as 29 inquiries. Dois defeitos, ambos de higiene:
 *
 *   1. SEIS rótulos de status ad-hoc no disco ("Decided", "Concluída", "Watch", "Deferred",
 *      "⚠️ OBSOLETA", "Open — aguardando…") contra os 7 canônicos que o README define — nenhum
 *      dos dois conjuntos casando com o outro. Status em prosa livre não é consultável: não dá
 *      para perguntar "o que está aberto?" a um campo que cada arquivo preenche do seu jeito.
 *   2. O INDEX.md contava 8 abertas e o disco tinha 9. Índice mantido à mão diverge — foi assim
 *      que a colisão de numeração que o `handbook-numbering` hoje barra passou despercebida.
 *
 * A correção foi frontmatter YAML com estado de um conjunto FECHADO (modelo dos estados de RFD
 * da Oxide, reduzido aos cinco que este repositório usa). Este teste é o que impede a volta ao
 * estado anterior: rótulo novo inventado falha, e arquivo fora do índice falha.
 *
 * TERCEIRO DEFEITO, encontrado em 2026-08-07: o `PERGUNTAS-EM-ABERTO.md` — o checklist executivo
 * de "o que ainda espera resposta" — passou TRÊS MESES divergindo do disco sem que nada acusasse.
 * Cobria 4 inquiries quando 8 estavam abertas; ainda descrevia como pendente uma pergunta que um
 * ADR havia fechado; e apontava para uma inquiry que nunca existiu. O INDEX.md não tinha esse
 * problema porque este arquivo já o cobria — a lição é que índice sem gate apodrece, e a correção
 * é a mesma: cobrar a propriedade em vez de confiar na disciplina.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  readInquiries,
  renderIndex,
  renderCounts,
  applyGeneratedRegion,
  countOpenQuestions,
} from '../../scripts/handbook/inquiry-index.ts';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const DIR = resolve(HERE, '..', '..', 'handbook/inquiries');

/** Conjunto FECHADO. Um estado novo exige editar este teste — que é o ponto. */
const STATES = ['open', 'blocked', 'decided', 'deferred', 'superseded'] as const;

/** Os dois estados que ainda esperam resposta de alguém — os que o checklist executivo cobre. */
const AWAITING = ['open', 'blocked'] as const;

/**
 * Janela de frescor, em dias, para inquiry que ainda espera resposta (Fase 6 da spec 041).
 *
 * 90 dias não é arbitrário: as inquiries 0011 e 0012 esperam a MESMA banca interna desde maio de
 * 2026, e ninguém percebeu porque `last_reviewed` era um campo que as 29 inquiries preenchiam e
 * nada lia. A janela é generosa de propósito — inquiry bloqueada em terceiro não anda por vontade
 * própria, e um alarme mensal viraria ruído que se aprende a silenciar.
 *
 * Revisar NÃO é carimbar a data. É reler e responder: ainda está bloqueada pelo mesmo motivo? o
 * terceiro ainda é o mesmo? a pergunta ainda faz sentido? Se a resposta a alguma for "não", o
 * trabalho é editar a inquiry — a data é consequência, não o objetivo.
 */
const REVIEW_WINDOW_DAYS = 90;

const CHECKLIST = 'PERGUNTAS-EM-ABERTO.md';

const files = (): readonly string[] =>
  readdirSync(DIR)
    .filter((f) => /^\d{4}-.*\.md$/.test(f))
    .sort();

const frontmatter = (file: string): Record<string, string> => {
  const raw = readFileSync(join(DIR, file), 'utf-8');
  const m = /^---\n([\s\S]*?)\n---/.exec(raw);
  if (m === null) return {};
  const out: Record<string, string> = {};
  for (const line of (m[1] ?? '').split('\n')) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv?.[1] !== undefined) out[kv[1]] = (kv[2] ?? '').trim();
  }
  return out;
};

describe('INQUIRY-HYGIENE — cada inquiry declara um estado consultável', () => {
  it('toda inquiry tem frontmatter com inquiry, title e state', () => {
    const bad = files()
      .filter((f) => {
        const fm = frontmatter(f);
        return (
          fm['inquiry'] === undefined || fm['title'] === undefined || fm['state'] === undefined
        );
      })
      .sort();
    assert.deepEqual(
      bad,
      [],
      'inquiry sem frontmatter completo — o estado volta a ser prosa livre, e "o que está aberto?" deixa de ter resposta:\n' +
        bad.join('\n'),
    );
  });

  it('todo state pertence ao conjunto fechado', () => {
    const bad = files()
      .map((f) => ({ f, s: frontmatter(f)['state'] }))
      .filter((x) => x.s !== undefined && !STATES.includes(x.s as (typeof STATES)[number]))
      .map((x) => `${x.f}: "${x.s ?? ''}"`)
      .sort();
    assert.deepEqual(
      bad,
      [],
      `state fora de [${STATES.join(', ')}] — foi exatamente assim que seis rótulos ad-hoc nasceram:\n` +
        bad.join('\n'),
    );
  });

  it('o prefixo do arquivo casa com o campo inquiry', () => {
    const bad = files()
      .filter((f) => frontmatter(f)['inquiry'] !== f.slice(0, 4))
      .sort();
    assert.deepEqual(bad, [], 'frontmatter e nome do arquivo divergem:\n' + bad.join('\n'));
  });

  it('a varredura enxerga o acervo (guarda contra verde por vacuidade)', () => {
    assert.ok(
      files().length >= 25,
      `só ${files().length} inquiries encontradas — o glob quebrou e este arquivo passaria sem verificar nada`,
    );
  });
});

/**
 * O `INDEX.md` e o cabeçalho do checklist passaram a ser GERADOS (Fase 1 da spec 041), então as três
 * asserções que viviam aqui — toda inquiry tem linha, uma linha por inquiry, nenhuma linha órfã —
 * deixaram de ser verificações e viraram propriedades do gerador. Elas continuam cobradas, mas em
 * `tests/scripts/inquiry-index.test.ts`, contra fixture, onde é possível provocá-las.
 *
 * O que sobra aqui é a única pergunta que o disco ainda pode responder errado: o derivado commitado
 * é o que o gerador produz hoje? Sem isto, editar o índice à mão volta a passar em silêncio.
 */
describe('INQUIRY-HYGIENE — o que espera resposta não envelhece em silêncio', () => {
  const awaiting = (): readonly string[] =>
    files().filter((f) => {
      const s = frontmatter(f)['state'];
      return s !== undefined && AWAITING.includes(s as (typeof AWAITING)[number]);
    });

  /** Dias corridos entre a data ISO e hoje. Negativo se a data está no futuro. */
  const daysSince = (iso: string): number => (Date.now() - Date.parse(iso)) / 86_400_000;

  it(`toda inquiry open/blocked foi revisada nos últimos ${String(REVIEW_WINDOW_DAYS)} dias`, () => {
    const stale = awaiting()
      .map((f) => ({ f, reviewed: frontmatter(f)['last_reviewed'] }))
      .filter((x) => x.reviewed === undefined || daysSince(x.reviewed) > REVIEW_WINDOW_DAYS)
      .map((x) => `${x.f} (last_reviewed: ${x.reviewed ?? 'AUSENTE'})`)
      .sort();
    assert.deepEqual(
      stale,
      [],
      `inquiry esperando resposta há mais de ${String(REVIEW_WINDOW_DAYS)} dias sem revisão.\n\n` +
        'Isto NÃO se resolve carimbando a data. Releia e responda: continua bloqueada pelo mesmo\n' +
        'motivo? o terceiro ainda é o mesmo? a pergunta ainda faz sentido? Se alguma resposta for\n' +
        '"não", edite a inquiry — e então atualize `last_reviewed`. Se a inquiry morreu de vez,\n' +
        'o estado certo é `decided`, `deferred` (com gatilho) ou `superseded`.\n\n' +
        stale.join('\n'),
    );
  });

  it('last_reviewed não está no futuro', () => {
    // O jeito óbvio de burlar a janela é carimbar uma data adiante e ganhar meses de silêncio.
    // Barato de checar, e a ausência da checagem é o que transforma o gate em teatro.
    const future = files()
      .map((f) => ({ f, reviewed: frontmatter(f)['last_reviewed'] }))
      .filter((x) => x.reviewed !== undefined && daysSince(x.reviewed) < -1)
      .map((x) => `${x.f} (last_reviewed: ${x.reviewed ?? ''})`)
      .sort();
    assert.deepEqual(
      future,
      [],
      'last_reviewed no futuro — revisão que ainda não aconteceu não conta como revisão:\n' +
        future.join('\n'),
    );
  });
});

describe('INQUIRY-HYGIENE — os derivados estão em dia', () => {
  it('o INDEX.md commitado é exatamente o que o gerador produz', () => {
    assert.equal(
      readFileSync(join(DIR, 'INDEX.md'), 'utf-8'),
      renderIndex(readInquiries(DIR)),
      'INDEX.md divergente do gerador — rode `pnpm run docs:index` e commite o resultado. ' +
        'Editar o índice à mão é o que este gate existe para impedir.',
    );
  });

  it('a região gerada do checklist está em dia', () => {
    const file = join(DIR, 'PERGUNTAS-EM-ABERTO.md');
    const current = readFileSync(file, 'utf-8');
    assert.equal(
      current,
      applyGeneratedRegion(current, renderCounts(readInquiries(DIR), countOpenQuestions(current))),
      'cabeçalho do PERGUNTAS-EM-ABERTO.md divergente — rode `pnpm run docs:index`.',
    );
  });
});

describe('INQUIRY-HYGIENE — o checklist executivo cobre o que ainda espera resposta', () => {
  const doc = (): string => readFileSync(join(DIR, CHECKLIST), 'utf-8');

  /**
   * Um bloco é uma SEÇÃO (`## Inquiry-0011 — …`), nunca uma menção. O checklist cita 0013 e 0018
   * em prosa de propósito — como referência cruzada, não como cobertura. Um `includes('0013')`
   * leria a citação como bloco e ficaria verde sobre um documento que não cobre nada: é a
   * confusão uso × menção que já produziu falso-verde neste repositório mais de uma vez.
   */
  const blocks = (): ReadonlyMap<string, string> => {
    const text = doc();
    const heads = [...text.matchAll(/^## Inquiry-(\d{4})\b/gm)];
    const out = new Map<string, string>();
    for (let i = 0; i < heads.length; i += 1) {
      const id = heads[i]?.[1];
      if (id === undefined) continue;
      out.set(id, text.slice(heads[i]?.index ?? 0, heads[i + 1]?.index ?? text.length));
    }
    return out;
  };

  /** As inquiries que, pelo frontmatter, ainda esperam resposta de alguém. */
  const awaiting = (): readonly string[] =>
    files()
      .filter((f) => {
        const s = frontmatter(f)['state'];
        return s !== undefined && AWAITING.includes(s as (typeof AWAITING)[number]);
      })
      .map((f) => f.slice(0, 4))
      .sort();

  /** O número que a tabela de visão geral declara na coluna final de cada linha. */
  const declared = (): ReadonlyMap<string, number> => {
    const out = new Map<string, number>();
    for (const m of doc().matchAll(/^\| \[(\d{4})\]\(#[^)]*\) \|.*\|\s*(\d+)\s*\|$/gm)) {
      const [, id, n] = m;
      if (id !== undefined && n !== undefined) out.set(id, Number(n));
    }
    return out;
  };

  const openBoxes = (body: string): number => (body.match(/^- \[ \]/gm) ?? []).length;

  it('toda inquiry open/blocked tem bloco próprio no checklist', () => {
    const covered = blocks();
    const missing = awaiting().filter((id) => !covered.has(id));
    assert.deepEqual(
      missing,
      [],
      `inquiry esperando resposta e ausente do ${CHECKLIST} — foi assim que ele cobriu 4 de 8 por três meses:\n` +
        missing.join('\n'),
    );
  });

  it('o checklist não guarda bloco de inquiry já resolvida', () => {
    const open = new Set(awaiting());
    const stale = [...blocks().keys()].filter((id) => !open.has(id)).sort();
    assert.deepEqual(
      stale,
      [],
      'bloco de inquiry que não está mais open/blocked — checklist que não esvazia deixa de ser ' +
        'checklist (a 0003 ficou aqui 2 meses depois de decidida):\n' +
        stale.join('\n'),
    );
  });

  it('todo bloco linka a inquiry-fonte, e ela existe no disco', () => {
    const bad: string[] = [];
    for (const [id, body] of blocks()) {
      const link = new RegExp(`\\]\\(\\./(${id}-[^)\\s#]+\\.md)\\)`).exec(body);
      if (link === null) {
        bad.push(`${id}: bloco sem link para a inquiry-fonte`);
        continue;
      }
      const target = link[1];
      if (target !== undefined && !files().includes(target)) {
        bad.push(`${id}: aponta para ${target}, que não existe`);
      }
    }
    assert.deepEqual(
      bad,
      [],
      'link morto ou ausente — a versão anterior apontava para uma inquiry que nunca existiu:\n' +
        bad.join('\n'),
    );
  });

  it('a contagem de cada linha da visão geral bate com os checkboxes do bloco', () => {
    const say = declared();
    const bad = [...blocks()]
      .map(([id, body]) => ({ id, said: say.get(id), real: openBoxes(body) }))
      .filter((x) => x.said !== x.real)
      .map((x) => `${x.id}: tabela diz ${String(x.said ?? 'nada')}, bloco tem ${x.real}`)
      .sort();
    assert.deepEqual(bad, [], 'visão geral divergindo do corpo do documento:\n' + bad.join('\n'));
  });

  // A asserção "o total do topo é a soma dos blocos" morreu aqui na Fase 1 da spec 041: o total
  // passou a ser GERADO a partir dessa mesma soma, então testá-lo comparava o gerador consigo
  // mesmo. Tautologia em suíte é pior que ausência — custa tempo e dá sensação de cobertura.
  // O que protege o número agora é o gate de derivado em dia, acima.

  it('a varredura enxerga blocos (guarda contra verde por vacuidade)', () => {
    assert.ok(
      blocks().size >= 1 && awaiting().length >= 1,
      'nenhum bloco ou nenhuma inquiry aberta encontrada — as asserções acima passariam sem ' +
        'verificar nada. Se o acervo zerou de verdade, este é o lugar de registrar isso.',
    );
  });
});
