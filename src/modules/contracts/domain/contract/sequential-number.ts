// Formato canônico do número sequencial do contrato — conhecimento de domínio
// compartilhado pelos adapters que GERAM o número (CTR-CONTRACT-SEQUENTIAL-NUMBER).
// O rótulo é `NNNN/YYYY`: sequência zero-padded a 4 dígitos + ano. Espelha o
// `SEQUENTIAL_NUMBER_FORMAT` de `contract.ts`, que aceita 3-ou-4 dígitos (legado + gerado).

export const formatSequentialNumber = (seq: number, year: number): string =>
  `${String(seq).padStart(4, '0')}/${String(year)}`;

// ─── issue #425 — numeração pelo ano de criação/vigência inicial ──────────────
//
// O defeito: o import legado copiava `sequential_number` verbatim (`{XXXX}/{ano}`),
// e o legado republicava vigentes com o ano CORRENTE (ex.: `/2026`) — divorciando o
// sufixo do ano real de criação. A correção deriva o ano de `YEAR(original_period_start)`
// (criação = vigência inicial) e renumera preservando a sequência XXXX registrada.
//
// Estas funções são PURAS (sem I/O): o job de backfill e o use case de import as
// reusam para garantir o MESMO critério de derivação/resolução.

// Espelha `SEQUENTIAL_NUMBER_FORMAT` de contract.ts (`/^\d{3,4}\/\d{4}$/`): sequência
// de 3-ou-4 dígitos (legado + gerado) + barra + ano de 4 dígitos. Grupos capturam
// `XXXX` e `YYYY` para separar a sequência do ano.
const PARSE_RE = /^(\d{3,4})\/(\d{4})$/;

/**
 * Separa um número sequencial `NNN/AAAA` ou `NNNN/AAAA` em `{ seq, year }`.
 * Retorna `null` para formatos inesperados — o caller loga e pula (nunca corrompe).
 */
export const parseSequentialNumber = (
  n: string,
): Readonly<{ seq: number; year: number }> | null => {
  const m = PARSE_RE.exec(n);
  if (m === null) return null;
  // Grupos garantidos pelo match; `Number` sobre dígitos puros é seguro.
  return { seq: Number(m[1]), year: Number(m[2]) };
};

/**
 * Deriva o ano da numeração a partir da vigência inicial (issue #425, decisão 1):
 * criação = vigência inicial. `original_period_start` é uma data-calendário
 * persistida como `date` (UTC meia-noite, `timezone:'Z'` no driver), então o ano
 * de calendário é `getUTCFullYear()` — sem drift de timezone.
 */
export const deriveNumberYear = (originalPeriodStart: Date): number =>
  originalPeriodStart.getUTCFullYear();

// Resultado da política de resolução (issue #425, decisão 2): ou preserva a
// sequência `XXXX` trocando só o ano, ou sinaliza reatribuição (o caller obtém
// `nextSequentialNumber(anoAlvo)`). Discriminated union — switch exaustivo no caller.
export type SequentialNumberResolution =
  | Readonly<{ kind: 'preserve'; sequentialNumber: string }>
  | Readonly<{ kind: 'reassign' }>;

/**
 * Política de resolução de número (issue #425, decisão 2): preserva a sequência
 * `legacySeq` registrada, trocando só o ano → `legacySeq/targetYear`. Se esse
 * número já estiver ocupado (`isTaken`), sinaliza `reassign` — o caller atribui
 * `nextSequentialNumber(targetYear)`. Integridade acima de tudo: nunca duplica,
 * sempre respeita `UNIQUE(sequential_number)`.
 *
 * Função PURA: `isTaken` é um predicado injetado (set de números existentes),
 * tornando a política testável sem I/O.
 */
export const resolveSequentialNumber = (
  legacySeq: number,
  targetYear: number,
  isTaken: (candidate: string) => boolean,
): SequentialNumberResolution => {
  const preferred = formatSequentialNumber(legacySeq, targetYear);
  if (isTaken(preferred)) return { kind: 'reassign' };
  return { kind: 'preserve', sequentialNumber: preferred };
};
