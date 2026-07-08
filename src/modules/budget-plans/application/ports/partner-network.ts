import type { Result } from '../../../../shared/primitives/result.ts';

// "Redes" da tela de criação = estados/municípios parceiros (módulo partners,
// domain/geography). Projeção mínima read-only; adapter real embrulha a extensão
// de geografia do partners/public-api/read.ts.

export type NetworkPartnerView = Readonly<{
  kind: 'state' | 'municipality';
  ref: string;
  name: string;
  uf: string;
}>;

export type PartnerNetworkError = 'partner-network-unavailable';

export type PartnerNetworkPort = Readonly<{
  listNetworkPartners: () => Promise<Result<readonly NetworkPartnerView[], PartnerNetworkError>>;
}>;
