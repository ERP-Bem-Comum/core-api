import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import type { DocumentRepository } from '#src/modules/financial/domain/document/repository.ts';

// Suíte de CONTRATO (test-pyramid-engineer): qualquer adapter de DocumentRepository (in-memory, drizzle)
// consome esta função e deve passar. NÃO é executada direto (sufixo .suite.ts).

const money = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('test setup: money');
  return r.value;
};
const supplier = (): SupplierRef => {
  const r = SupplierRef.rehydrate('11111111-1111-4111-8111-111111111111');
  if (!r.ok) throw new Error('test setup: supplier');
  return r.value;
};
const ret = (type: 'ISS' | 'IRRF' | 'INSS', valueCents: number): Retention.Retention => {
  const r = Retention.create({ type, baseCents: valueCents * 10, rateBps: 1000, valueCents });
  if (!r.ok) throw new Error('test setup: retention');
  return r.value;
};
const openNfse = (): Document.CreateDocumentOutput => {
  const r = Document.create({
    id: DocumentId.generate(),
    documentNumber: 'NFS-1',
    type: 'NFS-e',
    supplier: supplier(),
    paymentMethod: 'TED',
    grossValue: money(100000),
    sourceDiscounts: money(5000),
    discounts: Money.ZERO,
    penalty: Money.ZERO,
    interest: Money.ZERO,
    retentions: [ret('ISS', 5000), ret('IRRF', 1500), ret('INSS', 11000)],
    registeredTaxes: [],
    dueDate: new Date('2026-07-01'),
  });
  if (!r.ok) throw new Error('test setup: open nfse');
  return r.value;
};

