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
import type { Movement } from '../../domain/statement/types.ts';
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

// #649: por PERÍODO (`:id`) OU por RANGE direto (conta + intervalo), sem depender de período fechado.
// O período sempre foi só carona da tripla `(debitAccountRef, periodStart, periodEnd)`.
export type ExportReconciliationNiboInput =
  | Readonly<{ by: 'period'; periodId: string }>
  | Readonly<{ by: 'range'; debitAccountRef: string; periodStart: Date; periodEnd: Date }>;

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

type ExportTriple = Readonly<{ debitAccountRef: string; periodStart: Date; periodEnd: Date }>;

// Resolve a tripla `(debitAccountRef, periodStart, periodEnd)`: do range direto, ou do período
// (`:id`) via findById. O período sempre foi só carona da tripla — nenhum caminho checa `status`.
const resolveTriple = async (
  input: ExportReconciliationNiboInput,
  periodStore: Pick<ReconciliationPeriodStore, 'findById'>,
): Promise<
  Result<
    ExportTriple,
    | 'reconciliation-period-id-invalid'
    | 'reconciliation-period-not-found'
    | ReconciliationPeriodStoreError
  >
> => {
  if (input.by === 'range') {
    return ok({
      debitAccountRef: input.debitAccountRef,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    });
  }
  const idR = ReconciliationPeriodId.rehydrate(input.periodId);
  if (!idR.ok) return err('reconciliation-period-id-invalid');
  const periodR = await periodStore.findById(idR.value);
  if (!periodR.ok) return err(periodR.error);
  if (periodR.value === null) return err('reconciliation-period-not-found');
  const { debitAccountRef, periodStart, periodEnd } = periodR.value;
  return ok({ debitAccountRef, periodStart, periodEnd });
};

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

// "Nome do contato" = favorecido: o contato registrado (fornecedor) quando resolve; senão o `payeeName`
// do extrato (coluna "NOME"). Garante que o nome nunca saia vazio numa linha conciliada (regra da P.O.).
const favorecido = (resolved: string, payeeName: string): string =>
  resolved !== '' ? resolved : payeeName;

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
    const tripleR = await resolveTriple(input, deps.periodStore);
    if (!tripleR.ok) return err(tripleR.error);
    const { debitAccountRef, periodStart, periodEnd } = tripleR.value;

    const txsR = await deps.statements.listTransactionsByPeriod(
      debitAccountRef,
      periodStart,
      periodEnd,
    );
    if (!txsR.ok) return err(txsR.error);

    // Conciliação ativa por transação. Pending não tem conciliação (vira linha crua do extrato no loop
    // final); ausência de conciliação ativa numa transação não-Pending é inconsistência tolerada (degrada
    // sem 5xx). Mapa por txId para o loop final poder iterar o extrato NA ORDEM e decidir por transação.
    const recByTx = new Map<string, Reconciliation>();
    for (const tx of txsR.value) {
      if (tx.reconciliationStatus === 'Pending') continue;
      const recR = await deps.reconciliationRepo.findActiveByTransaction(tx.id);
      if (!recR.ok) return err(recR.error);
      if (recR.value === null) continue;
      recByTx.set(String(tx.id), recR.value);
    }

    // Documentos dos títulos — uma única leitura batch (sem N+1).
    const payableIds = [...recByTx.values()].flatMap((rec) =>
      rec.items.map((i) => String(i.payableId)),
    );
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

    const periodAccountR = await resolveAccount(debitAccountRef);
    if (!periodAccountR.ok) return err(periodAccountR.error);
    const periodAccount = periodAccountR.value;

    // Itera o extrato NA ORDEM: conciliada → linha enriquecida; não conciliada → linha crua do extrato.
    const rows: NiboExportRow[] = [];
    for (const tx of txsR.value) {
      const rec = recByTx.get(String(tx.id));
      if (rec === undefined) {
        // Requisito P.O.: o arquivo mostra TODAS as movimentações, não só as conciliadas (#649 permite
        // exportar antes de concluir a conciliação). A linha traz só o que o extrato já tem — valor, data
        // e descrição (favorecido/memo); o enriquecimento (contato/categoria/centro/documento) fica em
        // branco até conciliar. Não-Pending sem conciliação ativa é inconsistência tolerada → sem linha.
        if (tx.reconciliationStatus === 'Pending') {
          rows.push({
            transactionType: 'Lançamento',
            // Mapeamento 1:1 com as colunas do extrato (decisão da P.O.): o `payeeName` (coluna "NOME" =
            // favorecido) vai para "Nome do contato"; o `memo` (coluna "DESCRIÇÃO") vai para "Descrição".
            contactName: tx.payeeName,
            description: tx.memo,
            category: '',
            valueCents: signed(tx.valueCents, tx.movement),
            dueDate: null,
            forecastDate: null,
            competencia: null,
            costCenter: '',
            favorite: 'Não',
            contactType: '',
            reference: '',
            account: periodAccount,
            paymentDate: tx.date,
            annotation: '',
          });
        }
        continue;
      }
      const manualEntry = rec.manualEntry;
      if (manualEntry !== null && TRANSFER_TYPES.has(manualEntry.type)) {
        // #143 — transferência/aplicação/resgate. Conta = destino (Transfer) ou produto (Investment/Redemption).
        const accountR =
          manualEntry.type === 'Transfer'
            ? await resolveAccount(manualEntry.destinationAccountRef)
            : ok(manualEntry.productLabel ?? '');
        if (!accountR.ok) return err(accountR.error);
        // #664: os vazios abaixo são INTENCIONAIS, não hardcode esquecido — a realocação patrimonial
        // circula entre contas da própria empresa e não é despesa/receita:
        //  · `contactName` — o domínio PROÍBE `supplierRef` em realocação (`realloc-forbids-supplier`),
        //    então nunca há contato a resolver;
        //  · `category`/`costCenter` — a P.O. definiu que Transferência/Aplicação/Resgate NÃO classificam
        //    (mesma isenção da Opção 1 / `isCapitalReallocation`); o Nibo tampouco classifica uma
        //    "Transferência". Preencher aqui contradiria a regra.
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
          // Nome e descrição nunca vazios (regra P.O.): fornecedor registrado ou o favorecido do extrato;
          // descrição do manual ou o memo do extrato.
          contactName: favorecido(contactR.value, tx.payeeName),
          description: manualEntry.description ?? tx.memo,
          category: lookup(categoryName, manualEntry.categoryRef),
          valueCents: signed(manualEntry.valueCents, tx.movement),
          dueDate: null,
          forecastDate: null,
          competencia: null,
          costCenter: lookup(costCenterName, manualEntry.costCenterRef),
          favorite: 'Não',
          // #664: o lançamento manual só referencia FORNECEDOR (`supplierRef`; o domínio não carrega
          // outro tipo de contato), então o tipo de contato é 'Fornecedor' quando há fornecedor — espelha
          // o `contactTypeOf(payeeKind)` da linha de título. Sem `supplierRef` → vazio.
          contactType: manualEntry.supplierRef !== null ? PAYEE_KIND_TO_CONTACT_TYPE.supplier : '',
          // #664: nº do documento do lançamento manual (#370) — o domínio já tem, o export descartava.
          reference: manualEntry.documentNumber ?? '',
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
          // Nome nunca vazio (regra P.O.): fornecedor registrado do título ou o favorecido do extrato.
          contactName: favorecido(contactR.value, tx.payeeName),
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
