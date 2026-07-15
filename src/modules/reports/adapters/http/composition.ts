/**
 * Composition root do módulo reports para a borda HTTP (ADR-0006/0025/0027, épico Relatórios #114).
 * Read-only, sem persistência/schema próprios — lê projeções de outros módulos via public-api (ACL):
 *  - REP-1 "Equipe ABC" (#238) ← `partners` (collaborators);
 *  - REP-2 "Fornecedores sem Contrato" (#240/#437) ← `financial` (candidatos: payables
 *    `contract_ref IS NULL`, `kind='Parent'`) MENOS `contracts` (contratantes com contrato Active),
 *    subtraídos em memória pelo use-case `listSuppliersWithoutActiveContract`;
 *  - REP-4 "Posição de Pagamentos" (#243) ← `financial` (fornecedor×CC×categoria, 3 baldes);
 *  - REP-3 "Análise de Planejamento" (#114) ← `financial` (categoria×CC×mês num período).
 *
 * Pools abertos UMA vez no boot (não por requisição — F1 do W2 #238 / incidente RDS 0001),
 * fechados no `shutdown()`. Molde: `buildPartnersReadPort`.
 */
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import type { Result } from '#src/shared/primitives/result.ts';
import { openCollaboratorProjectionReader } from '#src/modules/partners/public-api/index.ts';
import {
  openSuppliersWithoutContractReader,
  openPaymentPositionReader,
  openPayablesAnalysisReader,
} from '#src/modules/financial/public-api/index.ts';
import { buildContractsActiveContractorReadPort } from '#src/modules/contracts/public-api/index.ts';
import { TeamReportReadFromPartners } from '../persistence/team-report-read.partners.ts';
import { InMemoryTeamReportRead } from '../persistence/team-report-read.in-memory.ts';
import { SuppliersWithoutContractReadFromFinancial } from '../persistence/suppliers-without-contract-read.financial.ts';
import { InMemorySuppliersWithoutContractRead } from '../persistence/suppliers-without-contract-read.in-memory.ts';
import { ActiveContractorReadFromContracts } from '../persistence/active-contractor-read.contracts.ts';
import { InMemoryActiveContractorRead } from '../persistence/active-contractor-read.in-memory.ts';
import { PaymentPositionReadFromFinancial } from '../persistence/payment-position-read.financial.ts';
import { InMemoryPaymentPositionRead } from '../persistence/payment-position-read.in-memory.ts';
import {
  listSuppliersWithoutActiveContract,
  type ListSuppliersWithoutActiveContractError,
} from '../../application/use-cases/list-suppliers-without-active-contract.ts';
import { AnalysisReadFromFinancial } from '../persistence/analysis-read.financial.ts';
import { InMemoryAnalysisRead } from '../persistence/analysis-read.in-memory.ts';
import type { TeamReportReadPort } from '../../application/ports/team-report-read.ts';
import type {
  SupplierWithoutContract,
  SuppliersWithoutContractReadPort,
} from '../../application/ports/suppliers-without-contract-read.ts';
import type { ActiveContractorReadPort } from '../../application/ports/active-contractor-read.ts';
import type { PaymentPositionReadPort } from '../../application/ports/payment-position-read.ts';
import type { AnalysisReadPort } from '../../application/ports/analysis-read.ts';

export type ReportsDriver = 'memory' | 'mysql';

export type ReportsCompositionConfig = Readonly<{
  driver: ReportsDriver;
  /** Connection string do `partners` — fonte do REP-1 (ADR-0014). */
  partnersUrl?: string;
  /** Connection string do `financial` — fonte do REP-2/REP-4 (ADR-0014). */
  financialUrl?: string;
  /** Connection string do `contracts` — subtraendo do anti-join do REP-2 (#437, ADR-0014). */
  contractsUrl?: string;
}>;

export type ReportsHttpDeps = Readonly<{
  listTeam: TeamReportReadPort['list'];
  listSuppliersWithoutContract: () => Promise<
    Result<readonly SupplierWithoutContract[], ListSuppliersWithoutActiveContractError>
  >;
  listPaymentPosition: PaymentPositionReadPort['list'];
  listAnalysis: AnalysisReadPort['list'];
  shutdown: () => Promise<void>;
}>;

