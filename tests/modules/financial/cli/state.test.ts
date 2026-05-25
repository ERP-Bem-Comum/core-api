/**
 * Testes do state file da CLI do módulo Financial.
 *
 * Ticket FIN-CLI-SCAFFOLD (W0 — RED).
 *
 * Cobre CA-13..CA-16 do `.claude/.pipeline/FIN-CLI-SCAFFOLD/000-request.md`:
 *   - Round-trip: save → load preserva Payable (id + status)
 *   - state-file-not-readable: load com path inexistente
 *   - state-file-corrupted: load com JSON malformado
 *   - acquireStateLock/releaseStateLock: lock exclusivo + release + re-acquire
 *
 * Pattern de referência: `src/modules/contracts/cli/state.ts` (acquireStateLock via openSync 'wx').
 *
 * Estado esperado em W0: RED — `src/modules/financial/cli/state.ts` ainda não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import * as SourceDocumentRef from '#src/modules/financial/domain/shared/source-document-ref.ts';
import * as BeneficiaryBankData from '#src/modules/financial/domain/shared/beneficiary-bank-data.ts';
import * as TaxId from '#src/modules/financial/domain/shared/tax-id.ts';
import { Payable } from '#src/modules/financial/domain/payable/payable.ts';
import type { OpenPayable } from '#src/modules/financial/domain/payable/types.ts';

import { InMemoryPayableRepository } from '#src/modules/financial/adapters/persistence/repos/payable-repository.in-memory.ts';
import {
  loadState,
  saveState,
  acquireStateLock,
  releaseStateLock,
} from '#src/modules/financial/cli/state.ts';

// ─── Fixtures ──────────────────────────────────────────────────────────────

const D = (iso: string): Date => new Date(iso);

const buildBeneficiary = (): BeneficiaryBankData.BeneficiaryBankData => {
  const taxId = TaxId.fromCpf('11144477735');
  if (!taxId.ok) throw new Error(`fixture TaxId broken: ${taxId.error}`);
  const r = BeneficiaryBankData.fromRaw({
    bankCode: '341',
    agency: '1234-5',
    account: '12345-6',
    holderTaxId: taxId.value,
    holderName: 'Fornecedor X Ltda',
  });
  if (!r.ok) throw new Error(`fixture Beneficiary broken: ${r.error}`);
  return r.value;
};

const buildOpenPayable = (): OpenPayable => {
  const moneyR = Money.fromCents(15050);
  if (!moneyR.ok) throw new Error('fixture Money broken');
  const r = Payable.open({
    id: PayableId.generate(),
    sourceDocumentId: SourceDocumentRef.generate(),
    kind: 'Principal',
    paymentMethod: 'BankRemittance',
    beneficiary: buildBeneficiary(),
    value: moneyR.value,
    dueDate: D('2026-06-15T00:00:00Z'),
    openedAt: D('2026-05-20T00:00:00Z'),
  });
  if (!r.ok) throw new Error(`fixture Open broken: ${JSON.stringify(r.error)}`);
  return r.value.payable;
};

// Cria um diretório temporário isolado por chamada — evita conflitos entre runs.
const makeTmpDir = (): string => mkdtempSync(join(tmpdir(), 'fin-cli-state-test-'));

// ─── Testes ───────────────────────────────────────────────────────────────

describe('financial/cli state — round-trip (CA-13/14)', () => {
  it('save + load preserva Payable (id + status)', async () => {
    const dir = makeTmpDir();
    try {
      const statePath = join(dir, 'state.json');
      const seed = buildOpenPayable();

      // Seed via primeiro handle (sem outbox observado — usa default).
      const handle1 = InMemoryPayableRepository();
      await handle1.repo.save(seed, []);
      const saved = saveState(statePath, handle1);
      assert.equal(isOk(saved), true);

      // Load via segundo handle (isolado) e verifica que o Payable foi reidratado.
      const handle2 = InMemoryPayableRepository();
      const loaded = loadState(statePath, handle2);
      assert.equal(isOk(loaded), true);

      const listR = await handle2.repo.list();
      assert.equal(isOk(listR), true);
      if (listR.ok) {
        assert.equal(listR.value.length, 1, 'state file deve restaurar 1 Payable');
        const first = listR.value[0];
        assert.ok(first !== undefined);
        assert.equal(first.id, seed.id, 'id preservado');
        assert.equal(first.status, 'Open', 'status preservado');
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('financial/cli state — error paths (CA-13)', () => {
  it('loadState com path inexistente → ok(undefined) (primeira execução, arquivo criado depois por saveState)', () => {
    const dir = makeTmpDir();
    try {
      const handle = InMemoryPayableRepository();
      const r = loadState(join(dir, 'nope.json'), handle);
      assert.equal(isOk(r), true, 'arquivo ausente é tratado como CLI novo, não como erro');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('loadState com path para diretório → state-file-not-readable', () => {
    const dir = makeTmpDir();
    try {
      const handle = InMemoryPayableRepository();
      // Path aponta para o próprio dir (não é arquivo regular)
      const r = loadState(dir, handle);
      assert.equal(isErr(r), true);
      if (!r.ok) assert.equal(r.error, 'state-file-not-readable');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('loadState com JSON malformado → state-file-corrupted', () => {
    const dir = makeTmpDir();
    try {
      const statePath = join(dir, 'corrupted.json');
      writeFileSync(statePath, '{ "payables": [ not valid JSON', 'utf-8');
      const handle = InMemoryPayableRepository();
      const r = loadState(statePath, handle);
      assert.equal(isErr(r), true);
      if (!r.ok) assert.equal(r.error, 'state-file-corrupted');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('financial/cli state — lock (CA-15)', () => {
  it('acquireStateLock exclusivo + releaseStateLock libera + re-acquire OK', () => {
    const dir = makeTmpDir();
    try {
      const statePath = join(dir, 'locktest.json');

      const lock1 = acquireStateLock(statePath);
      assert.equal(isOk(lock1), true, 'primeira aquisição deve ter sucesso');

      const lock2 = acquireStateLock(statePath);
      assert.equal(isErr(lock2), true, 'segunda aquisição (sem release) deve falhar');
      if (!lock2.ok) assert.equal(lock2.error, 'state-concurrent-lock');

      if (lock1.ok) releaseStateLock(lock1.value);

      const lock3 = acquireStateLock(statePath);
      assert.equal(isOk(lock3), true, 'aquisição após release deve ter sucesso');
      if (lock3.ok) releaseStateLock(lock3.value);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
