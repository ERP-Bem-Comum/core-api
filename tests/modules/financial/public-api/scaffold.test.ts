/**
 * Testes para `src/modules/financial/public-api/index.ts`.
 *
 * Ticket original: FIN-MODULE-SCAFFOLD (placeholder vazio).
 * Atualizado por: FIN-PORT-OUTBOX — primeiro ticket a popular a public-api
 * com `FinancialModuleEvent` + `FINANCIAL_SCHEMA_VERSION` + `isFinancialModuleEvent`.
 *
 * Invariantes preservadas:
 *  CA-1  Arquivo `src/modules/financial/public-api/index.ts` existe.
 *  CA-3  Import via subpath alias `#src/modules/financial/public-api/index.ts` funciona.
 *
 * Nova validação (substitui CA-2 original "zero símbolos"):
 *  Public-API expõe pelo menos os runtime exports do FIN-PORT-OUTBOX.
 *  Conforme novos tickets adicionarem agregados, este set cresce.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const publicApiUrl = new URL(
  '../../../../src/modules/financial/public-api/index.ts',
  import.meta.url,
);

describe('financial/public-api scaffold', () => {
  it('CA-1: arquivo public-api/index.ts existe no filesystem', async () => {
    await assert.doesNotReject(
      access(fileURLToPath(publicApiUrl)),
      'src/modules/financial/public-api/index.ts deveria existir',
    );
  });

  it('CA-3: módulo é importável via subpath alias', async () => {
    const mod: Record<string, unknown> = await import('#src/modules/financial/public-api/index.ts');
    const keys = Object.keys(mod).filter((k) => k !== 'default');
    // Runtime exports atuais (types não aparecem em Object.keys):
    //   - FINANCIAL_SCHEMA_VERSION (const)
    //   - isFinancialModuleEvent (function)
    const expected = ['FINANCIAL_SCHEMA_VERSION', 'isFinancialModuleEvent'];
    const missing = expected.filter((k) => !keys.includes(k));
    assert.deepEqual(
      missing,
      [],
      `public-api/index.ts deve exportar todos (FIN-PORT-OUTBOX): ${expected.join(', ')} — faltando: ${missing.join(', ')}`,
    );
  });
});