export const buildReportsHttpDeps = async (
  config: ReportsCompositionConfig,
): Promise<ReportsHttpDeps> => {
  if (config.driver === 'memory') {
    const team: TeamReportReadPort = InMemoryTeamReportRead();
    const suppliers: SuppliersWithoutContractReadPort = InMemorySuppliersWithoutContractRead();
    const activeContractors: ActiveContractorReadPort = InMemoryActiveContractorRead();
    const position: PaymentPositionReadPort = InMemoryPaymentPositionRead();
    const analysis: AnalysisReadPort = InMemoryAnalysisRead();
    return {
      listTeam: team.list,
      listSuppliersWithoutContract: listSuppliersWithoutActiveContract({
        suppliersRead: suppliers,
        activeContractorsRead: activeContractors,
      }),
      listPaymentPosition: position.list,
      listAnalysis: analysis.list,
      shutdown: () => Promise.resolve(),
    };
  }
  if (config.partnersUrl === undefined || config.partnersUrl.length === 0) {
    throw new Error('reports-composition: driver mysql exige partnersUrl');
  }
  if (config.financialUrl === undefined || config.financialUrl.length === 0) {
    throw new Error('reports-composition: driver mysql exige financialUrl');
  }
  if (config.contractsUrl === undefined || config.contractsUrl.length === 0) {
    throw new Error('reports-composition: driver mysql exige contractsUrl');
  }
  const financialUrl = config.financialUrl;
  const contractsUrl = config.contractsUrl;

  const teamReaderR = await openCollaboratorProjectionReader({
    connectionString: config.partnersUrl,
  });
  if (!teamReaderR.ok) {
    throw new Error(`reports-composition: falha ao abrir reader do partners: ${teamReaderR.error}`);
  }
  const teamReader = teamReaderR.value;

  const suppliersReaderR = await openSuppliersWithoutContractReader({
    connectionString: financialUrl,
  });
  if (!suppliersReaderR.ok) {
    await teamReader.close();
    throw new Error(
      `reports-composition: falha ao abrir reader (suppliers) do financial: ${suppliersReaderR.error}`,
    );
  }
  const suppliersReader = suppliersReaderR.value;

  const positionReaderR = await openPaymentPositionReader({
    connectionString: financialUrl,
    clock: ClockReal(),
  });
  if (!positionReaderR.ok) {
    await teamReader.close();
    await suppliersReader.close();
    throw new Error(
      `reports-composition: falha ao abrir reader (payment-position) do financial: ${positionReaderR.error}`,
    );
  }
  const positionReader = positionReaderR.value;

  const contractorsReaderR = await buildContractsActiveContractorReadPort({
    connectionString: contractsUrl,
  });
  if (!contractorsReaderR.ok) {
    await teamReader.close();
    await suppliersReader.close();
    await positionReader.close();
    throw new Error(
      `reports-composition: falha ao abrir reader (active-contractor) do contracts: ${contractorsReaderR.error}`,
    );
  }
  const contractorsReader = contractorsReaderR.value;

  const analysisReaderR = await openPayablesAnalysisReader({ connectionString: financialUrl });
  if (!analysisReaderR.ok) {
    await teamReader.close();
    await suppliersReader.close();
    await positionReader.close();
    await contractorsReader.close();
    throw new Error(
      `reports-composition: falha ao abrir reader (analysis) do financial: ${analysisReaderR.error}`,
    );
  }
  const analysisReader = analysisReaderR.value;

  const teamPort = TeamReportReadFromPartners(teamReader.list);
  const suppliersPort = SuppliersWithoutContractReadFromFinancial(suppliersReader.list);
  const contractorsPort = ActiveContractorReadFromContracts(
    contractorsReader.listContractorsWithActiveContract,
  );
  const positionPort = PaymentPositionReadFromFinancial(positionReader.list);
  const analysisPort = AnalysisReadFromFinancial(analysisReader.list);

  return {
    listTeam: teamPort.list,
    listSuppliersWithoutContract: listSuppliersWithoutActiveContract({
      suppliersRead: suppliersPort,
      activeContractorsRead: contractorsPort,
    }),
    listPaymentPosition: positionPort.list,
    listAnalysis: analysisPort.list,
    shutdown: async () => {
      await teamReader.close();
      await suppliersReader.close();
      await positionReader.close();
      await contractorsReader.close();
      await analysisReader.close();
    },
  };
};
