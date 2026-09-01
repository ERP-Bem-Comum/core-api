// #505 (fechado dentro da M2 · RN-M2-12) — o lote de lançamento manual carrega os CINCO níveis.
//
// O defeito: `ConfirmBatchInput.template` declarava três dos cinco refs, e o handler HTTP mapeava só
// esses três. `budgetPlanRef` e `subcategoryRef` chegavam ao Zod (o `manualEntryBodySchema` sempre os
// aceitou) e eram descartados no caminho até o `recordManualEntry` — que também sempre os aceitou.
//
// Por isso não havia erro a investigar: o lote gravava classificação incompleta e respondia 201. O
// que aparecia, muito depois, era um relatório agrupado por plano ou por subcategoria com um balde
// vazio que ninguém conseguia explicar.
//
// A M2 precisa dos 5 no caminho de escrita irmão; corrigir aqui é a mesma correção, num lugar só.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, type Result } from '#src/shared/primitives/result.ts';
import { confirmBatch } from '#src/modules/financial/application/use-cases/confirm-batch.ts';

const PLAN = '22222222-2222-4222-8222-222222222222';
const COST_CENTER = '33333333-3333-4333-8333-333333333333';
const CATEGORY = '44444444-4444-4444-8444-444444444444';
const SUBCATEGORY = '55555555-5555-4555-8555-555555555555';
const PROGRAM = '11111111-1111-4111-8111-111111111111';

describe('financial/application — confirmBatch: threading dos 5 refs (#505)', () => {
  it('os CINCO refs do template chegam ao recordManualEntry', async () => {
    const seen: Record<string, unknown>[] = [];
    const record = (input: Record<string, unknown>): Promise<Result<unknown, never>> => {
      seen.push(input);
      return Promise.resolve(ok({ reconciliationId: 'r1' }));
    };

    const r = await confirmBatch({ record } as never)({
      transactionIds: ['00000000-0000-4000-8000-000000000001'],
      template: {
        type: 'Payment',
        programRef: PROGRAM,
        budgetPlanRef: PLAN,
        costCenterRef: COST_CENTER,
        categoryRef: CATEGORY,
        subcategoryRef: SUBCATEGORY,
      },
      reconciledBy: 'u1',
    });

    assert.equal(r.ok, true);
    assert.equal(seen.length, 1);
    const passed = seen[0];
    assert.equal(passed?.programRef, PROGRAM);
    assert.equal(passed?.costCenterRef, COST_CENTER);
    assert.equal(passed?.categoryRef, CATEGORY);
    // Os dois que o #505 descartava. Se este par voltar a sumir, é a regressão exata da issue.
    assert.equal(passed?.budgetPlanRef, PLAN);
    assert.equal(passed?.subcategoryRef, SUBCATEGORY);
  });

  it('ref ausente no template continua ausente no input (não vira null nem string vazia)', async () => {
    const seen: Record<string, unknown>[] = [];
    const record = (input: Record<string, unknown>): Promise<Result<unknown, never>> => {
      seen.push(input);
      return Promise.resolve(ok({ reconciliationId: 'r1' }));
    };

    await confirmBatch({ record } as never)({
      transactionIds: ['00000000-0000-4000-8000-000000000001'],
      template: { type: 'Transfer' },
      reconciledBy: 'u1',
    });

    // `exactOptionalPropertyTypes`: a chave não existe, e não existe valendo `undefined`.
    assert.equal('budgetPlanRef' in (seen[0] ?? {}), false);
    assert.equal('subcategoryRef' in (seen[0] ?? {}), false);
  });
});
