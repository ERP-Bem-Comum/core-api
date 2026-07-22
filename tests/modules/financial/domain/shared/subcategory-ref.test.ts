// W0 RED (FIN-DOC-SUBCATEGORY-STAMP · S1 do épico Taxonomia Planejável Unificada, #502) —
// VO `SubcategoryRef` em financial/domain/shared/refs.ts.
//
// DEVE FALHAR em W0: o símbolo `SubcategoryRef` ainda NÃO existe em refs.ts (a W1 o cria).
// O import não-resolvido derruba o carregamento deste arquivo → RED pelo motivo certo
// (a folha da árvore do plano ainda não tem VO). Espelha o contrato dos irmãos
// (`ContractRef`/`BudgetPlanRef`/`CategoryRef`/`ProgramRef`): rehydrate-only, ref opaco,
// validação SÓ de formato (UUID v4) — NÃO resolve nome, NÃO valida contra o plano (CA5/CA7, ADR-0014).
//
// Isolado de propósito: NÃO edita o refs.test.ts existente (regressão zero — CA8). Um novo
// arquivo cuja falha de import não contamina os 4 refs já verdes.
//
// Código EN, comentários PT-BR.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
// W0 RED: este símbolo ainda NÃO existe — a W1 o adiciona a refs.ts.
import { SubcategoryRef } from '#src/modules/financial/domain/shared/refs.ts';

const VALID_V4 = '9c1e4d2a-3b7f-4e6a-8d90-1a2b3c4d5e6f';
const V1_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('financial/domain/shared/refs — SubcategoryRef (ref leve rehydrate-only)', () => {
  it('expõe `rehydrate` e NÃO expõe `generate` (o ID nasce no módulo dono, budget-plans)', () => {
    assert.equal(typeof SubcategoryRef.rehydrate, 'function');
    assert.equal((SubcategoryRef as { generate?: unknown }).generate, undefined);
  });

  it('é ref OPACO: não resolve nome nem valida contra o plano (ADR-0014 — CA5/CA7)', () => {
    // A superfície pública é SÓ `rehydrate` (formato). Nenhum acoplamento ao domínio dono.
    assert.equal((SubcategoryRef as { resolve?: unknown }).resolve, undefined);
    assert.equal((SubcategoryRef as { resolveName?: unknown }).resolveName, undefined);
    assert.equal(
      (SubcategoryRef as { validateAgainstPlan?: unknown }).validateAgainstPlan,
      undefined,
    );
  });

  it('aceita UUID v4 válido e devolve o mesmo valor (branded, opaco)', () => {
    const r = SubcategoryRef.rehydrate(VALID_V4);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value as unknown as string, VALID_V4);
  });

  it('rejeita vazio, não-UUID e UUID v1 com financial-ref-invalid (CA5)', () => {
    assert.equal(isErr(SubcategoryRef.rehydrate('')), true);
    assert.equal(isErr(SubcategoryRef.rehydrate('not-a-uuid')), true);
    const v1 = SubcategoryRef.rehydrate(V1_UUID);
    assert.equal(isErr(v1), true);
    if (!v1.ok) assert.equal(v1.error, 'financial-ref-invalid');
  });
});
