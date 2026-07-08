/**
 * PARTNERS-GEOGRAPHY-READ-PORT — Port de LEITURA (read-only) das "redes" (estados/
 * municípios parceiros ATIVOS), consumível cross-módulo SÓ pela public-api (ADR-0006/
 * ADR-0014). Precedente: `AuthUserReadPort` (#207, `auth/application/ports/user-read.ts`).
 *
 * Port SEGREGADO (ISP) — não altera `ContractorReadPort`. O adapter Drizzle implementa
 * ambos. Devolve a projeção mínima `{ ref, name, uf }`:
 *   - `ref`: chave natural (UF de 2 chars para estado; código IBGE de 7 dígitos para
 *     município) — string opaca, NÃO confundir com `PartnerStateRef`/`PartnerMunicipalityRef`
 *     (branded UUID v4 do módulo budget-plans, identidade de uma futura entidade de
 *     orçamento por parceiro — Fatia 3, fora deste port).
 *   - `name`: hidratado do catálogo estático IBGE (`domain/geography/{state,municipality}.ts`)
 *     — `par_states`/`par_municipalities` não guardam nome (só o toggle de parceria).
 *
 * Só lista parcerias ATIVAS (`active = true`) — "rede" = parceiro corrente, não histórico.
 */

import type { Result } from '#src/shared/primitives/result.ts';

export type PartnerGeographyReadError = 'partner-geography-read-unavailable';

export type PartnerStateView = Readonly<{ ref: string; name: string; uf: string }>;
export type PartnerMunicipalityView = Readonly<{ ref: string; name: string; uf: string }>;

export type PartnerGeographyReadPort = Readonly<{
  /** Estados parceiros ATIVOS, projeção mínima `{ ref: uf, name, uf }`. */
  listStates: () => Promise<Result<readonly PartnerStateView[], PartnerGeographyReadError>>;
  /** Municípios parceiros ATIVOS, projeção mínima `{ ref: ibgeCode, name, uf }`. */
  listMunicipalities: () => Promise<
    Result<readonly PartnerMunicipalityView[], PartnerGeographyReadError>
  >;
}>;
