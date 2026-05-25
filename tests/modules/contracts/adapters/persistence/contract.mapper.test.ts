/**
 * CTR-DOMAIN-STATE-MACHINE-CONTRACT — W0 RED — CA5: mapper round-trip por subtipo
 * CTR-DOMAIN-MAPPER-RESULT        — W0 RED — CA6: tagged errors com payload de evidência
 *
 * `contractFromRow` atual retorna sempre `ok(contract)` com cast inseguro
 * `as unknown as Contract`. Após W1, o mapper decide o subtipo via switch
 * exaustivo em `row.status` e rejeita shapes impossíveis:
 *   - Active + endedAt != null → err({ tag: 'ContractMapperInvalidEndedAt', status: 'Active', endedAtPresent: true })
 *   - Expired/Terminated + endedAt == null → err({ tag: 'ContractMapperInvalidEndedAt', status, endedAtPresent: false })
 *
 * Estado W0 (RED — CTR-DOMAIN-STATE-MACHINE-CONTRACT):
 *   Os casos de shapes impossíveis falham porque o mapper atual retorna ok para todos.
 *
 * Estado W0 (RED — CTR-DOMAIN-MAPPER-RESULT):
 *   Os asserts de payload (.tag, .status, .endedAtPresent, .attemptedValue) e o novo
 *   teste de id inválido falham porque ContractMapperError ainda é string literal union
 *   — `r.error.tag` resolve undefined em runtime (string não tem propriedade `tag`).
 *
 * Estado W1 (GREEN): mapper refatorado com tagged records + case constructors passa tudo.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr } from '#src/shared/index.ts';
import { contractFromRow } from '#src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts';
import type { ContractRow } from '#src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts';

// ─── Helpers de fixture de row ────────────────────────────────────────────────

const BASE_ROW: Omit<ContractRow, 'status' | 'endedAt'> = {
  id: '11111111-1111-4111-8111-111111111111',
  sequentialNumber: '001/2026',
  title: 'Contrato mapper test',
  objective: 'Validar subtipo no round-trip',
  signedAt: new Date('2026-01-15T00:00:00.000Z'),
  originalValueCents: 10_000_000,
  originalPeriodKind: 'Fixed',
  originalPeriodStart: new Date('2026-01-15T00:00:00.000Z'),
  originalPeriodEnd: new Date('2026-12-31T00:00:00.000Z'),
  currentValueCents: 10_000_000,
  currentPeriodKind: 'Fixed',
  currentPeriodStart: new Date('2026-01-15T00:00:00.000Z'),
  currentPeriodEnd: new Date('2026-12-31T00:00:00.000Z'),
};

const activeRow = (): ContractRow => ({
  ...BASE_ROW,
  status: 'Active',
  endedAt: null,
});

const expiredRowValid = (): ContractRow => ({
  ...BASE_ROW,
  status: 'Expired',
  endedAt: new Date('2027-01-01T00:00:00.000Z'),
});

const terminatedRowValid = (): ContractRow => ({
  ...BASE_ROW,
  status: 'Terminated',
  endedAt: new Date('2026-06-15T00:00:00.000Z'),
});

/** Shape impossível: Active com endedAt preenchido (CA5 — DON'T C§29). */
const activeRowWithEndedAt = (): ContractRow => ({
  ...BASE_ROW,
  status: 'Active',
  endedAt: new Date('2026-06-15T00:00:00.000Z'),
});

/** Shape impossível: Expired sem endedAt (CA5 — DON'T C§29). */
const expiredRowNoEndedAt = (): ContractRow => ({
  ...BASE_ROW,
  status: 'Expired',
  endedAt: null,
});

/** Shape impossível: Terminated sem endedAt (CA5 — DON'T C§29). */
const terminatedRowNoEndedAt = (): ContractRow => ({
  ...BASE_ROW,
  status: 'Terminated',
  endedAt: null,
});

// ─── CA5-a: shapes válidos retornam ok com o subtipo correto ─────────────────

describe('contractFromRow — shapes válidos (CA5)', () => {
  it('Active + endedAt null → ok com status Active', () => {
    // Arrange
    const row = activeRow();
    // Act
    const r = contractFromRow(row, []);
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.status, 'Active');
    // Após W1: ActiveContract não tem endedAt — campo ausente em runtime
    assert.equal('endedAt' in r.value, false, 'ActiveContract não deve expor endedAt após W1');
  });

  it('Expired + endedAt Date → ok com status Expired e endedAt preservado', () => {
    // Arrange
    const row = expiredRowValid();
    // Act
    const r = contractFromRow(row, []);
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.status, 'Expired');
    // Após W1: ExpiredContract tem endedAt obrigatório
    assert.equal('endedAt' in r.value, true, 'ExpiredContract deve expor endedAt');
    if ('endedAt' in r.value) {
      assert.equal(
        (r.value.endedAt as Date).getTime(),
        row.endedAt!.getTime(),
        'endedAt deve ser preservado no round-trip',
      );
    }
  });

  it('Terminated + endedAt Date → ok com status Terminated e endedAt preservado', () => {
    // Arrange
    const row = terminatedRowValid();
    // Act
    const r = contractFromRow(row, []);
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.status, 'Terminated');
    assert.equal('endedAt' in r.value, true, 'TerminatedContract deve expor endedAt');
    if ('endedAt' in r.value) {
      assert.equal((r.value.endedAt as Date).getTime(), row.endedAt!.getTime());
    }
  });
});

