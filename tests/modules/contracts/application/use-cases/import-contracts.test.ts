import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { err } from '#src/shared/primitives/result.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import type { ContractRepository } from '#src/modules/contracts/domain/contract/repository.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import { importContracts } from '#src/modules/contracts/application/use-cases/import-contracts.ts';
import type { ImportContractRow } from '#src/modules/contracts/application/use-cases/import-contracts.ts';

// W0 RED — CTR-IMPORT-LEGACY (UC-11) v1: use case `importContracts`.
// Agnóstico de formato — consome ImportContractRow[] (o parser CSV/JSON vive no adapter/CLI).
// Decisões: D1 só Contratos Mãe; D2 CNPJ validado e descartado; D3 atomicidade por linha;
// dry-run não persiste; relatório por linha; falha de DADO = entrada no relatório; falha
// de INFRA (repo) = erro top-level (aborta o lote).

const D = (iso: string): Date => new Date(iso);

const baseRow = (over: Partial<ImportContractRow> = {}): ImportContractRow => ({
  numero: '001/2026',
  titulo: 'Contrato legado',
  objetivo: 'Carga inicial',
  assinadoEm: '2026-01-01',
  valorCentavos: '10000000',
  inicio: '2026-01-01',
  fim: '2026-12-31',
  contractorType: 'supplier',
  contractorId: '55555555-5555-4555-8555-555555555555',
  ...over,
});

const setup = () => {
  const outbox = InMemoryOutbox();
  const contractRepo = InMemoryContractRepository(outbox.port);
  const clock = ClockFixed(D('2026-05-25'));
  return { outbox, contractRepo, clock, deps: { contractRepo: contractRepo.repo, clock } };
};

// ============================================================================
// H1 — importar contratos válidos (persistente)
// ============================================================================

describe('importContracts — H1 happy path (persistente)', () => {
  it('cria N contratos, emite N ContractCreated, relatório N OK / 0 falhas', async () => {
    const w = setup();
    const useCase = importContracts(w.deps);

    const r = await useCase({
      rows: [
        baseRow({ numero: '001/2026' }),
        baseRow({ numero: '002/2026' }),
        baseRow({ numero: '003/2026' }),
      ],
      dryRun: false,
    });

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.total, 3);
    assert.equal(r.value.succeeded, 3);
    assert.equal(r.value.failed, 0);
    assert.equal(r.value.dryRun, false);
    assert.equal(r.value.failures.length, 0);

    assert.equal(w.outbox.all().length, 3);
    assert.equal(w.outbox.all()[0]?.eventType, 'ContractCreated');

    const list = await w.contractRepo.repo.list();
    if (list.ok) assert.equal(list.value.length, 3);
  });
});

// ============================================================================
// H2 — dry-run não persiste
// ============================================================================

describe('importContracts — H2 dry-run', () => {
  it('valida e reporta sem persistir nem emitir eventos', async () => {
    const w = setup();
    const useCase = importContracts(w.deps);

    const r = await useCase({
      rows: [baseRow({ numero: '010/2026' }), baseRow({ numero: '011/2026' })],
      dryRun: true,
    });

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.succeeded, 2);
    assert.equal(r.value.dryRun, true);

    assert.equal(w.outbox.all().length, 0);
    const list = await w.contractRepo.repo.list();
    if (list.ok) assert.equal(list.value.length, 0);
  });
});

// ============================================================================
// H3 — linha inválida é reportada, não aborta as outras (D3)
// ============================================================================

describe('importContracts — H3 linha inválida isolada', () => {
  it('valor zero na linha 2 falha; linhas 1 e 3 são criadas', async () => {
    const w = setup();
    const useCase = importContracts(w.deps);

    const r = await useCase({
      rows: [
        baseRow({ numero: '020/2026' }),
        baseRow({ numero: '021/2026', valorCentavos: '0' }),
        baseRow({ numero: '022/2026' }),
      ],
      dryRun: false,
    });

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.succeeded, 2);
    assert.equal(r.value.failed, 1);
    assert.equal(r.value.failures.length, 1);
    assert.equal(r.value.failures[0]?.index, 2);
    const e = r.value.failures[0]?.error;
    if (e !== undefined && typeof e === 'object' && 'tag' in e) {
      assert.equal(e.tag, 'ContractOriginalValueZero');
    }
    assert.equal(w.outbox.all().length, 2);
  });
});

// ============================================================================
// H4 — duplicidade intra-arquivo e vs repositório
// ============================================================================

describe('importContracts — H4 duplicidade', () => {
  it('duplicata intra-arquivo: 1ª cria, 2ª falha como duplicada', async () => {
    const w = setup();
    const useCase = importContracts(w.deps);

    const r = await useCase({
      rows: [baseRow({ numero: '030/2026' }), baseRow({ numero: '030/2026' })],
      dryRun: false,
    });

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.succeeded, 1);
    assert.equal(r.value.failed, 1);
    assert.equal(r.value.failures[0]?.error, 'contract-sequential-number-duplicated');
  });

  it('duplicata vs repositório: número já existente falha', async () => {
    const w = setup();
    const useCase = importContracts(w.deps);

    await useCase({ rows: [baseRow({ numero: '031/2026' })], dryRun: false });
    const r = await useCase({ rows: [baseRow({ numero: '031/2026' })], dryRun: false });

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.succeeded, 0);
    assert.equal(r.value.failed, 1);
    assert.equal(r.value.failures[0]?.error, 'contract-sequential-number-duplicated');
  });
});

// ============================================================================
// H5 — CNPJ validado e descartado (D2)
// ============================================================================

describe('importContracts — H5 CNPJ validado e descartado', () => {
  it('CNPJ de formato inválido → linha falha com import-cnpj-invalid', async () => {
    const w = setup();
    const useCase = importContracts(w.deps);

    const r = await useCase({
      rows: [baseRow({ numero: '040/2026', cnpj: '123' })],
      dryRun: false,
    });

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.failed, 1);
    assert.equal(r.value.failures[0]?.error, 'import-cnpj-invalid');
  });

  it('CNPJ válido → contrato criado SEM persistir CNPJ', async () => {
    const w = setup();
    const useCase = importContracts(w.deps);

    const r = await useCase({
      rows: [baseRow({ numero: '041/2026', cnpj: '11222333000181' })],
      dryRun: false,
    });

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.succeeded, 1);

    const list = await w.contractRepo.repo.list();
    if (list.ok && list.value[0]) {
      assert.equal('cnpj' in list.value[0], false);
    }
  });
});

// ============================================================================
// Falha de INFRA (repo) aborta o lote com erro top-level
// ============================================================================

describe('importContracts — falha de infra aborta', () => {
  it('repo indisponível em findBySequentialNumber → err(contract-repo-unavailable)', async () => {
    const clock = ClockFixed(D('2026-05-25'));
    const fail = async () => {
      await Promise.resolve();
      return err('contract-repo-unavailable' as const);
    };
    const failingRepo: ContractRepository = {
      findById: fail,
      findBySequentialNumber: fail,
      nextSequentialNumber: fail,
      list: fail,
      listPaged: fail,
      findExpirable: fail,
      save: fail,
    };
    const useCase = importContracts({ contractRepo: failingRepo, clock });

    const r = await useCase({ rows: [baseRow({ numero: '050/2026' })], dryRun: false });

    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-repo-unavailable');
  });
});
