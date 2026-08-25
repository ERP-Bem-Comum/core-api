// Teste de integração: leitura paginada de remessas (#728) — Drizzle + MySQL real.
//
// Prova o que o fake não pode: que `listPaged` ordena por `generatedAt` DESC no BANCO, devolve o
// total real, e carrega os documentIds da página numa query batch (sem N+1) — e que `findById`
// recupera o detalhe com os vínculos. Read-only: nenhuma escrita nova de domínio, só semeia via
// `save` (o mesmo caminho do generate) e lê.
//
// GATE: só roda com `MYSQL_INTEGRATION=1`.

import { describe, it, before, beforeEach, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { isOk } from '#src/shared/index.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleRemittanceRepository } from '#src/modules/financial/adapters/persistence/repos/remittance-repository.drizzle.ts';
import * as RemittanceId from '#src/modules/financial/domain/remittance/remittance-id.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create, documentIdsOf } from '#src/modules/financial/domain/remittance/remittance.ts';
import {
  finDocuments,
  finPayables,
  finRemittances,
  finRemittancePayables,
  finOutbox,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const account = CedenteAccountId.generate();
let nsaSeq = 0;

/** Um título e a nota que o originou — o par que a remessa vincula. */
type SeededPayable = Readonly<{ payableId: string; documentId: string }>;

const build = (generatedAt: string, payables: readonly SeededPayable[], cedente = account) => {
  nsaSeq += 1;
  const r = create({
    id: RemittanceId.generate(),
    cedenteAccountId: cedente,
    nsa: nsaSeq,
    fileName: `PAG_INT_728.11082026140000_${String(nsaSeq).padStart(6, '0')}.REM`,
    contentHash: 'c'.repeat(64),
    // #752: convênio + NSA + posição. `900002` é o discriminador deste arquivo — ver a nota gêmea
    // em `remittance-repository.drizzle-mysql.test.ts`; `your_number` é UNIQUE na tabela.
    payables: payables.map((p, i) => ({
      payableId: p.payableId,
      documentId: p.documentId,
      yourNumber: `900002${String(nsaSeq).padStart(6, '0')}${String(i + 1).padStart(6, '0')}`,
    })),
    generatedAt,
  });
  if (!r.ok) throw new Error(`test setup: remittance (${r.error})`);
  return r.value;
};

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[financial:remittance-read] MYSQL_INTEGRATION não definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('RemittanceRepository.listPaged / findById — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 4 });
      if (!r.ok) throw new Error(`[financial:remittance-read] Falha ao conectar: ${r.error}`);
      handle = r.value;
    });

    // ⚠️ Grava a NOTA e o TÍTULO de verdade — ver a nota extensa em
    // `remittance-repository.drizzle-mysql.test.ts`. Em resumo: a fixture antiga gerava um UUID
    // solto que servia de `payable_id` e de `document_id` ao mesmo tempo e nunca entrava em tabela
    // alguma; com a FK `RESTRICT` de `fin_remittance_payables.payable_id` isso vira
    // `ER_NO_REFERENCED_ROW_2`. Criar linha só para a FK aceitar repetiria o defeito por outro
    // caminho — o certo é montar o que a aplicação monta: uma nota, e sob ela um título `Parent`.
    //
    // ⚠️ `Approved`, e não `Open` como era até o #792 — pelo mesmo motivo da nota acima, levado um
    // passo adiante: só título `Approved` entra em remessa (#736), e desde o ADR-0065 §2 o `save` de
    // criação **transiciona** `Approved → Transmitted` por CAS. Com a fixture em `Open` o `UPDATE`
    // casa zero linhas e TODA remessa deste arquivo sai como `remittance-payable-not-approved` — as
    // três leituras abaixo passam a medir um banco vazio. Foi exatamente assim que o CI ficou
    // vermelho na primeira tentativa do #792, e o sintoma (`listPaged` devolvendo 0) apontava para
    // longe da causa.
    const seedPayable = async (): Promise<SeededPayable> => {
      const documentId = newUuid();
      const payableId = newUuid();
      await handle.db.insert(finDocuments).values({
        id: documentId,
        status: 'Approved',
        createdAt: new Date('2026-08-11T00:00:00.000Z'),
      });
      await handle.db.insert(finPayables).values({
        id: payableId,
        documentId,
        kind: 'Parent',
        status: 'Approved',
        value: 150000,
        dueDate: new Date('2026-09-30T00:00:00.000Z'),
        paymentMethod: 'TED',
        createdAt: new Date('2026-08-11T00:00:00.000Z'),
      });
      return { payableId, documentId };
    };

    // Limpa na ENTRADA, por tabela (testing.md §Contrato de isolamento).
    //
    // ⚠️ A ORDEM é obrigatória com as FKs `RESTRICT`: o vínculo sai antes do que ele referencia, e
    // `fin_payables` antes de `fin_documents` (FK intra-agregado). Fora de ordem dá
    // `ER_ROW_IS_REFERENCED_2`.
    beforeEach(async () => {
      await handle.db.delete(finRemittancePayables);
      await handle.db.delete(finRemittances);
      await handle.db.delete(finPayables);
      await handle.db.delete(finDocuments);
      await handle.db.delete(finOutbox);
    });

    // ⚠️ Limpa também na SAÍDA — ver a nota em `remittance-repository.drizzle-mysql.test.ts`. Em
    // resumo: com as FKs `RESTRICT`, vínculo deixado para trás faz o `delete(finDocuments)` de
    // qualquer suíte vizinha falhar com `ER_ROW_IS_REFERENCED_2`, longe da causa.
    after(async () => {
      await handle.db.delete(finRemittancePayables);
      await handle.db.delete(finRemittances);
      await handle.db.delete(finPayables);
      await handle.db.delete(finDocuments);
      await handle?.close();
    });

    it('lista por generatedAt DESC, com total e documentIds/count da página', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const pOld = await seedPayable();
      const pMid1 = await seedPayable();
      const pMid2 = await seedPayable();
      const pNew = await seedPayable();

      const oldest = build('2026-08-11 14:00:00.000', [pOld]);
      const middle = build('2026-08-12 14:00:00.000', [pMid1, pMid2]);
      const newest = build('2026-08-13 14:00:00.000', [pNew]);

      // Semeia fora da ordem cronológica de propósito: a ordenação é do BANCO, não da inserção.
      assert.equal((await repo.save(middle)).ok, true);
      assert.equal((await repo.save(newest)).ok, true);
      assert.equal((await repo.save(oldest)).ok, true);

      const page = await repo.listPaged({ limit: 25, offset: 0 });
      assert.ok(isOk(page));
      assert.equal(page.value.total, 3);
      assert.deepEqual(
        page.value.items.map((r) => r.id),
        [newest.id, middle.id, oldest.id],
      );
      // documentIds da página carregados em batch, agrupados por remessa.
      const mid = page.value.items.find((r) => r.id === middle.id);
      assert.ok(mid !== undefined);
      assert.deepEqual([...documentIdsOf(mid)].sort(), [pMid1.documentId, pMid2.documentId].sort());
    });

    it('respeita limit/offset preservando a ordem DESC entre páginas', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const a = build('2026-08-11 14:00:00.000', [await seedPayable()]);
      const b = build('2026-08-12 14:00:00.000', [await seedPayable()]);
      const c = build('2026-08-13 14:00:00.000', [await seedPayable()]);
      await repo.save(a);
      await repo.save(b);
      await repo.save(c);

      const page1 = await repo.listPaged({ limit: 2, offset: 0 });
      assert.ok(isOk(page1));
      assert.equal(page1.value.total, 3);
      assert.deepEqual(
        page1.value.items.map((r) => r.id),
        [c.id, b.id],
      );

      const page2 = await repo.listPaged({ limit: 2, offset: 2 });
      assert.ok(isOk(page2));
      assert.deepEqual(
        page2.value.items.map((r) => r.id),
        [a.id],
      );
    });

    it('findById recupera o detalhe com os documentIds presos', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const p1 = await seedPayable();
      const p2 = await seedPayable();
      const rem = build('2026-08-11 14:00:00.000', [p1, p2]);
      await repo.save(rem);

      const back = await repo.findById(rem.id);
      assert.ok(isOk(back) && back.value !== null);
      assert.equal(back.value.status, 'Queued');
      assert.deepEqual(
        [...documentIdsOf(back.value)].sort(),
        [p1.documentId, p2.documentId].sort(),
      );
    });

    it('lista vazia devolve total 0 e nenhum item', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const page = await repo.listPaged({ limit: 25, offset: 0 });
      assert.ok(isOk(page));
      assert.equal(page.value.total, 0);
      assert.deepEqual(page.value.items, []);
    });
  });
}
