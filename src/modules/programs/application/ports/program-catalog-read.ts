/**
 * PROGRAM-CATALOG-READ — Port de LEITURA (read-only) do catálogo de programas com
 * status, consumível cross-módulo SÓ pela public-api (ADR-0006/0014).
 *
 * Port SEGREGADO (ISP — precedente `PartnerGeographyReadPort`): não altera o
 * `ProgramReadPort`/`ProgramView` existentes, cujos consumidores (contracts,
 * financial) constroem a view em fakes e quebrariam com campo obrigatório novo.
 * Consumidor atual: budget-plans (options + gate programa-ativo no create, #315).
 */

import type { Result } from '../../../../shared/primitives/result.ts';
import type { ProgramStatus } from '../../domain/program/status.ts';

export type ProgramCatalogView = Readonly<{
  ref: string;
  name: string;
  sigla: string;
  status: ProgramStatus;
}>;

export type ProgramCatalogReadError = 'program-catalog-read-unavailable';

export type ProgramCatalogReadPort = Readonly<{
  listCatalog: () => Promise<Result<readonly ProgramCatalogView[], ProgramCatalogReadError>>;
}>;
