/**
 * ADR-STATUS-CHAIN — ADR aceito não se apoia em ADR proposto.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Norma (`ADR-0051-C6`, promovida a `accepted` em 2026-08-05): um ADR `Accepted` MUST NOT declarar
 * dependência de um ADR que ainda está `Proposed`. Se a construção depende dele, o anterior MUST ser
 * ratificado — ou a seção MUST ser reafirmada por inteiro no novo.
 *
 * O caso que originou o gate: o [ADR-0051](../../handbook/architecture/adr/0051-taxonomy-owner-budget-plan-scoped.md),
 * `Accepted` desde 2026-07-14, declarava no cabeçalho `**Complementa:** ADR-0048 (§D1 segue válido)`.
 * O ADR-0048 seguia `Proposed`, com o texto "aguardando ratificação", TRÊS SEMANAS depois. A cadeia
 * de decisão de taxonomia — que governa `budget-plans` e `financial` — estava apoiada em documento
 * que ninguém tinha sancionado. Resolvido ratificando o 0048 em 2026-08-05.
 *
 * Por que isso é defeito e não formalidade: `Proposed` significa "sujeito a mudar". Quem lê o 0051 e
 * segue para o 0048 encontra uma decisão que pode ser reescrita sem que o 0051 saiba — e o 0051 é
 * imutável, então não teria como acompanhar. É a única forma de um ADR aceito ficar falso sem
 * ninguém editar nada.
 *
 * ESCOPO — o gate olha os campos que declaram DEPENDÊNCIA, não menção:
 *
 *   `**Complementa:**`        "eu construo em cima disto"          → cobrado
 *   `**Conformidade com:**`   "eu respeito estas decisões"         → cobrado
 *   `**Relacionado:**`        ponteiro de leitura, sem dependência → IGNORADO (23 ocorrências)
 *   `**Supersedes:**`         direção oposta — o novo mata o velho → IGNORADO
 *
 * Distinguir os quatro é o ponto. Um gate que casasse qualquer link `[ADR-NNNN]` acusaria as 23
 * menções de `Relacionado:`, que são exatamente a boa prática de apontar leitura adjacente.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { PROJECT_ROOT, readSource } from '../support/source-scan.ts';

const ADR_DIR = 'handbook/architecture/adr';

/** `- **Status:** Accepted` / `Proposed` / `Superseded by …` — o literal do cabeçalho. */
const STATUS = /^- \*\*Status:\*\*\s*(\w+)/m;

/** Campos que declaram DEPENDÊNCIA. `Relacionado:` e `Supersedes:` ficam de fora, por desenho. */
const DEPENDENCY_FIELD = /^- \*\*(?:Complementa|Conformidade com)[^:]*:\*\*(.*)$/gm;

/** `(./0048-legacy-…md)` → `0048`. Só link relativo de ADR, nunca texto solto. */
const ADR_LINK = /\(\.\/(\d{4})-[^)]*\.md\)/g;

const adrFiles = (): readonly string[] =>
  readdirSync(join(PROJECT_ROOT, ADR_DIR))
    .filter((f) => /^\d{4}-.*\.md$/.test(f))
    .sort();

const statusOf = (file: string): string =>
  STATUS.exec(readSource(`${ADR_DIR}/${file}`))?.[1] ?? 'unknown';

const numberOf = (file: string): string => file.slice(0, 4);

describe('ADR-STATUS-CHAIN — decisão aceita não se apoia em decisão não sancionada', () => {
  it('nenhum ADR Accepted declara dependência de um ADR Proposed', () => {
    const files = adrFiles();
    const proposed = new Set(files.filter((f) => statusOf(f) === 'Proposed').map(numberOf));

    const offenders: string[] = [];
    for (const file of files.filter((f) => statusOf(f) === 'Accepted')) {
      const content = readSource(`${ADR_DIR}/${file}`);
      for (const field of content.matchAll(DEPENDENCY_FIELD)) {
        for (const link of (field[1] ?? '').matchAll(ADR_LINK)) {
          const target = link[1] ?? '';
          if (proposed.has(target)) {
            offenders.push(
              `${numberOf(file)} (Accepted) declara dependência do ${target} (Proposed)`,
            );
          }
        }
      }
    }

    assert.deepEqual(
      [...new Set(offenders)].sort(),
      [],
      'ADR aceito apoiado em ADR proposto. `Proposed` significa "sujeito a mudar", e o aceito é ' +
        'IMUTÁVEL — não tem como acompanhar a mudança. Ratifique o anterior, ou reafirme a seção ' +
        'por inteiro no novo:\n' +
        [...new Set(offenders)].sort().join('\n'),
    );
  });

  it('a varredura enxerga os dois estados (guarda contra verde por vacuidade)', () => {
    const files = adrFiles();
    const accepted = files.filter((f) => statusOf(f) === 'Accepted').length;
    const proposed = files.filter((f) => statusOf(f) === 'Proposed').length;
    assert.ok(accepted > 20, `esperado 20+ ADRs Accepted, encontrado ${accepted}`);
    assert.ok(
      proposed > 0,
      'nenhum ADR Proposed — o gate passaria sem ter o que confrontar. Se o acervo realmente ' +
        'zerou os Proposed, esta guarda precisa mudar de forma.',
    );
  });

  it('há campo de dependência a verificar (guarda contra regex que casa nada)', () => {
    const n = adrFiles().reduce(
      (acc, f) => acc + [...readSource(`${ADR_DIR}/${f}`).matchAll(DEPENDENCY_FIELD)].length,
      0,
    );
    assert.ok(n > 0, 'nenhum `Complementa:`/`Conformidade com:` encontrado — a convenção mudou?');
  });
});
