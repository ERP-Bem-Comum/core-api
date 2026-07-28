/**
 * Adapter `GeneralReportReadPort` sobre o reader do `financial` + STITCH cross-módulo com `partners`
 * (ACL — ADR-0006/0014). Nunca importa `financial/domain|adapters` nem `partners/domain|adapters` —
 * só as public-api.
 *
 * Slice A entregava as colunas locais do financial. Slice B (#442) soma os NOMES de FINANCIADOR e
 * COLABORADOR: o financial entrega `payeeKind` + `supplierRef` (o ref do favorecido); aqui o nome é
 * resolvido por kind via `ContractorReadPort` (só `getFinancierView`/`getCollaboratorView`).
 *
 * Recebe dois deps já abertos no boot (nunca connection-strings): o `list` do reader do financial e
 * o read port do partners — pools singleton de composição, fechados no `shutdown()`.
 *
 * Costura:
 *  1. lista a página no financial;
 *  2. coleta os refs de linhas `financier`/`collaborator`, DEDUPE via Map<ref,nome> (cada ref
 *     resolvido UMA vez pelo getter certo);
 *  3. preenche `financierName` só em linhas financier, `collaboratorName` só em collaborator;
 *     supplier/act → ambos null (supplier já tem nome local; act não tem coluna de nome).
 *  4. DEGRADAÇÃO GRACIOSA: getter → `err`/`null` ⇒ nome null (não derruba o relatório — campo a
 *     campo, como o payee-bank/ADR-0032). Só propaga erro se o próprio `list` do financial falhar.
 */
import { ok, err } from '#src/shared/primitives/result.ts';
import type { GeneralReportReader } from '#src/modules/financial/public-api/index.ts';
import type { ContractorReadPort } from '#src/modules/partners/public-api/index.ts';
import type {
  GeneralReportReadPort,
  GeneralReportReadError,
  GeneralReportRow,
} from '../../application/ports/general-report-read.ts';

// Só os dois getters de nome — o adapter não precisa do resto do ContractorReadPort.
export type GeneralReportContractorRead = Pick<
  ContractorReadPort,
  'getFinancierView' | 'getCollaboratorView'
>;

export const GeneralReportReadFromFinancial = (
  listReport: GeneralReportReader['list'],
  contractorRead: GeneralReportContractorRead,
): GeneralReportReadPort => ({
  list: async (filter, pagination) => {
    const listed = await listReport(filter, pagination);
    if (!listed.ok) return err<GeneralReportReadError>('general-report-read-unavailable');
    const page = listed.value;

    // DEDUPE por kind: cada ref resolvido uma única vez (null = ausente/err/não-encontrado).
    const financierNames = new Map<string, string | null>();
    const collaboratorNames = new Map<string, string | null>();

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
    }

    const items: GeneralReportRow[] = page.items.map((row) => ({
      ...row,
      financierName:
        row.payeeKind === 'financier' && row.supplierRef !== null
          ? (financierNames.get(row.supplierRef) ?? null)
          : null,
      collaboratorName:
        row.payeeKind === 'collaborator' && row.supplierRef !== null
          ? (collaboratorNames.get(row.supplierRef) ?? null)
          : null,
    }));

    return ok({ ...page, items });
  },
});
