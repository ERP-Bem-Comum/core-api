/** Mapeadores application -> DTO HTTP. */
import type { TeamMember } from '../../application/ports/team-report-read.ts';
import type { SupplierWithoutContract } from '../../application/ports/suppliers-without-contract-read.ts';
import type { TeamReportResponseDto, SuppliersWithoutContractResponseDto } from './schemas.ts';

export const teamToDto = (members: readonly TeamMember[]): TeamReportResponseDto => ({
  team: members.map((m) => ({ ...m })),
});

export const suppliersWithoutContractToDto = (
  rows: readonly SupplierWithoutContract[],
): SuppliersWithoutContractResponseDto => ({
  suppliers: rows.map((s) => ({ ...s })),
});
