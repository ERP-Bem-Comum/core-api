import type { Contract } from '../../domain/contract/types.ts';
import { formatStatus } from './status.ts';
import { formatMoney } from './money.ts';
import { formatDate } from './date.ts';
import { formatPeriod } from './period.ts';
import { stripControlChars } from './sanitize.ts';

export const formatContract = (c: Contract): string => {
  const lines: string[] = [];
  lines.push(`Contrato ${stripControlChars(c.sequentialNumber)}`);
  lines.push(`  ID: ${c.id as unknown as string}`);
  lines.push(`  Título: ${stripControlChars(c.title)}`);
  lines.push(`  Objetivo: ${stripControlChars(c.objective)}`);
  lines.push(`  Status: ${formatStatus(c.status)}`);
  lines.push(`  Assinado em: ${formatDate(c.signedAt)}`);
  lines.push(`  Valor original: ${formatMoney(c.originalValue)}`);
  lines.push(`  Valor vigente: ${formatMoney(c.currentValue)}`);
  lines.push(`  Vigência original: ${formatPeriod(c.originalPeriod)}`);
  lines.push(`  Vigência vigente: ${formatPeriod(c.currentPeriod)}`);
  lines.push(`  Aditivos homologados: ${c.homologatedAmendmentIds.length}`);
  if (c.endedAt !== null) {
    lines.push(`  Encerrado em: ${formatDate(c.endedAt)}`);
  }
  return lines.join('\n');
};

export const formatContractSummary = (c: Contract): string => {
  return `${stripControlChars(c.sequentialNumber)} [${formatStatus(c.status)}] ${formatMoney(c.currentValue)}`;
};
