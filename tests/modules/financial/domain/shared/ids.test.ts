import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// `ids.ts` agora é um BARREL — reexporta tipos e funções dos 3 módulos do
// módulo Financial:
//   - payable-id.ts
//   - remittance-id.ts
//   - bank-transaction-id.ts
//
// Cobertura comportamental (generate/rehydrate) está em arquivos próprios.
// Este arquivo cobre APENAS o contrato do barrel: tipos importáveis +
// reexports de funções com nomes prefixados (Padrão D não permite
// `import * as` em barrel porque colidiria com 3 namespaces — então o
// barrel exporta funções já prefixadas).
import * as IdsBarrel from '#src/modules/financial/domain/shared/ids.ts';

describe('financial/ids.ts — barrel reexport', () => {
  it('reexports type-level identifiers (compile-time)', () => {
    // Arrange — checagem em compile-time via referência de tipo
    type _CheckPayableId = IdsBarrel.PayableId;
    type _CheckRemittanceId = IdsBarrel.RemittanceId;
    type _CheckBankTransactionId = IdsBarrel.BankTransactionId;
    // Act / Assert — se compila, passa
    assert.equal(true, true);
  });

  it('reexports prefixed factory functions from the 3 fragmented modules', () => {
    // Arrange
    const ns: Readonly<Record<string, unknown>> = IdsBarrel;
    // Act / Assert — funções com prefixo do VO (não namespaces aninhados)
    assert.equal(typeof ns.payableIdGenerate, 'function');
    assert.equal(typeof ns.payableIdRehydrate, 'function');
    assert.equal(typeof ns.remittanceIdGenerate, 'function');
    assert.equal(typeof ns.remittanceIdRehydrate, 'function');
    assert.equal(typeof ns.bankTransactionIdGenerate, 'function');
    assert.equal(typeof ns.bankTransactionIdRehydrate, 'function');
  });

  it("does NOT expose nested namespace-objects (DON'T B§7)", () => {
    // Arrange / Act
    const ns: Readonly<Record<string, unknown>> = IdsBarrel;
    // Assert — sem `ns.PayableId = {...}` etc.
    assert.equal(ns.PayableId, undefined);
    assert.equal(ns.RemittanceId, undefined);
    assert.equal(ns.BankTransactionId, undefined);
  });
});
