import type { CedenteAccountId } from '../cedente/cedente-account-id.ts';
import type { RemittanceId } from './remittance-id.ts';

// Lote de comunicação: UM arquivo de remessa, para UMA conta-cedente.
//
// A máquina de estados existe por causa de uma decisão de produto: o documento só vira
// `Transmitted` quando o `status/` do agente CONFIRMA — gravar no bucket não é transmitir. Entre
// gravar e confirmar existe uma janela (até 5 minutos, ADR-0061), e é a remessa que segura os
// documentos nesse intervalo. Sem ela, a seleção seguinte pegaria os mesmos documentos e o banco
// receberia o pagamento duas vezes.
//
//   Queued ──confirmTransmitted──► Transmitted   (desfecho final; nunca rebaixa)
//     │
//     └──────markFailed──────────► Failed ──discard──► Discarded
//
// `Failed` NÃO libera os documentos. "Sem confirmação" não é "não transmitiu": o arquivo pode ter
// saído e o status ter se perdido. Só o descarte explícito — decisão humana, com motivo — libera.
export type RemittanceStatus = 'Queued' | 'Transmitted' | 'Failed' | 'Discarded';

export type Remittance = Readonly<{
  id: RemittanceId;
  cedenteAccountId: CedenteAccountId;
  nsa: number;
  fileName: string;
  contentHash: string;
  documentIds: readonly string[];
  status: RemittanceStatus;
  generatedAt: string;
  settledAt?: string;
  detail?: string;
}>;

export type CreateRemittanceInput = Readonly<{
  id: RemittanceId;
  cedenteAccountId: CedenteAccountId;
  nsa: number;
  fileName: string;
  contentHash: string;
  documentIds: readonly string[];
  generatedAt: string;
}>;

export type RemittanceError =
  | 'remittance-without-documents'
  | 'remittance-duplicated-document'
  | 'remittance-file-name-required'
  | 'remittance-content-hash-required'
  | 'remittance-already-transmitted'
  | 'remittance-not-settleable'
  | 'remittance-discard-requires-reason'
  | 'remittance-discard-requires-failure';
