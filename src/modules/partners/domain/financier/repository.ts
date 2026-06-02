/**
 * Port `FinancierRepository` — contrato de persistência do agregado `Financier`.
 *
 * Posicionado em `domain/financier/` (Critério H2): a unicidade de CNPJ é
 * invariante do agregado (legado `financiers.cnpj` UNIQUE) e entra na superfície
 * do port como erro `financier-cnpj-duplicate`.
 *
 * Sem outbox nesta fase — Financier não publica eventos cross-módulo ainda (YAGNI).
 *
 * Adapters esperados:
 *   - `InMemoryFinancierStore` (este ticket) — teste/CLI.
 *   - `DrizzleFinancierRepository` (futuro) — MySQL `par_financiers`, UNIQUE em `cnpj` (ADR-0020).
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { Cnpj } from '#src/shared/kernel/cnpj.ts';
import type { FinancierId } from './financier-id.ts';
import type { Financier } from './types.ts';

export type FinancierRepositoryError =
  | 'financier-repo-unavailable' // transient (timeout/conexão) no adapter real
  | 'financier-cnpj-duplicate'; // CNPJ já usado por outro Financier

export type FinancierRepository = Readonly<{
  findById: (id: FinancierId) => Promise<Result<Financier | null, FinancierRepositoryError>>;
  findByCnpj: (cnpj: Cnpj) => Promise<Result<Financier | null, FinancierRepositoryError>>;
  list: () => Promise<Result<readonly Financier[], FinancierRepositoryError>>;
  save: (financier: Financier) => Promise<Result<void, FinancierRepositoryError>>;
}>;
