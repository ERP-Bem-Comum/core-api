/**
 * QuarantineReason — motivo estruturado de quarentena de uma linha legada (ETL).
 *
 * Tagged union (PascalCase) com evidência. `attempted` carrega o valor que falhou
 * (PII potencial) — usado APENAS no arquivo de detalhe fora do git. `toSummary` produz
 * o resumo SEM PII (`{ tag, field }`) que é versionável no git (D12 — DLQ + metadata).
 * `describeReason` é a frase PT-BR para o humano, também sem o valor tentado.
 */

export type QuarantineReason =
  | Readonly<{ tag: 'CpfInvalid'; field: string; attempted: string }>
  | Readonly<{ tag: 'CnpjInvalid'; field: string; attempted: string }>
  | Readonly<{ tag: 'EmailInvalid'; field: string; attempted: string }>
  | Readonly<{ tag: 'EnumUnknown'; field: string; attempted: string }>
  | Readonly<{ tag: 'RequiredFieldMissing'; field: string }>
  | Readonly<{ tag: 'Overflow'; field: string; attempted: string; maxLength: number }>
  | Readonly<{ tag: 'DateInvalid'; field: string; attempted: string }>;

export type QuarantineSummary = Readonly<{ tag: QuarantineReason['tag']; field: string }>;

/** Resumo PII-free para o arquivo versionável (git). Descarta `attempted`. */
export const toSummary = (reason: QuarantineReason): QuarantineSummary => ({
  tag: reason.tag,
  field: reason.field,
});

/** Frase PT-BR para o humano. NÃO inclui o valor tentado (mantém o log livre de PII). */
export const describeReason = (reason: QuarantineReason): string => {
  switch (reason.tag) {
    case 'CpfInvalid':
      return `CPF inválido no campo ${reason.field}`;
    case 'CnpjInvalid':
      return `CNPJ inválido no campo ${reason.field}`;
    case 'EmailInvalid':
      return `E-mail inválido no campo ${reason.field}`;
    case 'EnumUnknown':
      return `Valor de enum desconhecido no campo ${reason.field}`;
    case 'RequiredFieldMissing':
      return `Campo obrigatório ausente: ${reason.field}`;
    case 'Overflow':
      return `Valor excede ${reason.maxLength} caracteres no campo ${reason.field}`;
    case 'DateInvalid':
      return `Data inválida no campo ${reason.field}`;
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
};
