import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// `ids.ts` agora é um BARREL — reexporta tipos e funções dos 4 módulos fragmentados:
//   - contract-id.ts
//   - amendment-id.ts
//   - document-id.ts
//   - user-ref.ts
// (CTR-SHARED-VO-CANONICAL CA-5)
//
// Cobertura comportamental (generate/rehydrate) está em arquivos próprios.
// Este arquivo cobre APENAS o contrato do barrel: tipos importáveis + reexports
// de funções com nomes prefixados (Padrão D não permite `import * as` em barrel
// porque colidiria com 4 namespaces — então o barrel exporta funções já prefixadas).
import * as IdsBarrel from '#src/modules/contracts/domain/shared/ids.ts';

describe('ids.ts — barrel reexport', () => {
  it('reexports type-level identifiers (compile-time)', () => {
    // Arrange — checagem em compile-time via referência de tipo
    type _CheckContractId = IdsBarrel.ContractId;
    type _CheckAmendmentId = IdsBarrel.AmendmentId;
    type _CheckDocumentId = IdsBarrel.DocumentId;
    // UserRef foi promovido para src/shared/kernel/ (CTR-DOMAIN-RESTRUCTURE) — não mais no barrel ids
    // Act / Assert — se compila, passa
    assert.equal(true, true);
  });

  it('reexports prefixed factory functions from the 4 fragmented modules', () => {
    // Arrange
    const ns: Readonly<Record<string, unknown>> = IdsBarrel;
    // Act / Assert — funções com prefixo do VO (não namespaces aninhados)
    assert.equal(typeof ns.contractIdGenerate, 'function');
    assert.equal(typeof ns.contractIdRehydrate, 'function');
    assert.equal(typeof ns.amendmentIdGenerate, 'function');
    assert.equal(typeof ns.amendmentIdRehydrate, 'function');
    assert.equal(typeof ns.documentIdGenerate, 'function');
    assert.equal(typeof ns.documentIdRehydrate, 'function');
    // CTR-DOMAIN-RESTRUCTURE — UserRef promovido para src/shared/kernel/user-ref.ts;
    // não mais re-exportado pelo barrel BC-specific de ids.
  });

  it("does NOT expose nested namespace-objects (DON'T B§7)", () => {
    // Arrange / Act
    const ns: Readonly<Record<string, unknown>> = IdsBarrel;
    // Assert — sem `ns.ContractId = {...}` antigo
    assert.equal(ns.ContractId, undefined);
    assert.equal(ns.AmendmentId, undefined);
    assert.equal(ns.DocumentId, undefined);
    assert.equal(ns.UserRef, undefined);
  });
});
