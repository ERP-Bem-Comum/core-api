/**
 * CONTRACTS-CONTRACTOR-METADATA-DOMAIN — W0 (RED) — VO `ContractorRef`.
 *
 * Referência leve do contratado (FR-002, research.md R1). Espelha o padrão de VO
 * folha (`contract-id.ts`, `user-ref.ts`): module-as-namespace, erro string-literal
 * kebab, smart constructor `(raw) => Result`. As 4 variantes ricas
 * (Supplier|Financier|Collaborator|Act) NÃO vivem aqui — só a referência por
 * identidade (Vernon, IDDD p.460).
 *
 * RED por inexistência: o módulo `domain/shared/contractor.ts` ainda não existe →
 * o import falha até o W1.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor.ts';

const VALID_V4 = '7f3a1234-5678-4abc-9def-fedcba987654';
const VALID_V4_UPPER = '7F3A1234-5678-4ABC-9DEF-FEDCBA987654';
const V1_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('ContractorRef — module-as-namespace (Padrão D)', () => {
  it('expõe parseType / parseId / make como funções', () => {
    const ns: Readonly<Record<string, unknown>> = ContractorRef;
    assert.equal(typeof ns.parseType, 'function');
    assert.equal(typeof ns.parseId, 'function');
    assert.equal(typeof ns.make, 'function');
  });
});

describe('ContractorRef.parseType', () => {
  for (const t of ['supplier', 'financier', 'collaborator', 'act'] as const) {
    it(`aceita o tipo válido '${t}'`, () => {
      const r = ContractorRef.parseType(t);
      assert.equal(isOk(r), true);
      if (r.ok) assert.equal(r.value, t);
    });
  }

  it("rejeita PascalCase ('Supplier') — discriminante é lowercase", () => {
    const r = ContractorRef.parseType('Supplier');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contractor-type-unknown');
  });

  it('rejeita tipo desconhecido', () => {
    const r = ContractorRef.parseType('partner');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contractor-type-unknown');
  });

  it('rejeita string vazia', () => {
    const r = ContractorRef.parseType('');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contractor-type-unknown');
  });
});

describe('ContractorRef.parseId', () => {
  it('aceita UUID v4', () => {
    const r = ContractorRef.parseId(VALID_V4);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value as unknown as string, VALID_V4);
  });

  it('aceita UUID v4 em maiúsculas (case-insensitive)', () => {
    const r = ContractorRef.parseId(VALID_V4_UPPER);
    assert.equal(isOk(r), true);
  });

  it("rejeita string vazia com 'contractor-id-empty'", () => {
    const r = ContractorRef.parseId('');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contractor-id-empty');
  });

  it("rejeita não-UUID com 'contractor-id-invalid'", () => {
    const r = ContractorRef.parseId('not-a-uuid');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contractor-id-invalid');
  });

  it("rejeita UUID v1 (versão errada) com 'contractor-id-invalid'", () => {
    const r = ContractorRef.parseId(V1_UUID);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contractor-id-invalid');
  });
});

describe('ContractorRef.make', () => {
  it('compõe { type, id } a partir de type e id válidos', () => {
    const r = ContractorRef.make('supplier', VALID_V4);
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.type, 'supplier');
      assert.equal(r.value.id as unknown as string, VALID_V4);
    }
  });

  it('propaga erro de tipo desconhecido', () => {
    const r = ContractorRef.make('partner', VALID_V4);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contractor-type-unknown');
  });

  it('propaga erro de id vazio', () => {
    const r = ContractorRef.make('supplier', '');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contractor-id-empty');
  });

  it('produz refs estruturalmente iguais para os mesmos argumentos', () => {
    const a = ContractorRef.make('act', VALID_V4);
    const b = ContractorRef.make('act', VALID_V4);
    assert.equal(isOk(a) && isOk(b), true);
    if (a.ok && b.ok) assert.deepEqual(a.value, b.value);
  });
});
