import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { Result } from '#src/shared/primitives/result.ts';
import { isErr, isOk } from '#src/shared/index.ts';
import {
  SupplierRef,
  FinancierRef,
  CollaboratorRef,
  type PartnerRefError,
} from '#src/modules/partners/public-api/refs.ts';

const VALID_V4 = '7f3a1234-5678-4abc-9def-fedcba987654';
const V1_UUID = '123e4567-e89b-12d3-a456-426614174000';

// As refs do public-api são os tipos que Contratos/Financeiro guardam para
// referenciar um parceiro por ID (ADR-0031 §7). Rehydrate-only, padrão UserRef.
interface AnyRef {
  rehydrate: (raw: string) => Result<unknown, PartnerRefError>;
}

const itBehavesLikeARef = (name: string, ref: AnyRef): void => {
  describe(name, () => {
    it('expõe `rehydrate` e NÃO expõe `generate` (ID vem do módulo partners)', () => {
      assert.equal(typeof ref.rehydrate, 'function');
      assert.equal((ref as { generate?: unknown }).generate, undefined);
    });

    it('aceita UUID v4 válido', () => {
      const r = ref.rehydrate(VALID_V4);
      assert.equal(isOk(r), true);
      if (r.ok) assert.equal(r.value as unknown as string, VALID_V4);
    });

    it('rejeita string vazia, não-UUID e UUID v1', () => {
      assert.equal(isErr(ref.rehydrate('')), true);
      assert.equal(isErr(ref.rehydrate('not-a-uuid')), true);
      assert.equal(isErr(ref.rehydrate(V1_UUID)), true);
    });
  });
};

describe('partners/public-api/refs — rehydrate-only por ref', () => {
  itBehavesLikeARef('SupplierRef', SupplierRef);
  itBehavesLikeARef('FinancierRef', FinancierRef);
  itBehavesLikeARef('CollaboratorRef', CollaboratorRef);
});
