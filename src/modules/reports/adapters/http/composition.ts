/**
 * Composition root do módulo reports para a borda HTTP (ADR-0006/0025/0027, épico Relatórios #114).
 * Read-only, sem persistência/schema próprios — lê projeções de outros módulos via public-api (ACL):
 *  - REP-1 "Equipe ABC" (#238) ← `partners` (collaborators);
 *  - REP-2 "Fornecedores sem Contrato" (#240) ← `financial` (payables `contract_ref IS NULL`).
 *
 * Pools abertos UMA vez no boot (não por requisição — F1 do W2 #238 / incidente RDS 0001),
 * fechados no `shutdown()`. Molde: `buildPartnersReadPort`.
 */
import { openCollaboratorProjectionReader } from '#src/modules/partners/public-api/index.ts';
import { openSuppliersWithoutContractReader } from '#src/modules/financial/public-api/index.ts';
import { TeamReportReadFromPartners } from '../persistence/team-report-read.partners.ts';
import { InMemoryTeamReportRead } from '../persistence/team-report-read.in-memory.ts';
import { SuppliersWithoutContractReadFromFinancial } from '../persistence/suppliers-without-contract-read.financial.ts';
import { InMemorySuppliersWithoutContractRead } from '../persistence/suppliers-without-contract-read.in-memory.ts';
import type { TeamReportReadPort } from '../../application/ports/team-report-read.ts';
import type { SuppliersWithoutContractReadPort } from '../../application/ports/suppliers-without-contract-read.ts';

export type ReportsDriver = 'memory' | 'mysql';

export type ReportsCompositionConfig = Readonly<{
  driver: ReportsDriver;
  /** Connection string do `partners` — fonte do REP-1 (ADR-0014). */
  partnersUrl?: string;
  /** Connection string do `financial` — fonte do REP-2 (ADR-0014). */
  financialUrl?: string;
}>;

export type ReportsHttpDeps = Readonly<{
  listTeam: TeamReportReadPort['list'];
  listSuppliersWithoutContract: SuppliersWithoutContractReadPort['list'];
  shutdown: () => Promise<void>;
}>;

export const buildReportsHttpDeps = async (
  config: ReportsCompositionConfig,
): Promise<ReportsHttpDeps> => {
  if (config.driver === 'memory') {
    const team: TeamReportReadPort = InMemoryTeamReportRead();
    const suppliers: SuppliersWithoutContractReadPort = InMemorySuppliersWithoutContractRead();
    return {
      listTeam: team.list,
      listSuppliersWithoutContract: suppliers.list,
      shutdown: () => Promise.resolve(),
    };
  }
  if (config.partnersUrl === undefined || config.partnersUrl.length === 0) {
    throw new Error('reports-composition: driver mysql exige partnersUrl');
  }
  if (config.financialUrl === undefined || config.financialUrl.length === 0) {
    throw new Error('reports-composition: driver mysql exige financialUrl');
  }

  const teamReaderR = await openCollaboratorProjectionReader({
    connectionString: config.partnersUrl,
  });
  if (!teamReaderR.ok) {
    throw new Error(`reports-composition: falha ao abrir reader do partners: ${teamReaderR.error}`);
  }
  const teamReader = teamReaderR.value;

  const suppliersReaderR = await openSuppliersWithoutContractReader({
    connectionString: config.financialUrl,
  });
  if (!suppliersReaderR.ok) {
    await teamReader.close(); // não vaza o pool já aberto do partners
    throw new Error(
      `reports-composition: falha ao abrir reader do financial: ${suppliersReaderR.error}`,
    );
  }
  const suppliersReader = suppliersReaderR.value;

  const teamPort = TeamReportReadFromPartners(teamReader.list);
  const suppliersPort = SuppliersWithoutContractReadFromFinancial(suppliersReader.list);

  return {
    listTeam: teamPort.list,
    listSuppliersWithoutContract: suppliersPort.list,
    shutdown: async () => {
      await teamReader.close();
      await suppliersReader.close();
    },
  };
};
