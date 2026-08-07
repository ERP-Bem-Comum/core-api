/**
 * REDIRECTS — o mapa de redirecionamento do handbook não apodrece (Fase 3 da spec 041).
 *
 * O `redirects.json` existe para endereçar link morto SEM editar documento histórico ou ADR aceito,
 * que o ADR-0057 §5 e o anti-padrão #3 do CLAUDE.md proíbem tocar. Mas ele é um documento como
 * qualquer outro — e o plano previu a objeção: "ninguém consulta o mapa e ele vira mais um
 * documento a apodrecer".
 *
 * A mitigação era por construção — quem consulta é o gate, não o humano. Este teste é a outra
 * metade: um mapa cujas entradas não valem mais é pior que mapa nenhum, porque promete um destino
 * que não entrega.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { repoPaths } from '../../scripts/handbook/link-scan.ts';

const PROJECT_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const FILE = join(PROJECT_ROOT, 'handbook/redirects.json');

interface Entry {
  readonly to?: unknown;
  readonly reason?: unknown;
  readonly since?: unknown;
}

const entries = (): readonly (readonly [string, Entry])[] => {
  const parsed: unknown = JSON.parse(readFileSync(FILE, 'utf-8'));
  return Object.entries(parsed as Record<string, unknown>)
    .filter(([k]) => !k.startsWith('$'))
    .map(([k, v]) => [k, v as Entry] as const);
};

/**
 * Existência pelo git, não pelo disco (`.claude/rules/testing.md`). Um destino gitignored — como o
 * `handbook/guidelines/` — existiria para quem tem os arquivos e não para o CI; o mapa passaria
 * aqui e falharia lá, que é o defeito que custou dois vermelhos na spec 041.
 */
const repo = (): ReturnType<typeof repoPaths> =>
  repoPaths(
    PROJECT_ROOT,
    entries().flatMap(([from, e]) => (typeof e.to === 'string' ? [from, e.to] : [from])),
  );

describe('REDIRECTS — toda entrada é verificável', () => {
  it('todo destino declarado está no repositório', () => {
    const r = repo();
    const dead = entries()
      .filter(([, e]) => typeof e.to === 'string' && !r.exists(e.to))
      .map(([from, e]) => `${from} → ${String(e.to)}`)
      .sort();
    assert.deepEqual(
      dead,
      [],
      'redirect aponta para caminho inexistente — o mapa promete um destino que não entrega:\n' +
        dead.join('\n'),
    );
  });

  it('nenhuma origem voltou a existir', () => {
    // Entrada cuja origem ressuscitou é lixo que confunde: o link resolve sozinho, e o mapa
    // continua alegando que ele mudou de lugar.
    const r = repo();
    const revived = entries()
      .map(([from]) => from)
      .filter((from) => r.exists(from))
      .sort();
    assert.deepEqual(
      revived,
      [],
      'origem de redirect existe no disco — remova a entrada, o link resolve sozinho:\n' +
        revived.join('\n'),
    );
  });

  it('toda entrada declara motivo e data', () => {
    const incomplete = entries()
      .filter(
        ([, e]) =>
          typeof e.reason !== 'string' ||
          e.reason.length < 10 ||
          typeof e.since !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}$/.test(e.since),
      )
      .map(([from]) => from)
      .sort();
    assert.deepEqual(
      incomplete,
      [],
      'entrada sem `reason` legível ou `since` no formato AAAA-MM-DD — redirect sem motivo é ' +
        'exatamente o registro que não se consegue auditar depois:\n' +
        incomplete.join('\n'),
    );
  });

  it('`to` é string ou null, nunca ausente', () => {
    const malformed = entries()
      .filter(([, e]) => !(typeof e.to === 'string' || e.to === null))
      .map(([from]) => from)
      .sort();
    assert.deepEqual(
      malformed,
      [],
      'entrada sem `to` explícito — omitir é ambíguo entre "não sei" e "morreu":\n' +
        malformed.join('\n'),
    );
  });

  it('a varredura enxerga o mapa (guarda contra verde por vacuidade)', () => {
    assert.ok(
      entries().length >= 10,
      `só ${entries().length} entradas lidas — o parse quebrou e as asserções acima passariam sobre nada`,
    );
  });
});
