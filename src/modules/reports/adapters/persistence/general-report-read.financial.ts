/**
 * Adapter `GeneralReportReadPort` sobre o reader do `financial` + STITCH cross-módulo com `partners`
 * (ACL — ADR-0006/0014). Nunca importa `financial/domain|adapters` nem `partners/domain|adapters` —
 * só as public-api.
 *
 * Slice A entregava as colunas locais do financial. Slice B (#442) soma os NOMES de FINANCIADOR e
 * COLABORADOR: o financial entrega `payeeKind` + `supplierRef` (o ref do favorecido); aqui o nome é
 * resolvido por kind via `ContractorReadPort` (`getFinancierView`/`getCollaboratorView`).
 *
 * Slice C (#442) soma PIX + Dados Bancários (`pixKey`/`bankAccount`): existem SÓ em `Supplier`, logo
 * são resolvidos via `getSupplierView` apenas para linhas `supplier` (financier/collaborator/act →
 * null). Redação campo-a-campo por RBAC: `options.includeBankData === false` ⇒ o adapter NEM chama
 * `getSupplierView` (não desperdiça IO) e deixa pix/banco null em todas as linhas.
 *
 * Slice D (#442) soma o NÚMERO do contrato (`contractNumber`): resolvido cross-módulo a partir do
 * `contractRef` via `resolveContractNumbers` (contracts public-api), em LOTE — 1 chamada por página,
 * refs distintos não-nulos. Degradação graciosa: `err` ⇒ todos os `contractNumber` null.
 *
 * Recebe três deps já abertos no boot (nunca connection-strings): o `list` do reader do financial, o
 * read port do partners e o `resolveContractNumbers` do read port do contracts — pools singleton de
 * composição, fechados no `shutdown()`.
 *
 * Costura:
 *  1. lista a página no financial;
 *  2. coleta os refs de linhas `financier`/`collaborator` (nome) e `supplier` (pix/banco, só quando
 *     `includeBankData`), DEDUPE via Map<ref, valor> (cada ref resolvido UMA vez pelo getter certo);
 *  3. preenche `financierName`/`collaboratorName` por kind; `pixKey`/`bankAccount` só em supplier;
 *     os demais → null (supplier já tem nome local; act não tem coluna de nome).
 *  4. DEGRADAÇÃO GRACIOSA: getter → `err`/`null` ⇒ campo null (não derruba o relatório — campo a
 *     campo, como o payee-bank/ADR-0032). Só propaga erro se o próprio `list` do financial falhar.
 */
import { ok, err } from '#src/shared/primitives/result.ts';
import type { GeneralReportReader } from '#src/modules/financial/public-api/index.ts';
import type {
  ContractorReadPort,
  BankAccount,
  PixKey,
} from '#src/modules/partners/public-api/index.ts';
import type { ContractNumberReadPort } from '#src/modules/contracts/public-api/index.ts';
import type {
  GeneralReportReadPort,
  GeneralReportReadError,
  GeneralReportRow,
} from '../../application/ports/general-report-read.ts';

// Só os três getters usados — o adapter não precisa do resto do ContractorReadPort.
export type GeneralReportContractorRead = Pick<
  ContractorReadPort,
  'getFinancierView' | 'getCollaboratorView' | 'getSupplierView'
>;

// Slice D: só o resolvedor em LOTE do número — o adapter não precisa do resto do read port (nem do
// `close`, que é do pool boot-scoped e vive na composição).
export type GeneralReportContractNumberRead = ContractNumberReadPort['resolveContractNumbers'];

// PIX/banco costurados de uma view de supplier; ausência/err ⇒ ambos null (degradação graciosa).
type BankData = Readonly<{ pixKey: PixKey | null; bankAccount: BankAccount | null }>;
const NO_BANK: BankData = { pixKey: null, bankAccount: null };

export const GeneralReportReadFromFinancial = (
  listReport: GeneralReportReader['list'],
  contractorRead: GeneralReportContractorRead,
  resolveContractNumbers: GeneralReportContractNumberRead,
): GeneralReportReadPort => ({
  list: async (filter, pagination, options) => {
    const listed = await listReport(filter, pagination);
    if (!listed.ok) return err<GeneralReportReadError>('general-report-read-unavailable');
    const page = listed.value;

    // Slice D: NÚMERO do contrato em LOTE — coleta os `contractRef` DISTINTOS não-nulos da página e
    // resolve tudo numa ÚNICA chamada (dedupe também no store, antes do IN). DEGRADAÇÃO GRACIOSA: se
    // `resolveContractNumbers` falhar, cai num Map vazio → todos os `contractNumber` viram null (não
    // derruba o relatório — molde payee-bank/ADR-0032). Só o `list` do financial propaga erro.
    const contractRefs = [
      ...new Set(
        page.items.map((row) => row.contractRef).filter((ref): ref is string => ref !== null),
      ),
    ];
    const numbersR = await resolveContractNumbers(contractRefs);
    const contractNumbers: ReadonlyMap<string, string> = numbersR.ok ? numbersR.value : new Map();

    // DEDUPE por kind: cada ref resolvido uma única vez (null = ausente/err/não-encontrado).
    const financierNames = new Map<string, string | null>();
    const collaboratorNames = new Map<string, string | null>();
    const supplierBank = new Map<string, BankData>();

    for (const row of page.items) {
      if (
        row.payeeKind === 'financier' &&
        row.supplierRef !== null &&
        !financierNames.has(row.supplierRef)
      ) {
        const view = await contractorRead.getFinancierView(row.supplierRef);
        financierNames.set(
          row.supplierRef,
          view.ok && view.value !== null ? view.value.name : null,
        );
      }
      if (
        row.payeeKind === 'collaborator' &&
        row.supplierRef !== null &&
        !collaboratorNames.has(row.supplierRef)
      ) {
        const view = await contractorRead.getCollaboratorView(row.supplierRef);
        collaboratorNames.set(
          row.supplierRef,
          view.ok && view.value !== null ? view.value.name : null,
        );
      }
      // Slice C: só resolve pix/banco quando o gate RBAC concede (`includeBankData`) e a linha é
      // supplier — poupa a ida ao partners nas linhas redigidas e nos kinds sem destino de pagamento.
      if (
        options.includeBankData &&
        row.payeeKind === 'supplier' &&
        row.supplierRef !== null &&
        !supplierBank.has(row.supplierRef)
      ) {
        const view = await contractorRead.getSupplierView(row.supplierRef);
        supplierBank.set(
          row.supplierRef,
          view.ok && view.value !== null
            ? { pixKey: view.value.pixKey, bankAccount: view.value.bankAccount }
            : NO_BANK,
        );
      }
    }

    const items: GeneralReportRow[] = page.items.map((row) => {
      const bank =
        options.includeBankData && row.payeeKind === 'supplier' && row.supplierRef !== null
          ? (supplierBank.get(row.supplierRef) ?? NO_BANK)
          : NO_BANK;
      return {
        ...row,
        financierName:
          row.payeeKind === 'financier' && row.supplierRef !== null
            ? (financierNames.get(row.supplierRef) ?? null)
            : null,
        collaboratorName:
          row.payeeKind === 'collaborator' && row.supplierRef !== null
            ? (collaboratorNames.get(row.supplierRef) ?? null)
            : null,
        pixKey: bank.pixKey,
        bankAccount: bank.bankAccount,
        contractNumber:
          row.contractRef !== null ? (contractNumbers.get(row.contractRef) ?? null) : null,
      };
    });

    return ok({ ...page, items });
  },
});
