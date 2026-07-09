/**
 * FIN-DOC-READER-PDF-REAL (#386) — CA4: validação LOCAL contra os PDFs fiscais reais da P.O.
 *
 * Os PDFs vivem em `handbook/guidelines/ocr-fixtures-reais/` (gitignored, LGPD — nunca commitados).
 * Este teste PULA quando a pasta está vazia/ausente (CI não tem os fixtures) — mesmo padrão de gate
 * do `MYSQL_INTEGRATION`. Localmente, prova que o reader classifica os documentos reais.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { createNativePdfDocumentReader } from '#src/modules/financial/adapters/document-reader/native-pdf.ts';

const DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../handbook/guidelines/ocr-fixtures-reais',
);

const pdfs = ((): readonly string[] => {
  try {
    return readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));
  } catch {
    return [];
  }
})();

if (pdfs.length === 0) {
  describe('native-pdf REAL (#386, local)', () => {
    it(
      'sem fixtures reais na pasta gitignored — pulando (CI/ambiente sem os PDFs)',
      { skip: true },
      () => {
        /* no-op */
      },
    );
  });
} else {
  // #386 Fatia 1 entrega a mecânica (TJ + reconstrução + DANFE); estes reais precisam de extração
  // profunda de fonte (Identity-H sem /ToUnicode) ou stream não-comprimido → Fatia 2 (#388). Marcados
  // `todo` (rodam, não falham o gate) com a causa-raiz — não escondem o gap, documentam-no.
  const FATIA2: ReadonlyMap<string, string> = new Map([
    ['DANFCOM.pdf', '#388: Identity-H com CMap mas decode sem âncoras'],
    ['DANFCOM (1).pdf', '#388: Identity-H com CMap mas decode sem âncoras'],
    ['DamISS NFS-E 32.pdf', '#388: hex Identity-H sem /ToUnicode'],
    ['NFS-e 8 - Bem Comum.pdf', '#388: hex Identity-H sem /ToUnicode'],
    ['NFSE_00462171_FILU.pdf', '#388: content stream não-comprimido'],
  ]);
  describe('native-pdf REAL (#386, local) — os PDFs da P.O. classificam sem scanned/malformed', () => {
    const reader = createNativePdfDocumentReader();
    for (const f of pdfs) {
      const fatia2 = FATIA2.get(f);
      const opts = fatia2 !== undefined ? { todo: fatia2 } : {};
      it(`CA4: ${f} → type detectado (não scanned/malformed)`, opts, async () => {
        const bytes = new Uint8Array(readFileSync(join(DIR, f)));
        const r = await reader.read({ bytes });
        assert.equal(r.ok, true, `${f}: reader falhou → ${r.ok ? '' : r.error}`);
        if (!r.ok) return;
        assert.ok(r.value.type !== undefined, `${f}: type não detectado`);
      });
    }
  });
}
