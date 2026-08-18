import type { DocumentStatus } from './types.ts';

// Só título APROVADO entra em remessa (#736).
//
// É a separação de funções que o `payable:approve` existe para garantir: `Draft`/`Open` ainda não
// passaram pela aprovação, e `Transmitted`/`Paid`/etc. já saíram do fluxo de seleção. Emitir
// pagamento de um título que ninguém aprovou contornaria o controle — e gravar no bucket `saida/`
// é enfileirar pagamento (ADR-0060), então o furo é de dinheiro, não de tela.
//
// Definição ÚNICA, dois consumidores: a geração recusa com `document-not-approved` (a barreira que
// importa), e o pré-voo marca a linha como `not-approved` — distinto de `blocked`, que significa
// "falta dado do cadastro" e mandaria o operador ao lugar errado.
export const isApprovedForRemittance = (status: DocumentStatus): boolean => status === 'Approved';
