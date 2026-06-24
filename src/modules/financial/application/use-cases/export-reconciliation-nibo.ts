import { type Result, ok, err } from '../../../../shared/primitives/result.ts';

import * as ReconciliationPeriodId from '../../domain/reconciliation/reconciliation-period-id.ts';
import * as CedenteAccountId from '../../domain/cedente/cedente-account-id.ts';
import type {
  ReconciliationPeriodStore,
  ReconciliationPeriodStoreError,
} from '../ports/reconciliation-period-store.ts';
import type {
  BankStatementRepository,
  BankStatementRepositoryError,
} from '../ports/bank-statement-repository.ts';
import type {
  ReconciliationRepository,
  ReconciliationRepositoryError,
} from '../ports/reconciliation-repository.ts';
import type {
  PayableDocumentView,
  PayableDocumentViewError,
  PayableDocumentRow,
} from '../ports/payable-document-view.ts';
import type { CategoryReadPort, CategoryReadError } from '../ports/category-read.ts';
import type { CostCenterReadPort, CostCenterReadError } from '../ports/cost-center-read.ts';
import type { SupplierViewStore, SupplierViewStoreError } from '../ports/supplier-view-store.ts';
import type {
  CedenteAccountStore,
  CedenteAccountStoreError,
} from '../ports/cedente-account-store.ts';
import type { NiboExporter, NiboExportRow } from '../ports/nibo-exporter.ts';
import type { ManualEntry, Reconciliation } from '../../domain/reconciliation/types.ts';
import type { StatementTransaction, Movement } from '../../domain/statement/types.ts';
import { type PayeeKind, isPayeeKind } from '../../domain/document/types.ts';

export type ExportReconciliationNiboDeps = Readonly<{
  periodStore: Pick<ReconciliationPeriodStore, 'findById'>;
  statements: Pick<BankStatementRepository, 'listTransactionsByPeriod'>;
  reconciliationRepo: Pick<ReconciliationRepository, 'findActiveByTransaction'>;
  payableDocView: PayableDocumentView;
  categoryRead: CategoryReadPort;
  costCenterRead: CostCenterReadPort;
  supplierViewStore: Pick<SupplierViewStore, 'get'>;
  cedenteStore: Pick<CedenteAccountStore, 'findById'>;
  niboExporter: NiboExporter;
}>;

export type ExportReconciliationNiboInput = Readonly<{ periodId: string }>;

export type ExportReconciliationNiboOutput = Readonly<{ content: string }>;

export type ExportReconciliationNiboError =
  | 'reconciliation-period-id-invalid'
  | 'reconciliation-period-not-found'
  | ReconciliationPeriodStoreError
  | BankStatementRepositoryError
  | ReconciliationRepositoryError
  | PayableDocumentViewError
  | CategoryReadError
  | CostCenterReadError
  | SupplierViewStoreError
  | CedenteAccountStoreError;

// Projeção concreta (não-domínio): mapeamento de apresentação do layout Nibo. Espelha o EXPORT-
// ABSTRACTION-DESIGN — a composição da visão é da borda/app, transitória; `domain/` permanece intocado.
const PAYEE_KIND_TO_CONTACT_TYPE: Record<PayeeKind, string> = {
  supplier: 'Fornecedor',
  collaborator: 'Funcionário',
  financier: 'Sócio',
  act: 'Fornecedor',
};

// `payeeKind` chega como string crua do read; valida antes de mapear (desconhecido → vazio).
const contactTypeOf = (raw: string | null): string =>
  raw !== null && isPayeeKind(raw) ? PAYEE_KIND_TO_CONTACT_TYPE[raw] : '';

// Sinal do Nibo: pagamento (Debit) negativo, recebimento (Credit) positivo.
const signed = (cents: number, movement: Movement): number =>
  movement === 'Debit' ? -Math.abs(cents) : Math.abs(cents);

