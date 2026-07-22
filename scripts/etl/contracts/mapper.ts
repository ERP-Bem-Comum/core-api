/**
 * Mapper ETL: linhas legadas `contracts`/`programs` → planos de domínio (ETL-CONTRACTS-WRITER).
 *
 * Decisões ratificadas (2026-07-02, relatorio-decisao-3-marteladas.md + mapa de migração):
 *   (a) Pacote A — número normalizado para a forma do GERADOR ('000000001/2025' → '0001/2025',
 *       via `formatSequentialNumber`); regex do domínio intocada; identidade = par (seq, ano).
 *   (c) exclusões por allowlist explícita (`exclusions.ts`) → quarentena `ExcludedByDecision`.
 *
 * Premissas documentadas (baratas de trocar; ver 000-request do ticket):
 *   - signedAt = contractPeriodStart (legado não tem coluna de assinatura);
 *   - endedAt (Finalizado→Terminated) = updatedAt (ato de finalização observado no legado).
 *
 * O que o create do domínio NÃO aceita (observations/email/telephone) e o que ainda não
 * tem destino (budgetPlanId — D5; URLs/pix/bancário do contrato — D3) vai no `artifact`
 * (de-para auditável), nunca descartado em silêncio.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor.ts';
import type { CreateContractInput } from '#src/modules/contracts/domain/contract/types.ts';
import { formatSequentialNumber } from '#src/modules/contracts/domain/contract/sequential-number.ts';
import type { CreateProgramCommand } from '#src/modules/programs/application/use-cases/create-program.ts';
import type { LegacyContractRow, LegacyProgramRow } from '../legacy/rows.ts';
import type { QuarantineReason } from '../quarantine/reason.ts';
import { EXCLUDED_CONTRACT_LEGACY_IDS } from './exclusions.ts';

// ── Número de contrato (decisão a — Pacote A) ────────────────────────────────

const LEGACY_CODE_FORMAT = /^(\d{1,9})\/(\d{4})$/;
const GENERATOR_MAX_SEQ = 9999; // 4 dígitos do gerador (formatSequentialNumber)

/** '000000001/2025' → '0001/2025'. Identidade preservada: par (seq, ano). */
export const normalizeSequentialNumber = (raw: string): Result<string, QuarantineReason> => {
  const m = LEGACY_CODE_FORMAT.exec(raw.trim());
  if (m?.[1] === undefined || m[2] === undefined) {
    return err({ tag: 'EnumUnknown', field: 'contract_code', attempted: raw });
  }
  const seq = Number(m[1]);
  const year = Number(m[2]);
  if (seq === 0) return err({ tag: 'EnumUnknown', field: 'contract_code', attempted: raw });
  if (seq > GENERATOR_MAX_SEQ) {
    return err({ tag: 'Overflow', field: 'contract_code', attempted: raw, maxLength: 4 });
  }
  return ok(formatSequentialNumber(seq, year));
};

/** Extrai (seq, ano) de um código legado VÁLIDO — usado no reconcile do contador. */
export const sequentialParts = (raw: string): Readonly<{ seq: number; year: number }> | null => {
  const m = LEGACY_CODE_FORMAT.exec(raw.trim());
  if (m?.[1] === undefined || m[2] === undefined) return null;
  const seq = Number(m[1]);
  return seq > 0 && seq <= GENERATOR_MAX_SEQ ? { seq, year: Number(m[2]) } : null;
};

// ── Contratos ────────────────────────────────────────────────────────────────

export type ContractMapRefs = Readonly<{
  /** legacy suppliers.id → uuid v4 do par_suppliers (via partnersEtlPort.findByLegacyId). */
  supplierRefByLegacyId: ReadonlyMap<number, string>;
  /** legacy programs.id → uuid v4 do prg_programs (de-para da etapa de programas). */
  programRefByLegacyId: ReadonlyMap<number, string>;
}>;

/** Extras auditáveis que não entram pelo create (D3/D5/observations) — vão ao de-para. */
export type ContractArtifact = Readonly<{
  legacyContractCode: string;
  legacyBudgetPlanId: number | null;
  signedContractUrl: string | null;
  legacyPixKeyType: string | null;
  legacyPixKey: string | null;
  legacyBankAccount: string | null;
  legacyContractType: string;
  legacyContractModel: string;
}>;

export type ContractPlan = Readonly<{
  legacyId: number;
  kind: 'active' | 'terminated';
  createInput: CreateContractInput;
  terminate: Readonly<{ at: Date }> | null;
  artifact: ContractArtifact;
}>;

type StatusPlan = Readonly<{ kind: ContractPlan['kind']; terminateAt: Date | null }>;

const planForStatus = (row: LegacyContractRow): Result<StatusPlan, QuarantineReason> => {
  switch (row.contractStatus) {
    case 'Em andamento':
      return ok({ kind: 'active', terminateAt: null });
    case 'Finalizado':
      // endedAt = updatedAt (premissa documentada: momento da finalização no legado).
      return ok({ kind: 'terminated', terminateAt: row.updatedAt });
    default:
      return err({ tag: 'EnumUnknown', field: 'contract_status', attempted: row.contractStatus });
  }
};

