/** Mapeador `TeamMember[]` (application) -> DTO HTTP (`{ team: [...] }`). */
import type { TeamMember } from '../../application/ports/team-report-read.ts';
import type { TeamReportResponseDto } from './schemas.ts';

export const teamToDto = (members: readonly TeamMember[]): TeamReportResponseDto => ({
  team: members.map((m) => ({ ...m })),
});
