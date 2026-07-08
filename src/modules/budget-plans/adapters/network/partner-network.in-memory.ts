import { ok } from '../../../../shared/primitives/result.ts';
import type {
  PartnerNetworkPort,
  NetworkPartnerView,
} from '../../application/ports/partner-network.ts';

export type InMemoryPartnerNetworkSeed = Readonly<{
  states: readonly Readonly<{ ref: string; name: string; uf: string }>[];
  municipalities: readonly Readonly<{ ref: string; name: string; uf: string }>[];
}>;

export const InMemoryPartnerNetwork = (seed: InMemoryPartnerNetworkSeed): PartnerNetworkPort => {
  const views: readonly NetworkPartnerView[] = [
    ...seed.states.map((s) => ({ kind: 'state' as const, ref: s.ref, name: s.name, uf: s.uf })),
    ...seed.municipalities.map((m) => ({
      kind: 'municipality' as const,
      ref: m.ref,
      name: m.name,
      uf: m.uf,
    })),
  ];
  return {
    listNetworkPartners: async () => ok(views),
  };
};