export const mapLegacyContractRow = (
  row: LegacyContractRow,
  refs: ContractMapRefs,
): Result<ContractPlan, readonly QuarantineReason[]> => {
  // Allowlist ANTES de tudo (decisão c): exclusão deliberada é quarentena com motivo humano.
  const decisionRef = EXCLUDED_CONTRACT_LEGACY_IDS.get(row.id);
  if (decisionRef !== undefined) {
    return err([{ tag: 'ExcludedByDecision', field: 'legacy_id', decisionRef }]);
  }

  const errors: QuarantineReason[] = [];

  const status = planForStatus(row);
  if (!status.ok) errors.push(status.error);

  const seqNumber = normalizeSequentialNumber(row.contractCode);
  if (!seqNumber.ok) errors.push(seqNumber.error);

  // Contratado: esta onda cobre APENAS supplier (pós-exclusão o dump não tem outros;
  // collaborator/financier/act exigiriam remaps próprios — quarentena explícita).
  let contractor: ContractorRef.ContractorRef | null = null;
  if (row.supplierId !== null) {
    const uuid = refs.supplierRefByLegacyId.get(row.supplierId);
    if (uuid === undefined) {
      errors.push({ tag: 'RequiredFieldMissing', field: 'supplier_ref' });
    } else {
      const made = ContractorRef.make('supplier', uuid);
      if (made.ok) contractor = made.value;
      else errors.push({ tag: 'PortError', field: 'contractor', portError: made.error });
    }
  } else {
    errors.push({ tag: 'RequiredFieldMissing', field: 'contractor' });
  }

  let programRef: string | null = null;
  if (row.programId !== null) {
    const uuid = refs.programRefByLegacyId.get(row.programId);
    if (uuid === undefined) errors.push({ tag: 'RequiredFieldMissing', field: 'program_ref' });
    else programRef = uuid;
  }

  // Money: float legado → centavos (regra global do mapa; soma auditada na reconciliação).
  const cents = Math.round(row.totalValue * 100);
  const money = Money.fromCents(cents);
  if (!money.ok || cents <= 0) {
    errors.push({ tag: 'RequiredFieldMissing', field: 'total_value' });
  }

  // Vigência: start obrigatório; end null → Indefinite (não ocorre no dump; defensivo).
  let period: Period.Period | null = null;
  if (row.contractPeriodStart === null) {
    errors.push({ tag: 'DateInvalid', field: 'contract_period_start', attempted: 'null' });
  } else {
    const start = PlainDate.fromDate(row.contractPeriodStart);
    if (row.contractPeriodEnd === null) {
      period = Period.createIndefinite(start);
    } else {
      const created = Period.create(start, PlainDate.fromDate(row.contractPeriodEnd));
      if (created.ok) period = created.value;
      else errors.push({ tag: 'DateInvalid', field: 'contract_period', attempted: created.error });
    }
  }

  const title = row.object.trim();
  if (title === '') errors.push({ tag: 'RequiredFieldMissing', field: 'object' });

  if (
    errors.length > 0 ||
    !status.ok ||
    !seqNumber.ok ||
    contractor === null ||
    !money.ok ||
    period === null ||
    row.contractPeriodStart === null
  ) {
    return err(errors);
  }

  const createInput: CreateContractInput = {
    id: ContractId.generate(),
    sequentialNumber: seqNumber.value,
    title,
    objective: title,
    // Premissa documentada: assinatura ≈ início de vigência (legado não tem signedAt).
    signedAt: row.contractPeriodStart,
    originalValue: money.value,
    originalPeriod: period,
    contractor,
    classification: 'CT', // schema: "legado vira CT"
    programId: programRef,
    budgetPlanId: null, // D5: plano orçamentário aguarda Camada 3 — fica no artifact
    categorizacao: null,
    centroDeCusto: null,
  };

  return ok({
    legacyId: row.id,
    kind: status.value.kind,
    createInput,
    terminate: status.value.terminateAt === null ? null : { at: status.value.terminateAt },
    artifact: {
      legacyContractCode: row.contractCode,
      legacyBudgetPlanId: row.budgetPlanId,
      signedContractUrl: row.signedContractUrl,
      legacyPixKeyType: row.pixInfoKeyType,
      legacyPixKey: row.pixInfoKey,
      legacyBankAccount: row.bancaryInfoBank,
      legacyContractType: row.contractType,
      legacyContractModel: row.contractModel,
    },
  });
};

// ── Programas ────────────────────────────────────────────────────────────────

export type ProgramArtifact = Readonly<{ legacyLogoUrl: string | null }>;

export type ProgramPlan = Readonly<{
  legacyId: number;
  cmd: CreateProgramCommand;
  artifact: ProgramArtifact;
}>;

export const mapLegacyProgramRow = (
  row: LegacyProgramRow,
): Result<ProgramPlan, readonly QuarantineReason[]> => {
  const errors: QuarantineReason[] = [];

  const name = row.name.trim();
  if (name === '') errors.push({ tag: 'RequiredFieldMissing', field: 'name' });

  const sigla = row.abbreviation.trim().toUpperCase();
  if (sigla === '') errors.push({ tag: 'RequiredFieldMissing', field: 'abbreviation' });

  if (errors.length > 0) return err(errors);

  return ok({
    legacyId: row.id,
    cmd: {
      name,
      sigla,
      director: row.director,
      generalCharacteristics: row.description,
      // Logo é URL do storage antigo — migração de blob é a D3; fica no artifact.
      logoKey: null,
    },
    artifact: { legacyLogoUrl: row.logo },
  });
};
