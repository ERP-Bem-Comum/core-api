// Decisão D5 do ticket: extrair IDs por regex direto do stdout (que é o
// contrato com o usuário humano). Mais resiliente que parsear o `--state` JSON.
const UUID_V4_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

export const extractFirstUuid = (text: string): string | null => {
  const match = UUID_V4_REGEX.exec(text);
  return match === null ? null : match[0];
};

// Extrai o UUID associado a uma label específica do formatter
// (ex.: `  ID: <uuid>`, `  Contrato: <uuid>`).
export const extractUuidAfter = (text: string, label: string): string | null => {
  const labelIndex = text.indexOf(label);
  if (labelIndex === -1) return null;
  const sliced = text.slice(labelIndex);
  return extractFirstUuid(sliced);
};
