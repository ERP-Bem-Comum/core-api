/**
 * PARTNERS-COLLAB-FILTERS-DECISION — FR-012 (épico partners-http-gaps): os filtros `programa` e
 * `idade` são DESCARTADOS (fora de escopo) — o contrato de listagem NÃO os anuncia e não filtra por
 * eles. `programa` não é conceito do BC do colaborador; `idade` é derivável de `birthDate` no client.
 *
 * Teste de guarda de regressão (o schema já não declara esses campos): trava a decisão para que
 * ninguém os reintroduza sem reabrir a FR-012.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { collaboratorListQuerySchema } from '#src/modules/partners/adapters/http/schemas.ts';

describe('FR-012 — filtros programa/idade descartados no contrato de colaboradores', () => {
  it('o schema de query NÃO declara `programa` nem `idade`/`age`', () => {
    const shape = collaboratorListQuerySchema.shape as Record<string, unknown>;
    assert.equal('programa' in shape, false);
    assert.equal('idade' in shape, false);
    assert.equal('age' in shape, false);
  });

  it('parsear a query com `programa`/`idade` os descarta (strip) — não viram filtro', () => {
    const parsed = collaboratorListQuerySchema.parse({
      page: '1',
      limit: '10',
      order: 'ASC',
      programa: 'qualquer',
      idade: '30',
    });
    assert.equal('programa' in parsed, false);
    assert.equal('idade' in parsed, false);
  });
});