// ─── CA5-b / CA6: shapes impossíveis retornam err tagged com payload ──────────
//
// Em W0 (CTR-DOMAIN-STATE-MACHINE-CONTRACT): isErr(r) falha porque o mapper
//   retorna ok para todos os shapes (mapper antigo, antes do refactor).
//
// Em W0 (CTR-DOMAIN-MAPPER-RESULT): r.error.tag falha adicionalmente porque
//   ContractMapperError ainda é string literal — string não tem propriedade `tag`.
//   Após W1: ContractMapperInvalidEndedAt = { tag, status, endedAtPresent }.

describe("contractFromRow — shapes impossíveis rejeitados com tagged error (CA5 + CA6 — DON'T C§29)", () => {
  it("Active + endedAt != null → err({ tag: 'ContractMapperInvalidEndedAt', status: 'Active', endedAtPresent: true })", () => {
    // Arrange
    const row = activeRowWithEndedAt();
    // Act
    const r = contractFromRow(row, []);
    // Assert
    assert.equal(isErr(r), true, 'Active com endedAt preenchido deve ser rejeitado pelo mapper');
    if (!r.ok) {
      // W0 RED (CTR-DOMAIN-MAPPER-RESULT): r.error é string — .tag === undefined, falha aqui
      assert.equal(
        (r.error as unknown as { tag: string }).tag,
        'ContractMapperInvalidEndedAt',
        "tag deve ser 'ContractMapperInvalidEndedAt'",
      );
      assert.equal(
        (r.error as unknown as { status: string }).status,
        'Active',
        'payload.status deve espelhar o status do row',
      );
      assert.equal(
        (r.error as unknown as { endedAtPresent: boolean }).endedAtPresent,
        true,
        'payload.endedAtPresent deve ser true quando endedAt estava preenchido',
      );
    }
  });

  it("Expired + endedAt null → err({ tag: 'ContractMapperInvalidEndedAt', status: 'Expired', endedAtPresent: false })", () => {
    // Arrange
    const row = expiredRowNoEndedAt();
    // Act
    const r = contractFromRow(row, []);
    // Assert
    assert.equal(isErr(r), true, 'Expired com endedAt nulo deve ser rejeitado pelo mapper');
    if (!r.ok) {
      assert.equal((r.error as unknown as { tag: string }).tag, 'ContractMapperInvalidEndedAt');
      assert.equal((r.error as unknown as { status: string }).status, 'Expired');
      assert.equal(
        (r.error as unknown as { endedAtPresent: boolean }).endedAtPresent,
        false,
        'payload.endedAtPresent deve ser false quando endedAt era null',
      );
    }
  });

  it("Terminated + endedAt null → err({ tag: 'ContractMapperInvalidEndedAt', status: 'Terminated', endedAtPresent: false })", () => {
    // Arrange
    const row = terminatedRowNoEndedAt();
    // Act
    const r = contractFromRow(row, []);
    // Assert
    assert.equal(isErr(r), true, 'Terminated com endedAt nulo deve ser rejeitado pelo mapper');
    if (!r.ok) {
      assert.equal((r.error as unknown as { tag: string }).tag, 'ContractMapperInvalidEndedAt');
      assert.equal((r.error as unknown as { status: string }).status, 'Terminated');
      assert.equal((r.error as unknown as { endedAtPresent: boolean }).endedAtPresent, false);
    }
  });
});

// ─── NOVO: CA6 — DB corrompido: id inválido → payload ContractMapperInvalidId ─
//
// W0 RED (CTR-DOMAIN-MAPPER-RESULT): ContractMapperError ainda é string literal.
//   `r.error.tag` resolve undefined, assert falha.
// W1 GREEN: contractFromRow emite err(contractMapperInvalidId(row.id)) onde
//   contractMapperInvalidId = (v) => ({ tag: 'ContractMapperInvalidId', attemptedValue: v }).

describe('contractFromRow — DB corrompido: id inválido (CA6 — tagged payload)', () => {
  it("row com id que não é UUID v4 → err({ tag: 'ContractMapperInvalidId', attemptedValue: '<string ruim>' })", () => {
    // Arrange — row sintaticamente válido mas id não é UUID v4
    const BAD_ID = 'not-a-valid-uuid';
    const row: ContractRow = {
      ...BASE_ROW,
      id: BAD_ID,
      status: 'Active',
      endedAt: null,
    };
    // Act
    const r = contractFromRow(row, []);
    // Assert
    assert.equal(isErr(r), true, 'row com id inválido deve ser rejeitado');
    if (!r.ok) {
      // W0 RED: r.error é string — .tag === undefined, falha aqui
      assert.equal(
        (r.error as unknown as { tag: string }).tag,
        'ContractMapperInvalidId',
        "tag deve ser 'ContractMapperInvalidId'",
      );
      assert.equal(
        (r.error as unknown as { attemptedValue: string }).attemptedValue,
        BAD_ID,
        'payload.attemptedValue deve carregar a string que causou a falha',
      );
    }
  });

  it("row com amendment id inválido no array → err({ tag: 'ContractMapperInvalidAmendmentId', attemptedValue })", () => {
    // Arrange — row do contrato válido, mas lista de aditivos contém UUID inválido
    const BAD_AMD_ID = 'invalid-amendment-uuid';
    const row: ContractRow = {
      ...BASE_ROW,
      status: 'Active',
      endedAt: null,
    };
    // Act
    const r = contractFromRow(row, [BAD_AMD_ID]);
    // Assert
    assert.equal(isErr(r), true, 'amendment id inválido deve rejeitar o mapper');
    if (!r.ok) {
      assert.equal((r.error as unknown as { tag: string }).tag, 'ContractMapperInvalidAmendmentId');
      assert.equal((r.error as unknown as { attemptedValue: string }).attemptedValue, BAD_AMD_ID);
    }
  });
});
