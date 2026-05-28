import type { ImportContractsReport } from '../../application/use-cases/import-contracts.ts';
import type { ImportParseError } from '../import-parser.ts';
import { formatErrorCode } from './error.ts';

// Relatório PT-BR do import (UC-11). Falhas por linha reusam o dicionário de erros.
export const formatImportReport = (report: ImportContractsReport): string => {
  const modo = report.dryRun ? 'Simulação (dry-run)' : 'Importação concluída';
  const lines: string[] = [
    `${modo}: ${report.succeeded} OK / ${report.failed} falha(s) de ${report.total} linha(s).`,
  ];
  for (const f of report.failures) {
    lines.push(`  linha ${f.index} (${f.numero}): ${formatErrorCode(f.error)}`);
  }
  if (report.dryRun) {
    lines.push('Nenhum dado foi persistido. Use --confirmar para gravar.');
  }
  return lines.join('\n');
};

// Erros estruturais/parse (shape com `kind`, fora do dicionário de `formatErrorCode`).
export const formatImportParseError = (e: ImportParseError): string => {
  if (typeof e === 'object' && 'kind' in e) {
    return `Colunas obrigatórias ausentes: ${e.columns.join(', ')}.`;
  }
  switch (e) {
    case 'import-file-empty':
      return 'Arquivo vazio.';
    case 'import-malformed-json':
      return 'JSON malformado — não foi possível fazer parse.';
    case 'import-json-not-array':
      return 'JSON deve ser um array de objetos.';
    case 'import-row-not-object':
      return 'Cada item do JSON deve ser um objeto.';
  }
};
