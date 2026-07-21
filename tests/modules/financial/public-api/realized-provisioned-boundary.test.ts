/**
 * FIN-REALIZED-PROVISIONED-READ · fronteira ADR-0006/0014 (W0 RED) — estrutural PURO.
 *
 * Lê o source como TEXTO (readFile/access — NÃO importa o reader, para rodar mesmo com o
 * `public-api/realized-provisioned-projection.ts` ainda ausente). Prova três invariantes:
 *   (a) o SEAM existe: o reader vive na `public-api/` do financial. RED em W0 — o arquivo ainda
 *       não existe (o W1 o cria).
 *   (b) ADR-0006: o reader não importa `domain/` nem `application/` de OUTRO módulo (refs opacos).
 *   (c) ADR-0014: só toca `fin_*` — nenhuma tabela `bgp_`/`ctr_`/`par_` resolvida aqui
 *       (budgetPlanRef e categoryRef são refs opacos; nenhum nome resolvido).
 *
 * Raiz do repo = 4 níveis acima de tests/modules/financial/public-api/.
 * ASCII puro. Código EN, comentários PT-BR.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { access, readFile } from 'node:fs/promises';

const rootUrl = new URL('../../../../', import.meta.url);
const READER_REL = 'src/modules/financial/public-api/realized-provisioned-projection.ts';

const exists = async (rel: string): Promise<boolean> => {
  try {
    await access(new URL(rel, rootUrl));
    return true;
  } catch {
    return false;
  }
};

const readSource = async (rel: string): Promise<string> => readFile(new URL(rel, rootUrl), 'utf8');

// Imports cross-módulo proibidos (ADR-0006): domain/application de módulos que NÃO são o financial.
const FORBIDDEN_IMPORTS = [
  'contracts/domain/',
  'contracts/application/',
  'partners/domain/',
  'partners/application/',
  'budget-plans/domain/',
  'budget-plans/application/',
  'programs/domain/',
  'programs/application/',
  'auth/domain/',
  'auth/application/',
];

// Tabelas de outros módulos (ADR-0014): o reader só pode tocar fin_*.
const FORBIDDEN_TABLES = ['bgp_', 'ctr_', 'par_', 'auth_', 'prg_'];

describe('FIN-REALIZED-PROVISIONED-READ · fronteira (estrutural, sem import)', () => {
  it('(a) o seam public-api/realized-provisioned-projection.ts existe (RED até o W1 criá-lo)', async () => {
    assert.equal(
      await exists(READER_REL),
      true,
      `${READER_REL} ausente — o reader realizado/provisionado ainda não existe`,
    );
  });

  it('(b) ADR-0006: o reader não importa domain/ nem application/ de outro módulo', async () => {
    if (!(await exists(READER_REL))) {
      assert.fail(`${READER_REL} ausente — não há source para auditar (RED do item (a))`);
    }
    const src = await readSource(READER_REL);
    for (const needle of FORBIDDEN_IMPORTS) {
      assert.ok(
        !src.includes(needle),
        `${READER_REL} importa de ${needle} — viola ADR-0006 (cross-módulo só via public-api/)`,
      );
    }
  });

  it('(c) ADR-0014: o reader só referencia tabelas fin_* (refs de plano/categoria ficam opacos)', async () => {
    if (!(await exists(READER_REL))) {
      assert.fail(`${READER_REL} ausente — não há source para auditar (RED do item (a))`);
    }
    const src = await readSource(READER_REL);
    for (const needle of FORBIDDEN_TABLES) {
      assert.ok(
        !src.includes(needle),
        `${READER_REL} referencia tabela ${needle}* — viola ADR-0014 (isolamento por prefixo fin_*)`,
      );
    }
  });
});
