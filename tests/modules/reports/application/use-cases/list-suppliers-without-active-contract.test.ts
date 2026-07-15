/**
 * W0 RED — REPORTS-SUPPLIERS-NO-ACTIVE-CONTRACT (#437). Anti-join EM MEMÓRIA do relatório
 * "Fornecedores sem Contrato": candidatos do `financial` (payables `contract_ref IS NULL`,
 * `kind='Parent'`) MENOS o conjunto de contratantes com contrato `Active` vindo do `contracts`.
 *
 * Este é o coração da correção semântica. O relatório responde "fornecedor sem NENHUM contrato
 * ativo" — não "fornecedor com ALGUM título sem contrato" (o bug do REP-2 · #240).
 *
 * Por que em memória e não `JOIN ctr_contracts × fin_payable_view`: ADR-0006 `:150` (*"Sem
 * cross-import entre BCs"*) / `:154` (*"Joins acidentais cross-BC"*) e ADR-0014 `:130` (*"Joins
 * cross-database em queries de aplicação | Acopla serviços invisivelmente"*). O `reports` orquestra
 * dois read-ports de public-api — mecanismo autorizado pelo ADR-0006 `:80`.
 *
 * Unit puro: dois adapters in-memory (fakes, nunca mocks). Zero MySQL, roda no `pnpm test`.
 * W0 RED: `listSuppliersWithoutActiveContract` / `ActiveContractorReadPort` ainda não existem.
 *
 * CA1 — fornecedor com ≥1 contrato Active NÃO aparece, mesmo tendo títulos sem contract_ref.
 * CA2 — fornecedor cujo único contrato é Pending (⇒ ausente do conjunto ativo) APARECE.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/primitives/result.ts';
import { listSuppliersWithoutActiveContract } from '#src/modules/reports/application/use-cases/list-suppliers-without-active-contract.ts';
import { InMemorySuppliersWithoutContractRead } from '#src/modules/reports/adapters/persistence/suppliers-without-contract-read.in-memory.ts';
import { InMemoryActiveContractorRead } from '#src/modules/reports/adapters/persistence/active-contractor-read.in-memory.ts';
import type { SupplierWithoutContract } from '#src/modules/reports/application/ports/suppliers-without-contract-read.ts';
import type { ActiveContractorReadPort } from '#src/modules/reports/application/ports/active-contractor-read.ts';
import type { SuppliersWithoutContractReadPort } from '#src/modules/reports/application/ports/suppliers-without-contract-read.ts';

const S_WITH_ACTIVE = '11111111-1111-4111-8111-111111111111'; // tem contrato Active → sai
const S_ONLY_PENDING = '22222222-2222-4222-8222-222222222222'; // só Pending → fica
const S_NO_CONTRACT = '33333333-3333-4333-8333-333333333333'; // sem contrato → fica

const candidate = (over: Partial<SupplierWithoutContract> = {}): SupplierWithoutContract => ({
  supplierRef: S_NO_CONTRACT,
  name: 'Fornecedor Alpha',
  totalCents: 150000,
  payableCount: 2,
  ...over,
});

describe('listSuppliersWithoutActiveContract — anti-join em memória (#437)', () => {
  it('CA1: fornecedor com contrato Active some, mesmo tendo títulos sem contract_ref', async () => {
    const list = listSuppliersWithoutActiveContract({
      suppliersRead: InMemorySuppliersWithoutContractRead([
        candidate({ supplierRef: S_WITH_ACTIVE, name: 'Tem Contrato Ltda' }),
        candidate({ supplierRef: S_NO_CONTRACT }),
      ]),
      activeContractorsRead: InMemoryActiveContractorRead([S_WITH_ACTIVE]),
    });

    const r = await list();

    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    const refs = r.value.map((s) => s.supplierRef);
    assert.equal(refs.includes(S_WITH_ACTIVE), false, 'contrato Active → fora do relatório');
    assert.deepEqual(refs, [S_NO_CONTRACT]);
  });

  it('CA2: fornecedor cujo único contrato é Pending permanece (rascunho não é contrato)', async () => {
    // O `contracts` só devolve contratantes com status='Active'; quem só tem Pending nunca entra
    // no conjunto — logo não é subtraído. (A exclusão do Pending na origem é provada em
    // tests/modules/contracts/public-api/active-contractor-read.drizzle-mysql.test.ts.)
    const list = listSuppliersWithoutActiveContract({
      suppliersRead: InMemorySuppliersWithoutContractRead([
        candidate({ supplierRef: S_ONLY_PENDING, name: 'Rascunho ME' }),
      ]),
      activeContractorsRead: InMemoryActiveContractorRead([]),
    });

    const r = await list();

    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.deepEqual(
      r.value.map((s) => s.supplierRef),
      [S_ONLY_PENDING],
    );
  });

  it('preserva a agregação do financial intacta (name/totalCents/payableCount)', async () => {
    const row = candidate({
      supplierRef: S_NO_CONTRACT,
      name: null,
      totalCents: 7000,
      payableCount: 1,
    });
    const list = listSuppliersWithoutActiveContract({
      suppliersRead: InMemorySuppliersWithoutContractRead([row]),
      activeContractorsRead: InMemoryActiveContractorRead([S_WITH_ACTIVE]),
    });

    const r = await list();

    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.length, 1);
    assert.deepEqual(r.value[0], row, 'o anti-join só subtrai — não reescreve a linha');
  });

  it('conjunto ativo vazio → todos os candidatos passam', async () => {
    const list = listSuppliersWithoutActiveContract({
      suppliersRead: InMemorySuppliersWithoutContractRead([
        candidate({ supplierRef: S_ONLY_PENDING }),
        candidate({ supplierRef: S_NO_CONTRACT }),
      ]),
      activeContractorsRead: InMemoryActiveContractorRead([]),
    });

    const r = await list();

    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.length, 2);
  });

  it('contratante ativo que não é candidato não afeta o resultado', async () => {
    const list = listSuppliersWithoutActiveContract({
      suppliersRead: InMemorySuppliersWithoutContractRead([
        candidate({ supplierRef: S_NO_CONTRACT }),
      ]),
      activeContractorsRead: InMemoryActiveContractorRead([
        S_WITH_ACTIVE,
        '44444444-4444-4444-8444-444444444444',
      ]),
    });

    const r = await list();

    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.deepEqual(
      r.value.map((s) => s.supplierRef),
      [S_NO_CONTRACT],
    );
  });

  it('fail-closed: reader de contratos indisponível → erro (NUNCA lista sem subtrair)', async () => {
    // Fake que falha (não mock): devolver a lista não-subtraída aqui republicaria exatamente o bug
    // que este ticket corrige — fornecedor COM contrato aparecendo no relatório.
    const brokenContractors: ActiveContractorReadPort = {
      listContractorsWithActiveContract: () =>
        Promise.resolve(err('active-contractor-read-unavailable')),
    };
    const list = listSuppliersWithoutActiveContract({
      suppliersRead: InMemorySuppliersWithoutContractRead([
        candidate({ supplierRef: S_WITH_ACTIVE }),
      ]),
      activeContractorsRead: brokenContractors,
    });

    const r = await list();

    assert.equal(r.ok, false, 'sem o conjunto ativo o relatório não pode ser servido');
    if (r.ok) return;
    assert.equal(r.error, 'active-contractor-read-unavailable');
  });

  it('propaga falha do reader do financial', async () => {
    const brokenSuppliers: SuppliersWithoutContractReadPort = {
      list: () => Promise.resolve(err('suppliers-without-contract-read-unavailable')),
    };
    const list = listSuppliersWithoutActiveContract({
      suppliersRead: brokenSuppliers,
      activeContractorsRead: InMemoryActiveContractorRead([]),
    });

    const r = await list();

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'suppliers-without-contract-read-unavailable');
  });

  it('sem candidatos → lista vazia (ok, não erro)', async () => {
    const list = listSuppliersWithoutActiveContract({
      suppliersRead: InMemorySuppliersWithoutContractRead([]),
      activeContractorsRead: InMemoryActiveContractorRead([S_WITH_ACTIVE]),
    });

    const r = await list();

    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.deepEqual(r.value, []);
  });
});

describe('InMemoryActiveContractorRead — fake do port de contratantes ativos (#437)', () => {
  it('sem seed → conjunto vazio', async () => {
    const port = InMemoryActiveContractorRead();
    const r = await port.listContractorsWithActiveContract();
    assert.deepEqual(r, ok([]));
  });

  it('devolve o conjunto semeado', async () => {
    const port = InMemoryActiveContractorRead([S_WITH_ACTIVE]);
    const r = await port.listContractorsWithActiveContract();
    assert.deepEqual(r, ok([S_WITH_ACTIVE]));
  });
});