// `competencia` persistida é `YYYY-MM` (varchar(7)); o Nibo formata a data — projeta para o 1º dia (UTC).
const parseCompetencia = (raw: string | null): Date | null => {
  if (raw === null) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(raw);
  if (match === null) return null;
  const [, year, month] = match;
  if (year === undefined || month === undefined) return null;
  const monthNum = Number(month);
  if (monthNum < 1 || monthNum > 12) return null;
  return new Date(Date.UTC(Number(year), monthNum - 1, 1));
};

// Resolve ref → nome via read-model; ref ausente/não-resolvível → célula vazia (CA5).
const lookup = (names: ReadonlyMap<string, string>, ref: string | null | undefined): string =>
  ref == null ? '' : (names.get(ref) ?? '');

const TRANSFER_TYPES: ReadonlySet<ManualEntry['type']> = new Set([
  'Transfer',
  'Investment',
  'Redemption',
]);

// Exporta a conciliação de um período no layout de Importação em Lotes do Nibo (#146). Read-only:
// enriquece cada conciliação ativa (título → documento + nomes de referência; manual #141; transferência
// #143), monta `NiboExportRow[]` e delega a serialização ao port (Node puro, sem IO).
export const exportReconciliationNibo =
  (deps: ExportReconciliationNiboDeps) =>
  async (
    input: ExportReconciliationNiboInput,
  ): Promise<Result<ExportReconciliationNiboOutput, ExportReconciliationNiboError>> => {
    const idR = ReconciliationPeriodId.rehydrate(input.periodId);
    if (!idR.ok) return err('reconciliation-period-id-invalid');

    const periodR = await deps.periodStore.findById(idR.value);
    if (!periodR.ok) return err(periodR.error);
    if (periodR.value === null) return err('reconciliation-period-not-found');
    const period = periodR.value;

    const txsR = await deps.statements.listTransactionsByPeriod(
      period.debitAccountRef,
      period.periodStart,
      period.periodEnd,
    );
    if (!txsR.ok) return err(txsR.error);

    // Conciliações ativas das transações conciliadas (Pending é ignorada; ausência de conciliação ativa
    // numa transação não-Pending é inconsistência tolerada — degrada sem 5xx).
    const reconciled: { tx: StatementTransaction; rec: Reconciliation }[] = [];
    for (const tx of txsR.value) {
      if (tx.reconciliationStatus === 'Pending') continue;
      const recR = await deps.reconciliationRepo.findActiveByTransaction(tx.id);
      if (!recR.ok) return err(recR.error);
      if (recR.value === null) continue;
      reconciled.push({ tx, rec: recR.value });
    }

    // Documentos dos títulos — uma única leitura batch (sem N+1).
    const payableIds = reconciled.flatMap(({ rec }) => rec.items.map((i) => String(i.payableId)));
    const docsR = await deps.payableDocView.findByPayableIds(payableIds);
    if (!docsR.ok) return err(docsR.error);
    const docByPayable = new Map<string, PayableDocumentRow>(
      docsR.value.map((d) => [d.payableId, d]),
    );

    // Read-models de referência (ref → nome) — uma leitura cada.
    const catsR = await deps.categoryRead.list();
    if (!catsR.ok) return err(catsR.error);
    const categoryName = new Map<string, string>(catsR.value.map((c) => [c.id, c.name]));

    const ccR = await deps.costCenterRead.list();
    if (!ccR.ok) return err(ccR.error);
    const costCenterName = new Map<string, string>(ccR.value.map((c) => [c.id, c.name]));

    const supplierCache = new Map<string, string>();
    const resolveSupplier = async (
      ref: string | null,
    ): Promise<Result<string, SupplierViewStoreError>> => {
      if (ref === null) return ok('');
      const cached = supplierCache.get(ref);
      if (cached !== undefined) return ok(cached);
      const r = await deps.supplierViewStore.get(ref);
      if (!r.ok) return err(r.error);
      const name = r.value?.name ?? '';
      supplierCache.set(ref, name);
      return ok(name);
    };

    const accountCache = new Map<string, string>();
    const resolveAccount = async (
      ref: string | null,
    ): Promise<Result<string, CedenteAccountStoreError>> => {
      if (ref === null) return ok('');
      const cached = accountCache.get(ref);
      if (cached !== undefined) return ok(cached);
      const refIdR = CedenteAccountId.rehydrate(ref);
      if (!refIdR.ok) return ok(''); // ref não-resolvível → célula vazia (CA5)
      const r = await deps.cedenteStore.findById(refIdR.value);
      if (!r.ok) return err(r.error);
      const nickname = r.value?.nickname ?? '';
      accountCache.set(ref, nickname);
      return ok(nickname);
    };

    const periodAccountR = await resolveAccount(period.debitAccountRef);
    if (!periodAccountR.ok) return err(periodAccountR.error);
    const periodAccount = periodAccountR.value;

    const rows: NiboExportRow[] = [];
    for (const { tx, rec } of reconciled) {
      const manualEntry = rec.manualEntry;
      if (manualEntry !== null && TRANSFER_TYPES.has(manualEntry.type)) {
        // #143 — transferência/aplicação/resgate. Conta = destino (Transfer) ou produto (Investment/Redemption).
        const accountR =
          manualEntry.type === 'Transfer'
            ? await resolveAccount(manualEntry.destinationAccountRef)
            : ok(manualEntry.productLabel ?? '');
        if (!accountR.ok) return err(accountR.error);
        rows.push({
          transactionType: 'Transferência',
          contactName: '',
          description: manualEntry.description ?? '',
          category: '',
          valueCents: signed(manualEntry.valueCents, tx.movement),
          dueDate: null,
          forecastDate: null,
          competencia: null,
          costCenter: '',
          favorite: 'Não',
          contactType: '',
          reference: '',
          account: accountR.value,
          paymentDate: tx.date,
          annotation: '',
        });
        continue;
      }

      if (manualEntry !== null) {
        // #141 — manual classificado (FeePenaltyInterest/Payment/Receipt): 1 linha de Lançamento.
        const contactR = await resolveSupplier(manualEntry.supplierRef);
        if (!contactR.ok) return err(contactR.error);
        rows.push({
          transactionType: 'Lançamento',
          contactName: contactR.value,
          description: manualEntry.description ?? '',
          category: lookup(categoryName, manualEntry.categoryRef),
          valueCents: signed(manualEntry.valueCents, tx.movement),
          dueDate: null,
          forecastDate: null,
          competencia: null,
          costCenter: lookup(costCenterName, manualEntry.costCenterRef),
          favorite: 'Não',
          contactType: '',
          reference: '',
          account: periodAccount,
          paymentDate: tx.date,
          annotation: '',
        });
        continue;
      }

      // Lançamento de título conciliado: 1 linha por item (N:1 → N linhas).
      for (const item of rec.items) {
        const doc = docByPayable.get(String(item.payableId)) ?? null;
        const contactR = await resolveSupplier(doc?.supplierRef ?? null);
        if (!contactR.ok) return err(contactR.error);
        rows.push({
          transactionType: 'Lançamento',
          contactName: contactR.value,
          description: tx.memo,
          category: lookup(categoryName, doc?.categoryRef),
          valueCents: signed(item.reconciledValueCents, tx.movement),
          dueDate: doc?.dueDate ?? null,
          forecastDate: null,
          competencia: parseCompetencia(doc?.competencia ?? null),
          costCenter: lookup(costCenterName, doc?.costCenterRef),
          favorite: 'Não',
          contactType: contactTypeOf(doc?.payeeKind ?? null),
          reference: doc?.documentNumber ?? '',
          account: periodAccount,
          paymentDate: tx.date,
          annotation: '',
        });
      }
    }

    return ok({ content: deps.niboExporter.export(rows) });
  };
