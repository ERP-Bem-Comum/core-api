import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { Result } from '#src/shared/primitives/result.ts';
import { isErr, isOk } from '#src/shared/index.ts';
// W0 RED: estes símbolos ainda NÃO existem — o módulo financial será criado na W1.
import {
  ContractRef,
  BudgetPlanRef,
  CategoryRef,
  ProgramRef,
  type FinancialRefError,
} from '#src/modules/financial/domain/shared/refs.ts';

const VALID_V4 = '7f3a1234-5678-4abc-9def-fedcba987654';
const V1_UUID = '123e4567-e89b-12d3-a456-426614174000';

// Refs cross-BC leves (ADR-0001/0031): rehydrate-only, validação só de formato (UUID v4) — clarify Q2.
interface AnyRef {
  rehydrate: (raw: string) => Result<unknown, FinancialRefError>;
}

const itBehavesLikeARef = (name: string, ref: AnyRef): void => {
  describe(name, () => {
    it('expõe `rehydrate` e NÃO expõe `generate` (ID nasce no módulo dono)', () => {
      assert.equal(typeof ref.rehydrate, 'function');
      assert.equal((ref as { generate?: unknown }).generate, undefined);
    });

    it('aceita UUID v4 válido', () => {
      const r = ref.rehydrate(VALID_V4);
      assert.equal(isOk(r), true);
      if (r.ok) assert.equal(r.value as unknown as string, VALID_V4);
    });

    it('rejeita vazio, não-UUID e UUID v1 com financial-ref-invalid', () => {
      assert.equal(isErr(ref.rehydrate('')), true);
      assert.equal(isErr(ref.rehydrate('not-a-uuid')), true);
      const v1 = ref.rehydrate(V1_UUID);
      assert.equal(isErr(v1), true);
      if (!v1.ok) assert.equal(v1.error, 'financial-ref-invalid');
    });
  });
};

describe('financial/domain/shared/refs — refs leves rehydrate-only', () => {
  itBehavesLikeARef('ContractRef', ContractRef);
  itBehavesLikeARef('BudgetPlanRef', BudgetPlanRef);
  itBehavesLikeARef('CategoryRef', CategoryRef);
  itBehavesLikeARef('ProgramRef', ProgramRef);
});
