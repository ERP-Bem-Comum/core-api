/**
 * BGP-ETL-WRITE-PORT · CA4 (W0 RED) — fronteira ADR-0006 do ETL de budget-plans.
 *
 * Estrutural PURO (le o source como texto via readFile/access — NAO importa o port, para rodar
 * mesmo com `public-api/etl.ts` ainda ausente). Prova dois invariantes:
 *   (a) o SEAM existe: `src/modules/budget-plans/public-api/etl.ts` e' o unico ponto pelo qual a
 *       ETL toca budget-plans. RED em W0 — o arquivo ainda nao existe (o W1 o cria).
 *   (b) GUARD ADR-0006: nenhum arquivo sob `scripts/etl/` importa de `budget-plans/domain/` nem
 *       de `budget-plans/application/`. Guard prospectivo — verde hoje (fatia 3 ainda nao escreveu
 *       o orquestrador) e DEVE seguir verde quando ela chegar.
 *
 * Raiz do repo = 4 niveis acima de tests/modules/budget-plans/public-api/.
 * ASCII puro. Codigo EN, comentarios PT-BR.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { access, readFile, readdir } from 'node:fs/promises';
import type { Dirent } from 'node:fs';

const rootUrl = new URL('../../../../', import.meta.url);

const exists = async (rel: string): Promise<boolean> => {
  try {
    await access(new URL(rel, rootUrl));
    return true;
  } catch {
    return false;
  }
};

// Lista recursiva de arquivos .ts sob um diretorio relativo a raiz do repo.
const listTsFiles = async (relDir: string): Promise<readonly string[]> => {
  const out: string[] = [];
  const walk = async (rel: string): Promise<void> => {
    let entries: Dirent[];
    try {
      entries = await readdir(new URL(rel, rootUrl), { withFileTypes: true });
    } catch {
      return; // diretorio ainda nao existe (fatia 3) — guard fica vacuamente verde.
    }
    for (const e of entries) {
      const childRel = `${rel}${e.name}${e.isDirectory() ? '/' : ''}`;
      if (e.isDirectory()) await walk(childRel);
      else if (e.name.endsWith('.ts')) out.push(childRel);
    }
  };
  await walk(relDir.endsWith('/') ? relDir : `${relDir}/`);
  return out;
};

const FORBIDDEN = [
  'budget-plans/domain/',
  'budget-plans/application/',
  'modules/budget-plans/domain/',
  'modules/budget-plans/application/',
];

describe('BGP-ETL-WRITE-PORT · CA4 — fronteira ETL ↔ budget-plans (ADR-0006)', () => {
  it('(a) o seam public-api/etl.ts existe (RED ate o W1 cria-lo)', async () => {
    assert.equal(
      await exists('src/modules/budget-plans/public-api/etl.ts'),
      true,
      'src/modules/budget-plans/public-api/etl.ts ausente — o port de escrita do ETL ainda nao existe',
    );
  });

  it('(b) nenhum arquivo em scripts/etl/ importa budget-plans/domain/ ou application/', async () => {
    const files = await listTsFiles('scripts/etl');
    for (const rel of files) {
      const src = await readFile(new URL(rel, rootUrl), 'utf8');
      for (const needle of FORBIDDEN) {
        assert.ok(
          !src.includes(needle),
          `${rel} importa de ${needle} — viola ADR-0006 (cross-modulo so via public-api/)`,
        );
      }
    }
  });
});
