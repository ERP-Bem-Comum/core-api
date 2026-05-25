/**
 * Formata `Payable` em bloco multilinhas legível em PT-BR.
 *
 * Estrutura:
 *   1. Cabeçalho com ID + Status (PT-BR)
 *   2. Vencimento (DD/MM/YYYY UTC)
 *   3. Valor (BRL via Intl)
 *   4. Beneficiário (2 linhas compactas — nome+TaxId formatado, depois banco+ag+conta)
 *   5. Linhas adicionais por status (narrow via discriminator):
 *      - Approved+: Aprovado em + Aprovado por
 *      - Transmitted+: Transmitido em
 *      - Rejected: Rejeitado em + Motivo
 *      - Overdue: Atrasado desde
 *      - Paid+: Pago em + (Bank: FITID + Data bancária | Manual: Registrado por)
 *      - Settled: Liquidado em + Liquidado por
 *
 * Pattern espelha `src/modules/contracts/cli/formatters/contract.ts` (versão
 * mais rica por causa dos 7 estados do agregado Payable).
 */

import type { Payable } from '#src/modules/financial/domain/payable/types.ts';
import type { BeneficiaryBankData } from '#src/modules/financial/domain/shared/beneficiary-bank-data.ts';
import * as TaxId from '#src/modules/financial/domain/shared/tax-id.ts';
import { formatStatus } from './status.ts';
import { formatMoney } from './money.ts';
import { formatDate } from './date.ts';

// Helper module-private para formatar Beneficiário em 2 linhas compactas.
const formatBeneficiary = (b: BeneficiaryBankData): readonly string[] => {
  const taxKind = b.holderTaxId.kind; // 'CPF' | 'CNPJ' (discriminator)
  const taxLabel = `${taxKind} ${TaxId.format(b.holderTaxId)}`;
  return [
    `  Beneficiário:   ${b.holderName} (${taxLabel})`,
    `  Conta:          Banco ${b.bankCode} ag ${b.agency} cc ${b.account}`,
  ];
};

export const formatPayable = (p: Payable): string => {
  const lines: string[] = [];
  lines.push(`Título Financeiro`);
  lines.push(`  ID:             ${p.id}`);
  lines.push(`  Status:         ${formatStatus(p.status)}`);
  lines.push(`  Vencimento:     ${formatDate(p.dueDate)}`);
  lines.push(`  Valor:          ${formatMoney(p.value)}`);
  lines.push(...formatBeneficiary(p.beneficiary));

  // ─── Narrow por status ─────────────────────────────────────────────────
  // Cada bloco `if` é independente e usa o discriminator `status` (+ `paidVia`
  // dentro de Paid/Settled) para narrow TS-safe.

  // Approved+ (todos os estados pós-aprovação têm ApprovalRecord).
  if (
    p.status === 'Approved' ||
    p.status === 'Transmitted' ||
    p.status === 'Rejected' ||
    p.status === 'Overdue' ||
    p.status === 'Paid' ||
    p.status === 'Settled'
  ) {
    lines.push(`  Aprovado em:    ${formatDate(p.approvedAt)}`);
    lines.push(`  Aprovado por:   ${p.approvedBy}`);
  }

  // Transmitted+ (estados pós-transmissão têm TransmissionRecord — exceto Manual-Paid/Settled).
  if (
    p.status === 'Transmitted' ||
    p.status === 'Rejected' ||
    p.status === 'Overdue' ||
    ((p.status === 'Paid' || p.status === 'Settled') && p.paidVia === 'Bank')
  ) {
    lines.push(`  Transmitido em: ${formatDate(p.transmittedAt)}`);
    lines.push(`  Remessa:        ${p.remittanceId}`);
  }

  // Rejected — campos específicos.
  if (p.status === 'Rejected') {
    lines.push(`  Rejeitado em:   ${formatDate(p.rejectedAt)}`);
    lines.push(`  Motivo:         ${p.rejectionReason}`);
  }

  // Overdue — campo específico.
  if (p.status === 'Overdue') {
    lines.push(`  Atrasado desde: ${formatDate(p.markedOverdueAt)}`);
  }

  // Paid+ (Manual e Bank). PaidVia discriminator separa os 2 sub-tipos.
  if (p.status === 'Paid' || p.status === 'Settled') {
    lines.push(`  Pago em:        ${formatDate(p.paidAt)}`);
    if (p.paidVia === 'Bank') {
      lines.push(`  FITID:          ${p.fitid}`);
      lines.push(`  Data bancária:  ${formatDate(p.bankPaymentDate)}`);
    } else {
      lines.push(`  Registrado por: ${p.paymentRegisteredBy}`);
    }
  }

  // Settled — campos específicos (Crivo Humano R6).
  if (p.status === 'Settled') {
    lines.push(`  Liquidado em:   ${formatDate(p.settledAt)}`);
    lines.push(`  Liquidado por:  ${p.settledBy}`);
  }

  return lines.join('\n');
};
