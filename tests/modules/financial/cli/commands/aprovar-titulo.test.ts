/**
 * Testes E2E do subcomando `aprovar-titulo` da CLI do módulo Financial.
 *
 * Ticket FIN-CLI-APROVAR-TITULO (W0 — RED).
 *
 * Cobre CAs 15..20 do `.claude/.pipeline/FIN-CLI-APROVAR-TITULO/000-request.md`:
 *   CA-15: happy path — Open → Approved + state file atualizado
 *   CA-16: --help imprime ajuda em stdout exit 0
 *   CA-17: flag obrigatória ausente → exit 64
 *   CA-18: --payable-id inválido → exit 1 "ID do título inválido"
 *   CA-19: --payable-id válido mas não persistido → exit 1 "Título não encontrado"
 *   CA-20: payable já Approved → exit 1 com interpolação inline
 *          "Título não está em estado Aberto (status atual: Approved)."
 *          (valida CA-8b — tratamento inline no run, sem mudar formatter global)
 *
 * Pattern de referência:
 *   - `tests/cli/contracts.cli.test.ts` (E2E via subprocess + state file tmp)
 *   - `tests/modules/financial/cli/state.test.ts` (mkdtempSync + finally rmSync)
 *   - `tests/modules/financial/application/use-cases/approve-payable.test.ts` (fixtures Payable real)
 *
 * Estado esperado em W0: RED — `aprovar-titulo` ainda não existe no REGISTRY;
 * todos os 6 it's caem em "Subcomando desconhecido: aprovar-titulo" exit 64.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import * as Money from '#src/shared/kernel/money.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import * as SourceDocumentRef from '#src/modules/financial/domain/shared/source-document-ref.ts';
import * as BeneficiaryBankData from '#src/modules/financial/domain/shared/beneficiary-bank-data.ts';
import * as TaxId from '#src/modules/financial/domain/shared/tax-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { Payable } from '#src/modules/financial/domain/payable/payable.ts';
import type { OpenPayable, ApprovedPayable } from '#src/modules/financial/domain/payable/types.ts';

import { InMemoryPayableRepository } from '#src/modules/financial/adapters/persistence/repos/payable-repository.in-memory.ts';
import { saveState } from '#src/modules/financial/cli/state.ts';

import { runFinancialCli } from '../../../../cli/helpers/run-financial-cli.ts';

// ─── Fixtures ──────────────────────────────────────────────────────────────

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

const makeTmpDir = (): string => mkdtempSync(join(tmpdir(), 'fin-cli-aprovar-test-'));

const seedState = (statePath: string, payable: OpenPayable | ApprovedPayable): void => {
  const handle = InMemoryPayableRepository();
  // `void` desativa `no-floating-promises`: InMemory é síncrono — a Promise
  // é micro-task que já resolveu quando saveState lê o store. Pattern do
  // contracts/cli/state.ts:374-376 (`void contractRepo.repo.save(c, [])`).
  void handle.repo.save(payable, []);
  const r = saveState(statePath, handle);
  if (!r.ok) throw new Error(`seed broken: ${r.error}`);
};

// ─── Testes ────────────────────────────────────────────────────────────────

describe('aprovar-titulo — happy path (CA-15)', () => {
  it('CA-15: Open → Approved + state file atualizado', () => {
    const dir = makeTmpDir();
    try {
      const statePath = join(dir, 'state.json');
      const seed = buildOpenPayable();
      seedState(statePath, seed);

      const { stdout, stderr, exitCode } = runFinancialCli([
        'aprovar-titulo',
        '--state',
        statePath,
        '--payable-id',
        seed.id as string,
        '--approved-by',
        APPROVER_UUID,
      ]);

      assert.equal(exitCode, 0, `exit 0 esperado, recebido ${exitCode}. stderr=${stderr}`);
      assert.match(stdout, /✅ Título aprovado/, 'stdout deve confirmar aprovação');
      assert.match(stdout, /Status:\s+Approved/, 'stdout deve citar status Approved');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('aprovar-titulo — help (CA-16)', () => {
  it('CA-16: --help imprime ajuda em stdout exit 0', () => {
    const { stdout, stderr, exitCode } = runFinancialCli(['aprovar-titulo', '--help']);
    assert.equal(exitCode, 0, `exit 0 esperado, recebido ${exitCode}. stderr=${stderr}`);
    assert.match(stdout, /Flags obrigatórias/i, 'help deve listar flags obrigatórias');
    assert.match(stdout, /--payable-id/, 'help deve mencionar --payable-id');
    assert.match(stdout, /--approved-by/, 'help deve mencionar --approved-by');
  });
});

describe('aprovar-titulo — flag obrigatória ausente (CA-17)', () => {
  it('CA-17: sem --payable-id → exit 64 stderr "Flag obrigatória ausente: --payable-id"', () => {
    const { stdout, stderr, exitCode } = runFinancialCli([
      'aprovar-titulo',
      '--no-state',
      '--approved-by',
      APPROVER_UUID,
    ]);
    assert.equal(exitCode, 64, `exit 64 esperado, recebido ${exitCode}`);
    assert.equal(stdout, '', 'stdout deve estar vazio');
    assert.match(
      stderr,
      /Flag obrigatória ausente:\s*--payable-id/,
      'stderr deve reportar --payable-id ausente',
    );
  });
});

describe('aprovar-titulo — invalid id (CA-18)', () => {
  it('CA-18: --payable-id não-UUID → exit 1 "ID do título inválido"', () => {
    const { stdout, stderr, exitCode } = runFinancialCli([
      'aprovar-titulo',
      '--no-state',
      '--payable-id',
      'not-a-uuid',
      '--approved-by',
      APPROVER_UUID,
    ]);
    assert.equal(exitCode, 1, `exit 1 esperado, recebido ${exitCode}`);
    assert.equal(stdout, '', 'stdout deve estar vazio');
    assert.match(
      stderr,
      /ID do título inválido/i,
      'stderr deve formatar approve-payable-invalid-id',
    );
  });
});

describe('aprovar-titulo — not found (CA-19)', () => {
  it('CA-19: --payable-id válido mas não persistido → exit 1 "Título não encontrado"', () => {
    const orphanId = randomUUID();
    const { stdout, stderr, exitCode } = runFinancialCli([
      'aprovar-titulo',
      '--no-state',
      '--payable-id',
      orphanId,
      '--approved-by',
      APPROVER_UUID,
    ]);
    assert.equal(exitCode, 1, `exit 1 esperado, recebido ${exitCode}`);
    assert.equal(stdout, '', 'stdout deve estar vazio');
    assert.match(
      stderr,
      /Título não encontrado/i,
      'stderr deve formatar approve-payable-not-found',
    );
  });
});

describe('aprovar-titulo — status != Open com interpolação inline (CA-20)', () => {
  it('CA-20: payable Approved → exit 1 com "(status atual: Approved)" interpolado', () => {
    const dir = makeTmpDir();
    try {
      const statePath = join(dir, 'state.json');
      const approved = buildApprovedPayable();
      seedState(statePath, approved);

      const { stdout, stderr, exitCode } = runFinancialCli([
        'aprovar-titulo',
        '--state',
        statePath,
        '--payable-id',
        approved.id as string,
        '--approved-by',
        APPROVER_UUID,
      ]);

      assert.equal(exitCode, 1, `exit 1 esperado, recebido ${exitCode}. stderr=${stderr}`);
      assert.equal(stdout, '', 'stdout deve estar vazio');
      assert.match(
        stderr,
        /Título não está em estado Aberto \(status atual: Approved\)\./,
        'stderr deve conter interpolação inline literal — valida CA-8b',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
