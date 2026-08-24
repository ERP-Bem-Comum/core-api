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

// #792 / ADR-0065 §5 — o título JÁ saiu numa remessa.
//
// Existe ao lado de `isApprovedForRemittance`, e não dentro dela, porque as duas respondem a
// perguntas diferentes que o pré-voo precisa distinguir. Antes do ADR-0065 um título `Transmitted`
// caía em `not-approved` pela negação da função acima — verdade formal, mensagem errada: mandava o
// operador ao fluxo de aprovação para um título que já estava aprovado E já tinha ido ao banco.
//
// ⚠️ Não relaxar `isApprovedForRemittance` para aceitar `Transmitted`. As duas funções têm de
// discordar: a geração precisa RECUSAR o transmitido (é a barreira anti-dupla-emissão do #736 e do
// #789), e o pré-voo precisa EXPLICÁ-LO. Uma função só, servindo às duas, ou abriria a geração ou
// devolveria a mensagem errada.
export const isTransmittedToVan = (status: DocumentStatus): boolean => status === 'Transmitted';
