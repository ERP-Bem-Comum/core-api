// Formato canônico do número sequencial do contrato — conhecimento de domínio
// compartilhado pelos adapters que GERAM o número (CTR-CONTRACT-SEQUENTIAL-NUMBER).
// O rótulo é `NNNN/YYYY`: sequência zero-padded a 4 dígitos + ano. Espelha o
// `SEQUENTIAL_NUMBER_FORMAT` de `contract.ts`, que aceita 3-ou-4 dígitos (legado + gerado).

export const formatSequentialNumber = (seq: number, year: number): string =>
  `${String(seq).padStart(4, '0')}/${String(year)}`;
