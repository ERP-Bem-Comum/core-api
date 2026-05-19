import type { Amendment, AmendmentKind, AmendmentStatus } from '../../domain/amendment/types.ts';
import { formatMoney } from './money.ts';
import { formatDate } from './date.ts';
import { stripControlChars } from './sanitize.ts';

// Tabelas dispatch substituem o `switch` com `throw unreachable` (REGR #2,
// regra "Zero throw" do CLAUDE.md raiz). O compilador valida exaustividade
// pelo tipo `Record<AmendmentKind, string>` / `Record<AmendmentStatus, string>`.
const AMENDMENT_KIND_LABELS: Readonly<Record<AmendmentKind, string>> = {
  Addition: 'Acréscimo',
  Suppression: 'Supressão',
  TermChange: 'Prazo',
  Misc: 'Variado',
};

const AMENDMENT_STATUS_LABELS: Readonly<Record<AmendmentStatus, string>> = {
  Pending: 'Pendente',
  Homologated: 'Homologado',
};

export const formatAmendmentKind = (k: AmendmentKind): string => AMENDMENT_KIND_LABELS[k];

export const formatAmendmentStatus = (s: AmendmentStatus): string => AMENDMENT_STATUS_LABELS[s];

export const formatAmendment = (a: Amendment): string => {
  const lines: string[] = [];
  lines.push(`Aditivo ${stripControlChars(a.amendmentNumber)}`);
  lines.push(`  ID: ${a.id as unknown as string}`);
  lines.push(`  Contrato: ${a.contractId as unknown as string}`);
  lines.push(`  Tipo: ${formatAmendmentKind(a.kind)}`);
  lines.push(`  Status: ${formatAmendmentStatus(a.status)}`);
  lines.push(`  Descrição: ${stripControlChars(a.description)}`);
  if (a.kind === 'Addition' || a.kind === 'Suppression') {
    lines.push(`  Valor de impacto: ${formatMoney(a.impactValue)}`);
  }
  if (a.kind === 'TermChange') {
    lines.push(`  Nova data fim: ${formatDate(a.newEndDate)}`);
  }
  lines.push(`  Documento anexado: ${a.signedDocumentRef === null ? 'não' : 'sim'}`);
  if (a.homologatedAt !== null) {
    lines.push(`  Homologado em: ${formatDate(a.homologatedAt)}`);
  }
  return lines.join('\n');
};
