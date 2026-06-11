-- 010-partner-contract-counts (R3) — vínculo Colaborador↔Programa por referência leve de ID.
-- `program_id` varchar(36) NULLABLE: UUID v4 do Programa (ref cross-módulo — ADR-0014: sem FK
-- física, sem import de programs/domain). COLLATE utf8mb4_bin (UUID — comparação binária),
-- editado à mão (limitação Drizzle 0.45.x — ver schemas/mysql.ts §CHARSET/COLLATE).
ALTER TABLE `par_collaborators` ADD `program_id` varchar(36) COLLATE utf8mb4_bin;
