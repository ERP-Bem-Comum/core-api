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
  lines.push(`  Valor original: ${formatMoney(c.originalValue)}`);
  lines.push(`  Vigência original: ${formatPeriod(c.originalPeriod)}`);
  // Pendente não tem vigência efetiva nem assinatura (ADR-0023).
  if (c.status === 'Pending') {
    lines.push('  (aguardando documento assinado — sem vigência efetiva)');
    return lines.join('\n');
  }
  // Daqui em diante `c` é efetivo (Active | Expired | Terminated).
  lines.push(`  Assinado em: ${formatDate(c.signedAt)}`);
  lines.push(`  Valor vigente: ${formatMoney(c.currentValue)}`);
  lines.push(`  Vigência vigente: ${formatPeriod(c.currentPeriod)}`);
  lines.push(`  Aditivos homologados: ${c.homologatedAmendmentIds.length}`);
  // Narrow via discriminator — só Expired/Terminated têm `endedAt`.
  if (c.status !== 'Active') {
    lines.push(`  Encerrado em: ${formatDate(c.endedAt)}`);
  }
  if (c.status === 'Terminated') {
    lines.push(`  Motivo do distrato: ${c.terminationReason ?? '(não informado)'}`);
  }
  return lines.join('\n');
};

export const formatContractSummary = (c: Contract): string => {
  // Pendente não tem `currentValue` — mostra o valor original.
  const value = c.status === 'Pending' ? c.originalValue : c.currentValue;
  return `${stripControlChars(c.sequentialNumber)} [${formatStatus(c.status)}] ${formatMoney(value)}`;
};
