// Nome da organização dona das contas-cedente. A conta guarda só o CNPJ (`document`); o nome é um só e
// serve à remessa CNAB (posições 073-102) e ao cabeçalho do relatório da conciliação.
//
// Não é segredo: é público na Receita e já aparece versionado (`scripts/seed/partners.ts`). O que
// NÃO cabe aqui é dado bancário por conta — agência, conta e DV vêm da linha.
//
// ⚠️ O `alpha()` da remessa trunca em 30 posições sem avisar. Este valor tem 20 — mudá-lo pede conferir o novo.
export const CEDENTE_COMPANY_NAME = 'ASSOCIACAO BEM COMUM';