export const documentRepositoryContract = (makeRepo: () => DocumentRepository): void => {
  describe('DocumentRepository (contrato)', () => {
    it('save + findById faz round-trip de um documento Open com payables', async () => {
      const repo = makeRepo();
      const open = openNfse();
      const saved = await repo.save({ document: open.document, payables: open.payables }, []);
      assert.equal(isOk(saved), true);

      const found = await repo.findById(open.document.id);
      assert.equal(isOk(found), true);
      if (found.ok) {
        assert.equal(found.value.document.id, open.document.id);
        assert.equal(found.value.document.status, 'Open');
        assert.equal(found.value.payables?.children.length, 3);
        assert.equal(found.value.payables?.parent.value.cents, open.payables.parent.value.cents);
      }
    });

    it('findById de id inexistente retorna document-not-found', async () => {
      const repo = makeRepo();
      const r = await repo.findById(DocumentId.generate());
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.error, 'document-not-found');
    });

    it('delete remove o agregado (findById passa a falhar)', async () => {
      const repo = makeRepo();
      const open = openNfse();
      await repo.save({ document: open.document, payables: open.payables }, []);
      const del = await repo.delete(open.document.id, 0);
      assert.equal(isOk(del), true);
      const found = await repo.findById(open.document.id);
      assert.equal(found.ok, false);
    });

    it('delete com versão defasada → document-version-conflict (não remove) — #55', async () => {
      const repo = makeRepo();
      const open = openNfse();
      await repo.save({ document: open.document, payables: open.payables }, []); // v0
      const del = await repo.delete(open.document.id, 999);
      assert.equal(del.ok, false);
      if (!del.ok) assert.equal(del.error, 'document-version-conflict');
      const found = await repo.findById(open.document.id);
      assert.equal(found.ok, true); // permanece
    });

    it('persiste rascunho (Draft) sem payables', async () => {
      const repo = makeRepo();
      const draft = Document.saveDraft({ id: DocumentId.generate(), documentNumber: 'D-1' });
      if (!draft.ok) throw new Error('saveDraft falhou');
      const saved = await repo.save({ document: draft.value.document, payables: null }, []);
      assert.equal(isOk(saved), true);
      const found = await repo.findById(draft.value.document.id);
      if (found.ok) {
        assert.equal(found.value.document.status, 'Draft');
        assert.equal(found.value.payables, null);
      }
    });

    // ─── findPaged (US1 — listagem paginada) ─────────────────────────────────
    // Cada teste de findPaged é escopado por um supplierRef ÚNICO → isolation-safe tanto no
    // in-memory (repo fresh por teste) quanto no Drizzle/MySQL (DB compartilhado entre os it()
    // da suite). Sem isso, filtros globais (ex.: status='Open') contariam docs de outros testes.
    const SUP_STATUS = '5a000000-0000-4000-8000-000000000001';
    const SUP_PAGE = '5a000000-0000-4000-8000-000000000002';
    const SUP_WINDOW = '5a000000-0000-4000-8000-000000000003';
    const SUP_EMPTY = '5a000000-0000-4000-8000-000000000004';
    // Novos: isolados por supplierRef único (isolation-safe no Drizzle/MySQL compartilhado).
    const SUP_STABLE_ORDER = '5a000000-0000-4000-8000-000000000005';
    const SUP_DRAFT_NULL = '5a000000-0000-4000-8000-000000000006';
    const sup = (uuid: string): SupplierRef => {
      const r = SupplierRef.rehydrate(uuid);
      if (!r.ok) throw new Error('test setup: sup');
      return r.value;
    };
    const user = (): UserRef.UserRef => {
      const r = UserRef.rehydrate('4b000000-0000-4000-8000-000000000001');
      if (!r.ok) throw new Error('test setup: user');
      return r.value;
    };
    const openAt = (s: SupplierRef, due: string): Document.CreateDocumentOutput => {
      const r = Document.create({
        id: DocumentId.generate(),
        documentNumber: `NFS-${due}`,
        type: 'NFS-e',
        supplier: s,
        paymentMethod: 'TED',
        grossValue: money(100000),
        sourceDiscounts: Money.ZERO,
        discounts: Money.ZERO,
        penalty: Money.ZERO,
        interest: Money.ZERO,
        retentions: [],
        registeredTaxes: [],
        dueDate: new Date(due),
      });
      if (!r.ok) throw new Error('test setup: openAt');
      return r.value;
    };

    it('findPaged: filtra por status (Open vs Approved no mesmo fornecedor)', async () => {
      const repo = makeRepo();
      const s = sup(SUP_STATUS);
      const openOne = openAt(s, '2026-07-01');
      await repo.save({ document: openOne.document, payables: openOne.payables }, []);
      const toApprove = openAt(s, '2026-07-02');
      const approved = Document.approve({
        document: toApprove.document,
        payables: toApprove.payables,
        by: user(),
        at: new Date('2026-07-03'),
      });
      if (!approved.ok) throw new Error('test setup: approve');
      await repo.save({ document: approved.value.document, payables: approved.value.payables }, []);

      const openPage = await repo.findPaged({ status: 'Open', supplierRef: SUP_STATUS }, 1, 10);
      assert.equal(isOk(openPage), true);
      if (openPage.ok) {
        assert.equal(openPage.value.total, 1);
        assert.equal(openPage.value.items[0]?.status, 'Open');
      }
      const approvedPage = await repo.findPaged(
        { status: 'Approved', supplierRef: SUP_STATUS },
        1,
        10,
      );
      assert.equal(isOk(approvedPage), true);
      if (approvedPage.ok) assert.equal(approvedPage.value.total, 1);

      const all = await repo.findPaged({ supplierRef: SUP_STATUS }, 1, 10);
      assert.equal(isOk(all), true);
      if (all.ok) assert.equal(all.value.total, 2);
    });

    it('findPaged: pagina (page 2, pageSize 2 de 5) com total filtrado', async () => {
      const repo = makeRepo();
      const s = sup(SUP_PAGE);
      for (let i = 1; i <= 5; i++) {
        const d = openAt(s, `2026-08-0${String(i)}`);
        await repo.save({ document: d.document, payables: d.payables }, []);
      }
      const page = await repo.findPaged({ supplierRef: SUP_PAGE }, 2, 2);
      assert.equal(isOk(page), true);
      if (page.ok) {
        assert.equal(page.value.total, 5);
        assert.equal(page.value.page, 2);
        assert.equal(page.value.pageSize, 2);
        assert.equal(page.value.items.length, 2);
      }
    });

    it('findPaged: janela de vencimento inclusiva', async () => {
      const repo = makeRepo();
      const s = sup(SUP_WINDOW);
      const inside = openAt(s, '2026-09-20');
      const outside = openAt(s, '2026-09-30');
      await repo.save({ document: inside.document, payables: inside.payables }, []);
      await repo.save({ document: outside.document, payables: outside.payables }, []);

      const byWindow = await repo.findPaged(
        { supplierRef: SUP_WINDOW, dueFrom: new Date('2026-09-15'), dueTo: new Date('2026-09-25') },
        1,
        10,
      );
      assert.equal(isOk(byWindow), true);
      if (byWindow.ok) assert.equal(byWindow.value.total, 1);
    });

    it('findPaged: conjunto vazio → total 0, sem erro', async () => {
      const repo = makeRepo();
      const page = await repo.findPaged({ supplierRef: SUP_EMPTY }, 1, 10);
      assert.equal(isOk(page), true);
      if (page.ok) {
        assert.equal(page.value.total, 0);
        assert.equal(page.value.items.length, 0);
      }
    });

    // ─── Ordenação estável: empate de dueDate desempatado por id ASC ─────────
    //
    // Cobre a correção do Fix 2 (W2 round 2): sem tie-breaker `id ASC`, paginação
    // OFFSET em MySQL pode repetir/pular linhas quando dois documentos têm o mesmo
    // dueDate — InnoDB não garante ordenação dentro de um tie sem critério secundário
    // explícito. O adapter Drizzle usa `.orderBy(asc(dueDate), asc(id))`; o in-memory
    // usa [...matched].sort() com a mesma semântica.
    //
    // Montagem: três documentos com o MESMO dueDate mas IDs distintos e lexicograficamente
    // ordenados (via DocumentId.rehydrate). Inserção na ordem INVERSA da esperada —
    // se o sort não estiver aplicado, os items estarão na ordem errada.
    it('findPaged: empate de dueDate → desempate por id ASC (ordenação estável)', async () => {
      const repo = makeRepo();
      const s = sup(SUP_STABLE_ORDER);
      const sharedDue = '2026-10-15';

      // IDs lexicograficamente ordenados: idA < idB < idC.
      // UUIDs v4 válidos (versão 4, variante 8) para passar pela validação de DocumentId.rehydrate.
      const idA = '1a000000-0000-4000-8000-000000000001'; // menor
      const idB = '2b000000-0000-4000-8000-000000000002'; // médio
      const idC = '3c000000-0000-4000-8000-000000000003'; // maior

      const mkDoc = (rawId: string): Document.CreateDocumentOutput => {
        const idResult = DocumentId.rehydrate(rawId);
        if (!idResult.ok) throw new Error(`test setup: id inválido ${rawId}`);
        const r = Document.create({
          id: idResult.value,
          documentNumber: `NFS-TIE-${rawId.slice(0, 4)}`,
          type: 'NFS-e',
          supplier: s,
          paymentMethod: 'TED',
          grossValue: money(100000),
          sourceDiscounts: Money.ZERO,
          discounts: Money.ZERO,
          penalty: Money.ZERO,
          interest: Money.ZERO,
          retentions: [],
          registeredTaxes: [],
          dueDate: new Date(sharedDue),
        });
        if (!r.ok) throw new Error('test setup: mkDoc');
        return r.value;
      };

      // Inserir na ordem inversa da esperada (C → A → B) para provar que a ordenação
      // não depende da ordem de inserção.
      const dC = mkDoc(idC);
      await repo.save({ document: dC.document, payables: dC.payables }, []);
      const dA = mkDoc(idA);
      await repo.save({ document: dA.document, payables: dA.payables }, []);
      const dB = mkDoc(idB);
      await repo.save({ document: dB.document, payables: dB.payables }, []);

      const page = await repo.findPaged({ supplierRef: SUP_STABLE_ORDER }, 1, 10);
      assert.equal(isOk(page), true);
      if (page.ok) {
        assert.equal(page.value.total, 3);
        assert.equal(page.value.items[0]?.id, idA, 'primeiro deve ser o menor id');
        assert.equal(page.value.items[1]?.id, idB, 'segundo deve ser o id médio');
        assert.equal(page.value.items[2]?.id, idC, 'terceiro deve ser o maior id');
      }
    });

    // ─── Drafts (dueDate NULL) aparecem antes de documentos com dueDate ───────
    //
    // MySQL 8.4 Refman §11.4.2: "NULL values are considered lower than any non-NULL
    // value" em ORDER BY ASC → NULLs primeiro. O in-memory replica esse comportamento
    // explicitamente no sort.
    it('findPaged: Drafts (dueDate NULL) aparecem antes de documentos com dueDate', async () => {
      const repo = makeRepo();
      const s = sup(SUP_DRAFT_NULL);

      // Documento com dueDate
      const withDue = openAt(s, '2026-11-01');
      await repo.save({ document: withDue.document, payables: withDue.payables }, []);

      // Draft sem dueDate (NULL)
      const draft = Document.saveDraft({
        id: DocumentId.generate(),
        documentNumber: 'D-NULL-1',
        supplier: s,
      });
      if (!draft.ok) throw new Error('test setup: draft');
      await repo.save({ document: draft.value.document, payables: null }, []);

      const page = await repo.findPaged({ supplierRef: SUP_DRAFT_NULL }, 1, 10);
      assert.equal(isOk(page), true);
      if (page.ok) {
        assert.equal(page.value.total, 2);
        // O primeiro item DEVE ser o Draft (dueDate null = NULL vem primeiro).
        assert.equal(
          page.value.items[0]?.status,
          'Draft',
          'Draft (NULL dueDate) deve vir primeiro',
        );
        assert.equal(page.value.items[0]?.dueDate, null, 'primeiro item deve ter dueDate null');
        // O segundo item deve ser o documento com dueDate definida.
        assert.notEqual(
          page.value.items[1]?.dueDate,
          null,
          'segundo item deve ter dueDate definida',
        );
      }
    });
  });
};
