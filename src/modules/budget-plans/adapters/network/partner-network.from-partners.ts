// ACL: PartnerNetworkPort ← PartnerGeographyReadPort (partners/public-api). "Redes" da
// tela = estados/municípios parceiros ATIVOS; ref é a chave natural do partners (UF/IBGE),
// string opaca aqui (a identidade UUID de orçamento-por-parceiro é assunto da Fatia 3).

import { ok, err } from '../../../../shared/primitives/result.ts';
import type { PartnerGeographyReadPort } from '../../../partners/public-api/read.ts';
import type {
  PartnerNetworkPort,
  NetworkPartnerView,
} from '../../application/ports/partner-network.ts';

export const PartnerNetworkFromPartners = (
  reader: PartnerGeographyReadPort,
): PartnerNetworkPort => ({
  listNetworkPartners: async () => {
    const states = await reader.listStates();
    if (!states.ok) return err('partner-network-unavailable');
    const municipalities = await reader.listMunicipalities();
    if (!municipalities.ok) return err('partner-network-unavailable');

    const views: readonly NetworkPartnerView[] = [
      ...states.value.map((s) => ({ kind: 'state' as const, ref: s.ref, name: s.name, uf: s.uf })),
      ...municipalities.value.map((m) => ({
        kind: 'municipality' as const,
        ref: m.ref,
        name: m.name,
        uf: m.uf,
      })),
    ];
    return ok(views);
  },
});
