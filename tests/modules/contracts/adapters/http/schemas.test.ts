/**
 * #1071 (CA5) — o teto de `sequentialNumber` na borda é a largura da coluna, não um número solto.
 *
 * A borda não importa o schema de persistência (adapter não depende de adapter); quem amarra os dois é
 * este teste. Se a coluna mudar de largura, ele reprova até a borda acompanhar.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { is } from 'drizzle-orm';
import { MySqlVarChar } from 'drizzle-orm/mysql-core';

import {
  SEQUENTIAL_NUMBER_MAX_LENGTH,
  createContractBodySchema,
} from '#src/modules/contracts/adapters/http/schemas.ts';
import { contracts } from '#src/modules/contracts/adapters/persistence/schemas/mysql.ts';

const body = (sequentialNumber: string) => ({
  mode: 'Pending',
  sequentialNumber,
  title: 't',
  objective: 'o',
  originalValueCents: 1,
  periodStart: '2026-01-01',
  periodEnd: null,
  contractor: { type: 'supplier', id: '55555555-5555-4555-8555-555555555555' },
});

describe('#1071 — sequentialNumber na borda', () => {
  it('o teto é o varchar de ctr_contracts.sequential_number', () => {
    const column: unknown = contracts.sequentialNumber;
    assert.ok(is(column, MySqlVarChar), 'sequential_number deveria ser varchar');
    assert.equal(SEQUENTIAL_NUMBER_MAX_LENGTH, column.length);
  });

  it('aceita até o teto (depois do trim) e recusa um caractere a mais', () => {
    const atLimit = 'x'.repeat(SEQUENTIAL_NUMBER_MAX_LENGTH);
    assert.equal(createContractBodySchema.safeParse(body(atLimit)).success, true);
    assert.equal(createContractBodySchema.safeParse(body(`  ${atLimit}  `)).success, true);
    assert.equal(createContractBodySchema.safeParse(body(`${atLimit}x`)).success, false);
  });
});
