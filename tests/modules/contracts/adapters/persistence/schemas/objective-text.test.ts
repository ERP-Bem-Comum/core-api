/**
 * CTR-OBJECTIVE-TEXT — W0 (RED) — #530: `objective` deve ser TEXT, não varchar(1000).
 *
 * Objeto >1000 chars passa no domínio (só valida isBlank) mas o MySQL rejeita o insert
 * com `Data too long for column 'objective'` (varchar(1000)) → front vê "tente novamente".
 * O tipo da coluna é a invariante testável sem banco: `getSQLType()` deve ser `text`.
 *
 * Cobertura: CA1 (tipo text), CA2 (segue NOT NULL).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { contracts } from '#src/modules/contracts/adapters/persistence/schemas/mysql.ts';

describe('contracts.objective — CTR-OBJECTIVE-TEXT (#530)', () => {
  it('CA1 — o tipo SQL é `text` (não `varchar(1000)`, que estoura em objeto longo)', () => {
    assert.equal(contracts.objective.getSQLType(), 'text');
  });

  it('CA2 — a coluna segue NOT NULL (obrigatoriedade do domínio preservada)', () => {
    assert.equal(contracts.objective.notNull, true);
  });
});
