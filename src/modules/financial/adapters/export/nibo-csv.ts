/**
 * Serializador puro do layout de Importação em Lotes do Nibo (#146) — 15 colunas, `;`, BOM, CRLF.
 *
 * Projeção concreta (EXPORT-ABSTRACTION-DESIGN): recebe linhas planas já enriquecidas pelo use-case
 * e devolve string. Sem IO, sem domínio. Reusa `escapeCsvCell`/`BOM` do util compartilhado.
 *
 * Segurança CSV: células de TEXTO passam por `escapeCsvCell` (anti-fórmula OWASP + RFC 4180). A célula
 * `Valor` é emitida RAW — é um número gerado por nós (centavos → "-2000,00"), não input do usuário; a
 * neutralização anti-fórmula a corromperia (`'-2000,00`) e o Nibo a leria como texto.
 */

import { escapeCsvCell, BOM, LINE_TERMINATOR } from '#src/shared/utils/csv.ts';
import type {
  NiboExportRow,
  NiboTransactionType,
  NiboExporter,
} from '#src/modules/financial/application/ports/nibo-exporter.ts';

const SEP = ';';

// Cabeçalho idêntico ao template Nibo (ordem fixa — CA1).
const NIBO_HEADERS: readonly string[] = [
  'Tipo de transação',
  'Nome do contato',
  'Descrição',
  'Categoria',
  'Valor',
  'Vencimento',
  'Previsto para',
  'Competência',
  'Centro de custo',
  'Favorito',
  'Tipo de contato',
  'Referência',
  'Conta',
  'Data pag/rec/transferência',
  'Anotação',
];

// A projeção (NiboExportRow/NiboTransactionType) vive no port (application); o adapter só serializa.
export type { NiboExportRow, NiboTransactionType };

/** dd/MM/aaaa (UTC) — formato aceito pelo Nibo na importação CSV; `null` → célula vazia. */
const fmtDate = (d: Date | null): string => {
  if (d === null) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${String(d.getUTCFullYear())}`;
};

/** Centavos → "-2000,00" (decimal vírgula, sinal preservado). */
const fmtValue = (cents: number): string => (cents / 100).toFixed(2).replace('.', ',');

const toNiboLine = (r: NiboExportRow): string => {
  const t = (s: string): string => escapeCsvCell(s, SEP);
  return [
    t(r.transactionType),
    t(r.contactName),
    t(r.description),
    t(r.category),
    fmtValue(r.valueCents), // raw — número controlado, não input (ver cabeçalho)
    fmtDate(r.dueDate),
    fmtDate(r.forecastDate),
    fmtDate(r.competencia),
    t(r.costCenter),
    t(r.favorite),
    t(r.contactType),
    t(r.reference),
    t(r.account),
    fmtDate(r.paymentDate),
    t(r.annotation),
  ].join(SEP);
};

export const toNiboCsv = (rows: readonly NiboExportRow[]): string => {
  const lines = [NIBO_HEADERS.join(SEP), ...rows.map(toNiboLine)];
  return BOM + lines.join(LINE_TERMINATOR) + LINE_TERMINATOR;
};

// Implementação do port NiboExporter (composição injeta no use-case).
export const niboExporter: NiboExporter = { export: toNiboCsv };
