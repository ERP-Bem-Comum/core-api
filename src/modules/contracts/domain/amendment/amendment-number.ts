// Formato canônico do número sequencial do aditivo — conhecimento de domínio compartilhado
// pelos adapters que GERAM o número (CTR-AMENDMENT-SIGNEDAT-AND-NUMBER, G3).
// Rótulo `NN/AAAA`: sequência (por contrato) zero-padded a 2 dígitos + ano de criação.
// Escopo per-contract — a sequência é a ordem de criação do aditivo DENTRO do contrato.

export const formatAmendmentNumber = (seq: number, year: number): string =>
  `${String(seq).padStart(2, '0')}/${String(year)}`;
