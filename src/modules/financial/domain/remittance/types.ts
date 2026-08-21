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

// O TÍTULO preso por esta remessa, com a REFERÊNCIA que saiu no arquivo por ele (issue #752).
//
// O grão é o título, não a nota: retenção é título a pagar como qualquer outro, com forma e
// vencimento próprios, e o pai pode ser pago sem o filho. Dois títulos da mesma nota no mesmo
// arquivo são o caso NORMAL — enquanto isto era um vínculo por documento, essa seleção legítima
// era recusada como duplicata.
//
// `yourNumber` é o G064 "Seu Número" (Segmento A, colunas 074-093) — a referência que a EMPRESA
// atribui e que o banco devolve no retorno. É a chave de casamento, e ela é nossa: se sair em
// branco, o retorno chega e não há por onde ligá-lo ao título.
//
// ⚠️ É por isso que a emissão por título e o vínculo do retorno não se separam em fatias: emitir
// uma linha por título mantendo o vínculo na nota faria o banco confirmar um título e o sistema
// baixar a nota inteira — erro silencioso, e pior que o que a mudança veio corrigir.
//
// `documentId` viaja junto como fato histórico da emissão: quem lê o retorno precisa dizer ao
// operador de qual nota aquilo veio, e recomputar exigiria join com um cadastro que muda.
//
// ⚠️ Guardar a referência é o ponto inteiro. Ela é derivada (NSA + posição do pagamento), mas
// recalculá-la na leitura exigiria reproduzir o agrupamento em lotes exatamente como estava no dia
// da emissão — e o agrupamento depende do cadastro do favorecido, que muda. O valor emitido é fato
// histórico; recomputá-lo é reconstruir o passado a partir do presente.
export type RemittancePayable = Readonly<{
  payableId: string;
  documentId: string;
  yourNumber: string;
}>;

export type Remittance = Readonly<{
  id: RemittanceId;
  cedenteAccountId: CedenteAccountId;
  nsa: number;
  fileName: string;
  contentHash: string;
  payables: readonly RemittancePayable[];
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
  payables: readonly RemittancePayable[];
  generatedAt: string;
}>;

export type RemittanceError =
  | 'remittance-without-payables'
  // O MESMO título duas vezes. Dois títulos DIFERENTES da mesma nota são legítimos e não caem aqui.
  | 'remittance-duplicated-payable'
  // A referência de casamento não pôde ser atribuída a um título. Nasce nomeado, e não como
  // string vazia, porque o fallback silencioso para vazio é exatamente o defeito da #752: o arquivo
  // sai bem-formado, o banco aceita, e o retorno chega sem chave.
  | 'remittance-payable-without-reference'
  | 'remittance-duplicated-reference'
  | 'remittance-file-name-required'
  | 'remittance-content-hash-required'
  | 'remittance-already-transmitted'
  | 'remittance-not-settleable'
  | 'remittance-discard-requires-reason'
  | 'remittance-discard-requires-failure';
