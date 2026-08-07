/**
 * HANDBOOK-LINKS — todo link do handbook está endereçado (Fase 4 da spec 041).
 *
 * Origem: a medição de 2026-08-07 encontrou 137 links autorais apontando para o vazio. O caso mais
 * caro foi `handbook/domain/`, que deixou de existir num commit levando 59 referências junto — três
 * meses sem ninguém perceber, e metade delas impossível de consertar, porque vive em ADR imutável.
 *
 * POR QUE ESTE GATE SÓ NASCE AGORA, e não junto do scanner: ligar com 137 em aberto obrigaria a
 * violar o ADR-0057 §5 para ficar verde. Um gate que só se satisfaz com a quebra de um invariante
 * não é gate — é armadilha. As Fases 3 e 4 endereçaram o estoque primeiro; este teste é o que
 * impede a volta.
 *
 * "Endereçado" tem quatro saídas, e nenhuma delas é "consertar o link":
 *   live        — o alvo existe
 *   redirected  — `handbook/redirects.json` dá um destino vivo
 *   tombstoned  — o mesmo arquivo declara a morte, com motivo e data
 *   historical  — aparato expurgado, protegido pelo ADR-0057 §5
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  scanHandbook,
  loadRedirects,
  HISTORICAL_PREFIXES,
} from '../../scripts/handbook/link-scan.ts';

const PROJECT_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

const scan = () => scanHandbook(PROJECT_ROOT, { redirects: loadRedirects(PROJECT_ROOT) });

describe('HANDBOOK-LINKS — nenhum link autoral aponta para o vazio', () => {
  it('zero links não endereçados', () => {
    const dead = (scan().get('unaddressed') ?? []).map((l) => `${l.from} → ${l.raw}`).sort();
    assert.deepEqual(
      dead,
      [],
      'link do handbook sem destino, sem redirect e sem lápide.\n\n' +
        'Quatro saídas, nesta ordem de preferência:\n' +
        '  1. corrigir o link, se o documento que o contém for editável;\n' +
        '  2. `handbook/redirects.json` com `to` apontando para o destino real;\n' +
        '  3. o mesmo arquivo com `to: null` + `reason`, se o documento morreu de vez;\n' +
        '  4. se for aparato expurgado, HISTORICAL_PREFIXES em scripts/handbook/link-scan.ts.\n\n' +
        'Editar ADR aceito NÃO é saída (CLAUDE.md §Anti-padrões #3).\n\n' +
        dead.join('\n'),
    );
  });

  it('a varredura enxerga o handbook (guarda contra verde por vacuidade)', () => {
    // Sem isto, um glob quebrado zeraria `unaddressed` e o gate passaria sobre nada — que é
    // precisamente o falso-verde que esta suíte inteira existe para não produzir.
    const live = (scan().get('live') ?? []).length;
    assert.ok(live > 500, `só ${live} links vivos: o glob quebrou e a asserção acima é vazia`);
  });
});

describe('HANDBOOK-LINKS — a allowlist histórica não cresce em silêncio', () => {
  it('a lista está pinada', () => {
    // Pin por deepEqual, mesmo molde do KNOWN_COLLISIONS em handbook-numbering.test.ts.
    // Acrescentar prefixo aqui afrouxa o gate: tem de aparecer em diff de PR, com justificativa.
    assert.deepEqual(HISTORICAL_PREFIXES, [
      '.claude/.pipeline/',
      '.claude/.planning/',
      '.claude/skills/pipeline-maestro/',
      '.claude/skills/speckit-',
      '.specify/',
      'scripts/pipeline/',
      'AGENTS.md',
      'ERP-CONTRACTS/',
    ]);
  });

  it('todo prefixo protegido está mesmo ausente do disco', () => {
    // O ADR-0057 §5 protege referência a coisa que NÃO EXISTE MAIS. Se um destes ressuscitar, a
    // entrada deixa de ser proteção e vira desculpa: o link passaria a ter destino real e o gate
    // estaria escondendo isso.
    const alive = HISTORICAL_PREFIXES.filter((p) =>
      existsSync(join(PROJECT_ROOT, p.replace(/\/$/, ''))),
    ).sort();
    assert.deepEqual(
      alive,
      [],
      'prefixo na allowlist histórica existe no disco — remova a entrada e deixe os links resolverem:\n' +
        alive.join('\n'),
    );
  });

  it('nenhum prefixo é amplo demais a ponto de cobrir material vivo', () => {
    // `.claude/skills/` inteiro cobriria as skills em uso; por isso a lista nomeia
    // `pipeline-maestro/` e `speckit-` especificamente. Esta asserção trava o alargamento.
    const tooBroad = HISTORICAL_PREFIXES.filter(
      (p) => p === '.claude/' || p === '.claude/skills/' || p === 'scripts/' || p === 'handbook/',
    );
    assert.deepEqual(
      tooBroad,
      [],
      'prefixo largo demais na allowlist — cobriria material vivo:\n' + tooBroad.join('\n'),
    );
  });
});
