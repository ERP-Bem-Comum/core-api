import type { RemittanceId } from './remittance-id.ts';
import { exhaustiveStringUnion } from '../../../../shared/primitives/exhaustive.ts';

// Eventos de domínio da remessa (EN passado). Ambos nascem da MESMA leitura — o `status/` publicado
// pelo agente (ADR-0060/0061) —, e é por isso que carregam `settledAt`: o instante que importa é o
// da execução na instância, não o da nossa varredura, que pode acontecer minutos depois.
//
// `payableIds` viaja junto de propósito. O consumidor típico ("quais pagamentos saíram?") não tem
// como responder sem os títulos, e obrigá-lo a voltar ao banco para descobrir transformaria um
// evento autocontido numa consulta acoplada ao nosso schema.
//
// São TÍTULOS, não notas: o pagamento é do título, e uma nota pode ter saído em parte — o pai no
// arquivo e a retenção ainda em aberto. Anunciar a nota diria que ela foi paga inteira.

export type RemittanceTransmitted = Readonly<{
  type: 'RemittanceTransmitted';
  remittanceId: RemittanceId;
  nsa: number;
  fileName: string;
  payableIds: readonly string[];
  settledAt: string;
  detail: string;
}>;

// "Sem confirmação", não "não transmitiu" — o arquivo pode ter saído e o status ter se perdido.
// Quem consumir este evento não deve concluir que o dinheiro não foi: deve concluir que ALGUÉM
// precisa olhar. Os documentos seguem presos até o descarte explícito.
export type RemittanceFailed = Readonly<{
  type: 'RemittanceFailed';
  remittanceId: RemittanceId;
  nsa: number;
  fileName: string;
  payableIds: readonly string[];
  settledAt: string;
  detail: string;
}>;

export type RemittanceEvent = RemittanceTransmitted | RemittanceFailed;

/**
 * Fonte única dos literais de `RemittanceEvent['type']` (anti-drift), no mesmo molde de
 * `DOCUMENT_EVENT_TYPES`. `exhaustiveStringUnion` força cobertura EXATA em tempo de compilação:
 * acrescentar um membro à union sem listá-lo aqui QUEBRA `pnpm run typecheck`.
 */
export const REMITTANCE_EVENT_TYPES = exhaustiveStringUnion<RemittanceEvent['type']>()([
  'RemittanceTransmitted',
  'RemittanceFailed',
] as const);
