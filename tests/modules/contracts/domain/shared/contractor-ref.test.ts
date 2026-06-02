// W0 RED — CTR-CONTRACT-CONTRACTOR-REF (CA1).
// O VO `ContractorRef` ainda NÃO existe: este arquivo deve falhar no load
// (import de módulo inexistente) até o W1 criar
// `src/modules/contracts/domain/shared/contractor-ref.ts`.
//
// `ContractorRef` é discriminated union sobre os branded refs de Parceiros
// (`SupplierRef|FinancierRef|CollaboratorRef`) expostos SÓ via
// `partners/public-api/refs.ts` (ADR-0006/0014). O smart constructor `rehydrate`
// valida o `type` e delega o `id` ao ref correspondente.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor-ref.ts';

const VALID_V4 = '7f3a1234-5678-4abc-9def-fedcba987654';
const ANOTHER_V4 = '11112222-3333-4444-8555-666677778888';
const V1_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('ContractorRef — module-as-namespace (Padrão D)', () => {
  it('is importable via `import * as ContractorRef` and exposes `rehydrate`', () => {
    const ns: Readonly<Record<string, unknown>> = ContractorRef;
    assert.equal(typeof ns.rehydrate, 'function');
  });
});

describe('ContractorRef — rehydrate (Supplier)', () => {
  it('accepts a valid Supplier ref and preserves the discriminator + id', () => {
    const r = ContractorRef.rehydrate({ type: 'Supplier', id: VALID_V4 });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.kind, 'Supplier');
      assert.equal(r.value.id as unknown as string, VALID_V4);
    }
  });
});

describe('ContractorRef — rehydrate (Financier)', () => {
  it('accepts a valid Financier ref', () => {
    const r = ContractorRef.rehydrate({ type: 'Financier', id: ANOTHER_V4 });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.kind, 'Financier');
  });
});

describe('ContractorRef — rehydrate (Collaborator)', () => {
  it('accepts a valid Collaborator ref', () => {
    const r = ContractorRef.rehydrate({ type: 'Collaborator', id: VALID_V4 });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.kind, 'Collaborator');
  });
});

describe('ContractorRef — rehydrate (invalid type)', () => {
  it('rejects an unknown contractor type', () => {
    const r = ContractorRef.rehydrate({ type: 'Sponsor', id: VALID_V4 });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contractor-ref-invalid-type');
  });

  it('rejects an empty type', () => {
    const r = ContractorRef.rehydrate({ type: '', id: VALID_V4 });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contractor-ref-invalid-type');
  });
});

describe('ContractorRef — rehydrate (invalid id, delegated to partner ref)', () => {
  it('rejects a non-UUID id', () => {
    const r = ContractorRef.rehydrate({ type: 'Supplier', id: 'not-a-uuid' });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'partner-ref-invalid');
  });

  it('rejects a UUID of the wrong version (v1)', () => {
    const r = ContractorRef.rehydrate({ type: 'Financier', id: V1_UUID });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'partner-ref-invalid');
  });

  it('rejects an empty id', () => {
    const r = ContractorRef.rehydrate({ type: 'Collaborator', id: '' });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'partner-ref-invalid');
  });
});
