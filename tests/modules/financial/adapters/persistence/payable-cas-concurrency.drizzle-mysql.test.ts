// Concorrência da escrita por título (Fatia 1) — Drizzle + MySQL real.
//
// Estes três casos são a razão de o `PayableRepository` existir. Nenhum deles é verificável contra
// fake: o que se prova aqui é o comportamento do InnoDB sob escrita simultânea, e um double em
// memória responderia o que o autor do double achou que aconteceria.
//
//   CA1 — duas baixas no MESMO título: o CAS deixa exatamente UMA passar.
//   CA2 — duas baixas em títulos IRMÃOS: AMBAS passam. É o caso que o caminho antigo (`save` do
//         documento) reprovava com `document-version-conflict` sem que houvesse conflito algum.
//   CA3 — a baixa NÃO escreve `fin_documents`: a `version` do documento fica onde estava.
//
// GATE: MYSQL_INTEGRATION=1 (lista do runner `financial`).

import { describe, before, after, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { newUuid } from '#src/shared/utils/id.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';
import { createDrizzlePayableRepository } from '#src/modules/financial/adapters/persistence/repos/payable-repository.drizzle.ts';
import type { PayableRepository } from '#src/modules/financial/domain/payable/repository.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[financial:payable-cas] MYSQL_INTEGRATION nao definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  const must = <T>(r: { ok: true; value: T } | { ok: false }): T => {
    if (!r.ok) throw new Error('setup');
    return r.value;
  };

  const PAID_AT = new Date('2026-07-12T00:00:00.000Z');

  describe('Fatia 1 — escrita por titulo sob concorrencia (Drizzle + MySQL)', () => {
    let handle: FinancialMysqlHandle;

    // Pool folgado de propósito: com `poolLimit: 1` as duas chamadas concorrentes seriam
    // serializadas pelo POOL, não pelo InnoDB, e o teste passaria sem provar nada.
    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 6 });
      if (!r.ok) throw new Error(`[payable-cas] conexao: ${r.error}`);
      handle = r.value;
    });
    after(async () => {
      await handle?.close();
    });

    // Semeia um NFS-e aprovado com uma retenção — pai + um filho, os dois `Approved`.
    const seedApproved = async (): Promise<{
      documentId: ReturnType<typeof DocumentId.generate>;
      parentId: string;
      childId: string;
    }> => {
      const created = must(
        Document.create({
          id: DocumentId.generate(),
          documentNumber: `NFS-${newUuid().slice(0, 8)}`,
          type: 'NFS-e',
          supplier: must(SupplierRef.rehydrate(newUuid())),
          paymentMethod: 'TED',
          grossValue: must(Money.fromCents(1000000)),
          sourceDiscounts: Money.ZERO,
          discounts: Money.ZERO,
          penalty: Money.ZERO,
          interest: Money.ZERO,
          retentions: [
            must(
              Retention.create({
                type: 'ISS',
                baseCents: 350000,
                rateBps: 1000,
                valueCents: 35000,
              }),
            ),
          ],
          registeredTaxes: [],
          dueDate: new Date('2026-07-01T00:00:00.000Z'),
        }),
      );
      const approved = must(
        Document.approve({
          document: created.document,
          payables: created.payables,
          by: must(UserRef.rehydrate(newUuid())),
          at: new Date('2026-07-10T00:00:00.000Z'),
        }),
      );

      const docRepo = createDrizzleDocumentRepository(handle);
      const seeded = await docRepo.save(
        { document: approved.document, payables: approved.payables },
        [],
      );
      assert.equal(seeded.ok, true, JSON.stringify(seeded));

      const child = approved.payables.children[0];
      assert.ok(child, 'setup: NFS-e com retencao ISS deve gerar um titulo filho');

      return {
        documentId: approved.document.id,
        parentId: String(approved.payables.parent.id),
        childId: String(child.id),
      };
    };

    const markPaid = (repo: PayableRepository, payableId: string) =>
      repo.markPaid({
        payableId: payableId as never,
        paidAt: PAID_AT,
        timelineEntries: [],
        events: [],
      });

    const reschedule = (
      repo: PayableRepository,
      payableId: string,
      dueDate: Date,
      expectedDueDate: Date,
    ) =>
      repo.reschedule({
        payableId: payableId as never,
        dueDate,
        expectedDueDate,
        timelineEntries: [],
        events: [],
      });

    it('CA1: duas baixas concorrentes no MESMO titulo — exatamente uma vence', async () => {
      const seed = await seedApproved();
      const repo = createDrizzlePayableRepository(handle);

      const results = await Promise.all([
        markPaid(repo, seed.parentId),
        markPaid(repo, seed.parentId),
      ]);

      const winners = results.filter((r) => r.ok);
      assert.equal(winners.length, 1, `esperava 1 vencedor, veio ${JSON.stringify(results)}`);

      // Quantas perderam E com que erro, num assert só. A forma anterior lia o slug dentro de um
      // `if (loser !== undefined && !loser.ok)`: correta hoje — o assert de contagem logo acima
      // torna o guard inalcançável —, mas um assert sob condição é um assert que PODE não
      // executar, e quem lê o teste depois não tem como saber que esse não é o caso. Comparar o
      // array inteiro afirma as duas propriedades sem guard nenhum.
      const loserErrors = results.filter((r) => !r.ok).map((r) => (r.ok ? null : r.error));
      assert.deepEqual(
        loserErrors,
        ['payable-state-conflict'],
        'a perdedora do CAS e conflito de estado, nao falha de infra',
      );

      // E o efeito no banco é UMA baixa: o título está Paid, o irmão intocado.
      const docRepo = createDrizzleDocumentRepository(handle);
      const found = await docRepo.findById(seed.documentId);
      assert.equal(found.ok, true);
      if (found.ok && found.value.payables !== null) {
        assert.equal(found.value.payables.parent.status, 'Paid');
        assert.ok(found.value.payables.children.every((c) => c.status === 'Approved'));
      } else {
        assert.fail('documento nao encontrado apos a baixa');
      }
    });

    it('CA2: baixas concorrentes em titulos IRMAOS — as duas passam', async () => {
      const seed = await seedApproved();
      const repo = createDrizzlePayableRepository(handle);

      // No caminho antigo (`DocumentRepository.save` com `expectedVersion`) uma destas duas
      // receberia `document-version-conflict` — sem que houvesse conflito de negócio nenhum.
      const results = await Promise.all([
        markPaid(repo, seed.parentId),
        markPaid(repo, seed.childId),
      ]);

      assert.ok(
        results.every((r) => r.ok),
        `titulos irmaos nao disputam entre si: ${JSON.stringify(results)}`,
      );

      const docRepo = createDrizzleDocumentRepository(handle);
      const found = await docRepo.findById(seed.documentId);
      if (found.ok && found.value.payables !== null) {
        assert.equal(found.value.payables.parent.status, 'Paid');
        assert.ok(found.value.payables.children.every((c) => c.status === 'Paid'));
      } else {
        assert.fail('documento nao encontrado apos as baixas');
      }
    });

    it('CA3: a baixa nao escreve fin_documents — a version do documento nao muda', async () => {
      const seed = await seedApproved();
      const docRepo = createDrizzleDocumentRepository(handle);

      const loadedBefore = await docRepo.findById(seed.documentId);
      assert.equal(loadedBefore.ok, true);
      const versionBefore = loadedBefore.ok ? loadedBefore.value.version : -1;

      const repo = createDrizzlePayableRepository(handle);
      const r = await markPaid(repo, seed.parentId);
      assert.equal(r.ok, true, JSON.stringify(r));

      const loadedAfter = await docRepo.findById(seed.documentId);
      assert.equal(loadedAfter.ok, true);
      if (loadedAfter.ok) {
        assert.equal(
          loadedAfter.value.version,
          versionBefore,
          'escrever o documento que nao mudou e o defeito que esta fatia remove',
        );
      }
    });

    // ─── Fatia 2: CAS por VALOR (reagendamento, #270) ─────────────────────────────────────────
    //
    // A pré-condição aqui é o `due_date` anterior, não um estado. Contra MySQL real isso mede duas
    // coisas que em memória são invisíveis: a corrida entre duas transações, e a igualdade sobre a
    // coluna DATE — o `Date` sai de um `YYYY-MM-DD` do cliente e precisa casar o dia civil gravado.

    /** Dia civil em UTC — a granularidade real da coluna `due_date` (DATE, sem hora). */
    const civilDay = (d: Date): string => d.toISOString().slice(0, 10);

    const SEEDED_DUE = new Date('2026-07-01T00:00:00.000Z');
    const DUE_A = new Date('2026-09-10T00:00:00.000Z');
    const DUE_B = new Date('2026-11-25T00:00:00.000Z');

    it('CA4: dois reagendamentos concorrentes do MESMO titulo — exatamente um vence', async () => {
      const seed = await seedApproved();
      const repo = createDrizzlePayableRepository(handle);

      // As duas partem do MESMO `expectedDueDate` — é o cenário de dois operadores com a mesma
      // tela aberta. Uma casa a linha; a outra encontra o `due_date` já trocado.
      const results = await Promise.all([
        reschedule(repo, seed.parentId, DUE_A, SEEDED_DUE),
        reschedule(repo, seed.parentId, DUE_B, SEEDED_DUE),
      ]);

      assert.equal(
        results.filter((r) => r.ok).length,
        1,
        `esperava 1 vencedor, veio ${JSON.stringify(results)}`,
      );
      const loserErrors = results.filter((r) => !r.ok).map((r) => (r.ok ? null : r.error));
      assert.deepEqual(loserErrors, ['payable-state-conflict']);

      // O vencimento gravado é o de UM dos dois, nunca uma mistura nem o valor semeado.
      const docRepo = createDrizzleDocumentRepository(handle);
      const found = await docRepo.findById(seed.documentId);
      if (found.ok && found.value.payables !== null) {
        const persisted = civilDay(found.value.payables.parent.dueDate);
        assert.ok(
          persisted === '2026-09-10' || persisted === '2026-11-25',
          `due_date persistido inesperado: ${persisted}`,
        );
      } else {
        assert.fail('documento nao encontrado apos o reagendamento');
      }
    });

    it('CA5: `expectedDueDate` que nao corresponde NAO grava — o valor esta mesmo no WHERE', async () => {
      const seed = await seedApproved();
      const repo = createDrizzlePayableRepository(handle);

      // Sem este caso, CA4 passaria mesmo que o `WHERE` só filtrasse por `id`: a primeira gravação
      // venceria e a segunda... também venceria, e o teste veria 2 vencedores — ou seja, CA4 pega
      // o WHERE ausente, mas não pega um WHERE que compare a coluna ERRADA. Aqui a data enviada
      // está simplesmente errada, e a única resposta correta é não gravar nada.
      const r = await reschedule(repo, seed.parentId, DUE_A, new Date('2020-01-01T00:00:00.000Z'));

      assert.equal(r.ok, false, 'reagendar com vencimento anterior errado nao pode gravar');
      if (!r.ok) assert.equal(r.error, 'payable-state-conflict');

      const docRepo = createDrizzleDocumentRepository(handle);
      const found = await docRepo.findById(seed.documentId);
      if (found.ok && found.value.payables !== null) {
        assert.equal(
          found.value.payables.parent.dueDate.toISOString().slice(0, 10),
          '2026-07-01',
          'o vencimento semeado tem de continuar intacto',
        );
      } else {
        assert.fail('documento nao encontrado');
      }
    });

    it('CA6: o `Date` do cliente casa a coluna DATE — reagendamento simples grava', async () => {
      const seed = await seedApproved();
      const repo = createDrizzlePayableRepository(handle);

      // O complemento de CA5: prova que a igualdade FUNCIONA quando deve. Os dois juntos separam
      // "o CAS discrimina" de "o CAS recusa tudo" — um WHERE com fuso mordido passaria em CA5 e
      // falharia aqui, e é exatamente esse o modo de falha que só o MySQL real revela.
      const r = await reschedule(repo, seed.parentId, DUE_A, SEEDED_DUE);
      assert.equal(r.ok, true, JSON.stringify(r));

      const docRepo = createDrizzleDocumentRepository(handle);
      const found = await docRepo.findById(seed.documentId);
      if (found.ok && found.value.payables !== null) {
        assert.equal(civilDay(found.value.payables.parent.dueDate), '2026-09-10');
        // O irmão não foi reagendado junto — comparar a LISTA inteira, e não um `every`, para que
        // a falha mostre qual data cada filho ficou em vez de só "false".
        assert.deepEqual(
          found.value.payables.children.map((c) => civilDay(c.dueDate)),
          found.value.payables.children.map(() => '2026-07-01'),
          'irmao nao pode ser arrastado pelo reagendamento',
        );
      } else {
        assert.fail('documento nao encontrado');
      }
    });
  });
}
