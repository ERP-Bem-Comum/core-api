/**
 * Composition root do módulo reports para a borda HTTP (ADR-0006/0025/0027, épico Relatórios #114).
 * Read-only, sem persistência/schema próprios — lê projeções de outros módulos via public-api (ACL):
 *  - REP-1 "Equipe ABC" (#238) ← `partners` (collaborators);
 *  - REP-2 "Fornecedores sem Contrato" (#240) ← `financial` (payables `contract_ref IS NULL`);
 *  - REP-4 "Posição de Pagamentos" (#243) ← `financial` (fornecedor×CC×categoria, 3 baldes).
 *
 * Pools abertos UMA vez no boot (não por requisição — F1 do W2 #238 / incidente RDS 0001),
 * fechados no `shutdown()`. Molde: `buildPartnersReadPort`.
 */
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { openCollaboratorProjectionReader } from '#src/modules/partners/public-api/index.ts';
import {
  openSuppliersWithoutContractReader,
  openPaymentPositionReader,
} from '#src/modules/financial/public-api/index.ts';
import { TeamReportReadFromPartners } from '../persistence/team-report-read.partners.ts';
import { InMemoryTeamReportRead } from '../persistence/team-report-read.in-memory.ts';
import { SuppliersWithoutContractReadFromFinancial } from '../persistence/suppliers-without-contract-read.financial.ts';
import { InMemorySuppliersWithoutContractRead } from '../persistence/suppliers-without-contract-read.in-memory.ts';
import { PaymentPositionReadFromFinancial } from '../persistence/payment-position-read.financial.ts';
import { InMemoryPaymentPositionRead } from '../persistence/payment-position-read.in-memory.ts';
import type { TeamReportReadPort } from '../../application/ports/team-report-read.ts';
import type { SuppliersWithoutContractReadPort } from '../../application/ports/suppliers-without-contract-read.ts';
import type { PaymentPositionReadPort } from '../../application/ports/payment-position-read.ts';

export type ReportsDriver = 'memory' | 'mysql';

export type ReportsCompositionConfig = Readonly<{
  driver: ReportsDriver;
  /** Connection string do `partners` — fonte do REP-1 (ADR-0014). */
  partnersUrl?: string;
  /** Connection string do `financial` — fonte do REP-2/REP-4 (ADR-0014). */
  financialUrl?: string;
}>;

export type ReportsHttpDeps = Readonly<{
  listTeam: TeamReportReadPort['list'];
  listSuppliersWithoutContract: SuppliersWithoutContractReadPort['list'];
  listPaymentPosition: PaymentPositionReadPort['list'];
  shutdown: () => Promise<void>;
}>;

export const buildReportsHttpDeps = async (
  config: ReportsCompositionConfig,
): Promise<ReportsHttpDeps> => {
  if (config.driver === 'memory') {
    const team: TeamReportReadPort = InMemoryTeamReportRead();
    const suppliers: SuppliersWithoutContractReadPort = InMemorySuppliersWithoutContractRead();
    const position: PaymentPositionReadPort = InMemoryPaymentPositionRead();
    return {
      listTeam: team.list,
      listSuppliersWithoutContract: suppliers.list,
      listPaymentPosition: position.list,
      shutdown: () => Promise.resolve(),
    };
  }
  if (config.partnersUrl === undefined || config.partnersUrl.length === 0) {
    throw new Error('reports-composition: driver mysql exige partnersUrl');
  }
  if (config.financialUrl === undefined || config.financialUrl.length === 0) {
    throw new Error('reports-composition: driver mysql exige financialUrl');
  }
  const financialUrl = config.financialUrl;

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

  const teamPort = TeamReportReadFromPartners(teamReader.list);
  const suppliersPort = SuppliersWithoutContractReadFromFinancial(suppliersReader.list);
  const positionPort = PaymentPositionReadFromFinancial(positionReader.list);

  return {
    listTeam: teamPort.list,
    listSuppliersWithoutContract: suppliersPort.list,
    listPaymentPosition: positionPort.list,
    shutdown: async () => {
      await teamReader.close();
      await suppliersReader.close();
      await positionReader.close();
    },
  };
};
