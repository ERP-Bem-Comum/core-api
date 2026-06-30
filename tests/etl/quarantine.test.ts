import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  describeReason,
  toSummary,
  type QuarantineReason,
} from '#scripts/etl/quarantine/reason.ts';

// PARTNERS-ETL-CORE: QuarantineReason é a tagged union dos motivos de quarentena.
// `describeReason` é a frase PT-BR (humano); `toSummary` é o resumo SEM PII para o
// arquivo versionável no git (D12: { tag, field } — nunca o valor tentado).

const ALL: readonly QuarantineReason[] = [
  { tag: 'CpfInvalid', field: 'cpf', attempted: '123' },
  { tag: 'CnpjInvalid', field: 'cnpj', attempted: 'xx' },
  { tag: 'EmailInvalid', field: 'email', attempted: 'no-at' },
  { tag: 'EnumUnknown', field: 'service_category', attempted: 'FOO' },
  { tag: 'RequiredFieldMissing', field: 'role' },
  { tag: 'Overflow', field: 'biography', attempted: 'x', maxLength: 2000 },
  { tag: 'DateInvalid', field: 'start_of_contract', attempted: '0000-00-00' },
];

describe('QuarantineReason', () => {
  it('describeReason cobre todas as tags com frase não-vazia', () => {
    for (const r of ALL) {
      const phrase = describeReason(r);
      assert.equal(typeof phrase, 'string');
      assert.ok(phrase.length > 0, `descrição vazia para ${r.tag}`);
    }
  });

  it('toSummary expõe tag + field e NUNCA o valor tentado (sem PII — D12)', () => {
    const summary = toSummary({ tag: 'CpfInvalid', field: 'cpf', attempted: '529.982.247-25' });
    assert.deepEqual(summary, { tag: 'CpfInvalid', field: 'cpf' });
    // garante que nenhum campo do resumo carrega o valor (PII)
    assert.ok(!Object.values(summary).includes('529.982.247-25'));
  });

  it('toSummary de RequiredFieldMissing mantém só tag + field', () => {
    const summary = toSummary({ tag: 'RequiredFieldMissing', field: 'role' });
    assert.deepEqual(summary, { tag: 'RequiredFieldMissing', field: 'role' });
  });
});
