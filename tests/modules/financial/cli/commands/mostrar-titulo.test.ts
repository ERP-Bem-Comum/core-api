/**
 * Testes E2E do subcomando `mostrar-titulo` da CLI do módulo Financial.
 *
 * Ticket FIN-CLI-MOSTRAR-TITULO (W0 — RED).
 *
 * Cobre CAs 19..25 do `.claude/.pipeline/FIN-CLI-MOSTRAR-TITULO/000-request.md`:
 *   CA-19: happy path Open — stdout cita ID, "Aberto", data BR, BRL formatado, beneficiário
 *   CA-20: happy path Approved — stdout cita "Aprovado" + "Aprovado em" + "Aprovado por"
 *   CA-21: happy path PaidFromBank — stdout cita "Pago" + "FITID" + "Data bancária"
 *   CA-22: --help → stdout exit 0 com flags
 *   CA-23: flag obrigatória ausente → exit 64
 *   CA-24: --payable-id inválido → exit 1 "ID do título inválido"
 *   CA-25: --payable-id válido sem persistência → exit 1 "Título não encontrado"
 *
 * Pattern de referência:
 *   - `tests/modules/financial/cli/commands/aprovar-titulo.test.ts` (fixtures + seedState)
 *   - `tests/modules/financial/adapters/persistence/payable-repository.suite.ts` (chain Bank-Paid)
 *
 * Estado esperado em W0: RED — `mostrar-titulo` ausente do REGISTRY (todos
 * 7 it's caem em "Subcomando desconhecido" exit 64).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import * as SourceDocumentRef from '#src/modules/financial/domain/shared/source-document-ref.ts';
import * as BeneficiaryBankData from '#src/modules/financial/domain/shared/beneficiary-bank-data.ts';
import * as TaxId from '#src/modules/financial/domain/shared/tax-id.ts';
import * as FITID from '#src/modules/financial/domain/shared/fitid.ts';
import * as RemittanceId from '#src/modules/financial/domain/shared/remittance-id.ts';
import { Payable } from '#src/modules/financial/domain/payable/payable.ts';
import type {
  OpenPayable,
  ApprovedPayable,
  PaidFromBankPayable,
} from '#src/modules/financial/domain/payable/types.ts';

import { InMemoryPayableRepository } from '#src/modules/financial/adapters/persistence/repos/payable-repository.in-memory.ts';
import { saveState } from '#src/modules/financial/cli/state.ts';

import { runFinancialCli } from '../../../../cli/helpers/run-financial-cli.ts';

// ─── Fixtures (REUSADAS do aprovar-titulo.test.ts) ────────────────────────────

const D = (iso: string): Date => new Date(iso);

const APPROVER_UUID = 'a1b2c3d4-5678-4abc-9def-fedcba987654';

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

const buildMoney = (cents = 15050): Money.Money => {
  const r = Money.fromCents(cents);
  if (!r.ok) throw new Error(`fixture Money broken: ${r.error}`);
  return r.value;
};

const buildOpenPayable = (): OpenPayable => {
  const r = Payable.open({
    id: PayableId.generate(),
    sourceDocumentId: SourceDocumentRef.generate(),
    kind: 'Principal',
    paymentMethod: 'BankRemittance',
    beneficiary: buildBeneficiary(),
    value: buildMoney(),
    dueDate: D('2026-06-15T00:00:00Z'),
    openedAt: D('2026-05-20T00:00:00Z'),
  });
  if (!r.ok) throw new Error(`fixture Open broken: ${JSON.stringify(r.error)}`);
  return r.value.payable;
};

const buildApprovedPayable = (): ApprovedPayable => {
  const open = buildOpenPayable();
  const approver = UserRef.rehydrate(APPROVER_UUID);
  if (!approver.ok) throw new Error('fixture UserRef broken');
  const r = Payable.approve(open, approver.value, D('2026-05-25T10:00:00Z'));
  if (!r.ok) throw new Error(`fixture approve broken: ${JSON.stringify(r.error)}`);
  return r.value.payable;
};

// CA-21 — NOVO: chain real Open → Approved → Transmitted → PaidFromBank.
// Pattern do `payable-repository.suite.ts:buildBankPaidPayable`.
const buildPaidFromBankPayable = (fitidStr: string): PaidFromBankPayable => {
  const approved = buildApprovedPayable();
  const transmitted = Payable.transmit(
    approved,
    RemittanceId.generate(),
    D('2026-05-26T10:00:00Z'),
  );
  if (!transmitted.ok)
    throw new Error(`fixture transmit broken: ${JSON.stringify(transmitted.error)}`);

  const fitid = FITID.fromString(fitidStr);
  if (!fitid.ok) throw new Error(`fixture FITID broken: ${fitid.error}`);

  const paid = Payable.processBankOutflow(
    transmitted.value.payable,
    fitid.value,
    D('2026-05-27T00:00:00Z'), // bankPaymentDate
    D('2026-05-27T12:00:00Z'), // occurredAt
  );
  if (!paid.ok) throw new Error(`fixture processBankOutflow broken: ${JSON.stringify(paid.error)}`);
  const p = paid.value.payable;
  if (p.paidVia !== 'Bank') throw new Error('expected PaidFromBank');
  return p;
};

const makeTmpDir = (): string => mkdtempSync(join(tmpdir(), 'fin-cli-mostrar-test-'));

const seedState = (
  statePath: string,
  payable: OpenPayable | ApprovedPayable | PaidFromBankPayable,
): void => {
  const handle = InMemoryPayableRepository();
  // `void` desativa `no-floating-promises`: InMemory é síncrono.
  void handle.repo.save(payable, []);
  const r = saveState(statePath, handle);
  if (!r.ok) throw new Error(`seed broken: ${r.error}`);
};

// ─── Testes ────────────────────────────────────────────────────────────────

describe('mostrar-titulo — happy path Open (CA-19)', () => {
  it('CA-19: stdout cita ID, "Aberto", data BR (DD/MM/YYYY), BRL formatado, beneficiário', () => {
    const dir = makeTmpDir();
    try {
      const statePath = join(dir, 'state.json');
      const seed = buildOpenPayable();
      seedState(statePath, seed);

      const { stdout, stderr, exitCode } = runFinancialCli([
        'mostrar-titulo',
        '--state',
        statePath,
        '--payable-id',
        seed.id as string,
      ]);

      assert.equal(exitCode, 0, `exit 0 esperado, recebido ${exitCode}. stderr=${stderr}`);
      assert.match(stdout, new RegExp(seed.id as string), 'stdout deve citar o ID');
      assert.match(stdout, /Aberto/, 'stdout deve citar status "Aberto"');
      // dueDate '2026-06-15' → BR '15/06/2026'.
      assert.match(stdout, /15\/06\/2026/, 'stdout deve citar dueDate em formato BR');
      // 15050 cents → R$ 150,50 BRL.
      assert.match(stdout, /R\$\s*150,50/, 'stdout deve citar valor BRL formatado');
      // Beneficiário: nome + CPF formatado/legível.
      assert.match(stdout, /Fornecedor X Ltda/, 'stdout deve citar nome do beneficiário');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('mostrar-titulo — happy path Approved (CA-20)', () => {
  it('CA-20: stdout cita "Aprovado" + "Aprovado em" + "Aprovado por"', () => {
    const dir = makeTmpDir();
    try {
      const statePath = join(dir, 'state.json');
      const seed = buildApprovedPayable();
      seedState(statePath, seed);

      const { stdout, stderr, exitCode } = runFinancialCli([
        'mostrar-titulo',
        '--state',
        statePath,
        '--payable-id',
        seed.id as string,
      ]);

      assert.equal(exitCode, 0, `exit 0 esperado, recebido ${exitCode}. stderr=${stderr}`);
      assert.match(stdout, /Aprovado/, 'stdout deve citar status "Aprovado"');
      // approvedAt '2026-05-25' → BR '25/05/2026'.
      assert.match(
        stdout,
        /Aprovado em:\s*25\/05\/2026/i,
        'stdout deve citar "Aprovado em: DD/MM/YYYY"',
      );
      assert.match(
        stdout,
        new RegExp(`Aprovado por:\\s*${APPROVER_UUID}`, 'i'),
        'stdout deve citar "Aprovado por: <uuid>"',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('mostrar-titulo — happy path PaidFromBank (CA-21)', () => {
  it('CA-21: stdout cita "Pago" + "FITID" + "Data bancária"', () => {
    const dir = makeTmpDir();
    try {
      const statePath = join(dir, 'state.json');
      const seed = buildPaidFromBankPayable('FITID-MOSTRAR-123');
      seedState(statePath, seed);

      const { stdout, stderr, exitCode } = runFinancialCli([
        'mostrar-titulo',
        '--state',
        statePath,
        '--payable-id',
        seed.id as string,
      ]);

      assert.equal(exitCode, 0, `exit 0 esperado, recebido ${exitCode}. stderr=${stderr}`);
      assert.match(stdout, /Pago/, 'stdout deve citar status "Pago"');
      assert.match(stdout, /FITID:\s*FITID-MOSTRAR-123/i, 'stdout deve citar o FITID');
      // bankPaymentDate '2026-05-27' → BR '27/05/2026'.
      assert.match(
        stdout,
        /Data bancária:\s*27\/05\/2026/i,
        'stdout deve citar "Data bancária: DD/MM/YYYY"',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('mostrar-titulo — help (CA-22)', () => {
  it('CA-22: --help imprime ajuda em stdout exit 0', () => {
    const { stdout, stderr, exitCode } = runFinancialCli(['mostrar-titulo', '--help']);
    assert.equal(exitCode, 0, `exit 0 esperado, recebido ${exitCode}. stderr=${stderr}`);
    assert.match(stdout, /Uso:\s*mostrar-titulo/i, 'help deve citar cabeçalho');
    assert.match(stdout, /--payable-id/, 'help deve mencionar --payable-id');
  });
});

describe('mostrar-titulo — flag obrigatória ausente (CA-23)', () => {
  it('CA-23: sem --payable-id → exit 64 stderr "Flag obrigatória ausente: --payable-id"', () => {
    const { stdout, stderr, exitCode } = runFinancialCli(['mostrar-titulo', '--no-state']);
    assert.equal(exitCode, 64, `exit 64 esperado, recebido ${exitCode}`);
    assert.equal(stdout, '', 'stdout deve estar vazio');
    assert.match(
      stderr,
      /Flag obrigatória ausente:\s*--payable-id/,
      'stderr deve reportar --payable-id ausente',
    );
  });
});

describe('mostrar-titulo — invalid id (CA-24)', () => {
  it('CA-24: --payable-id não-UUID → exit 1 "ID do título inválido"', () => {
    const { stdout, stderr, exitCode } = runFinancialCli([
      'mostrar-titulo',
      '--no-state',
      '--payable-id',
      'not-a-uuid',
    ]);
    assert.equal(exitCode, 1, `exit 1 esperado, recebido ${exitCode}`);
    assert.equal(stdout, '', 'stdout deve estar vazio');
    assert.match(stderr, /ID do título inválido/i, 'stderr deve formatar payable-id-invalid');
  });
});

describe('mostrar-titulo — not found (CA-25)', () => {
  it('CA-25: --payable-id válido sem persistência → exit 1 "Título não encontrado"', () => {
    const orphanId = randomUUID();
    const { stdout, stderr, exitCode } = runFinancialCli([
      'mostrar-titulo',
      '--no-state',
      '--payable-id',
      orphanId,
    ]);
    assert.equal(exitCode, 1, `exit 1 esperado, recebido ${exitCode}`);
    assert.equal(stdout, '', 'stdout deve estar vazio');
    assert.match(stderr, /Título não encontrado/i, 'stderr deve formatar payable-not-found');
  });
});
