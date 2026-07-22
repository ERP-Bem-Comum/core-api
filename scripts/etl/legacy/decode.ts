/**
 * Decode: linha crua do `mysql2` (`Record<string, unknown>`) → `LegacyXRow` tipado.
 *
 * Borda do sistema de tipos: nada de `any`. Cada campo é extraído por predicate;
 * tipo errado/ausente em campo obrigatório → `RequiredFieldMissing`; `Date` inválida
 * (zero-date `0000-00-00`) → `DateInvalid`. Acumula TODOS os problemas da linha.
 *
 * ⚠️ A coluna `password` NÃO é decodificada (D6 + segurança) — sequer é referenciada.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { QuarantineReason } from '../quarantine/reason.ts';
import type {
  LegacyFinancierRow,
  LegacySupplierRow,
  LegacyCollaboratorRow,
  LegacyUserRow,
  LegacyContractRow,
  LegacyProgramRow,
  LegacyAccountRow,
  LegacyPayableRow,
  LegacyApprovalRow,
  LegacyCategorizationRow,
  LegacyInstallmentRow,
} from './rows.ts';

type Errors = QuarantineReason[];
type DecodeResult<T> = Result<T, readonly QuarantineReason[]>;
type RawRow = Readonly<Record<string, unknown>>;

type Reader = Readonly<{
  reqStr: (col: string) => string;
  nStr: (col: string) => string | null;
  reqNum: (col: string) => number;
  nNum: (col: string) => number | null;
  reqDate: (col: string) => Date;
  nDate: (col: string) => Date | null;
  errors: Errors;
}>;

const isValidDate = (v: unknown): v is Date => v instanceof Date && !Number.isNaN(v.getTime());

// Representação segura de um valor-data inválido (evita '[object Object]'); sem PII.
const reprDate = (v: unknown): string =>
  v instanceof Date ? 'invalid-date' : typeof v === 'string' ? v : 'non-date';

const makeReader = (raw: RawRow): Reader => {
  const errors: Errors = [];
  return {
    errors,
    reqStr: (col) => {
      const v = raw[col];
      if (typeof v === 'string') return v;
      errors.push({ tag: 'RequiredFieldMissing', field: col });
      return '';
    },
    nStr: (col) => {
      const v = raw[col];
      if (v === null || v === undefined) return null;
      if (typeof v === 'string') return v;
      errors.push({ tag: 'RequiredFieldMissing', field: col });
      return null;
    },
    reqNum: (col) => {
      const v = raw[col];
      if (typeof v === 'number') return v;
      errors.push({ tag: 'RequiredFieldMissing', field: col });
      return 0;
    },
    nNum: (col) => {
      const v = raw[col];
      if (v === null || v === undefined) return null;
      if (typeof v === 'number') return v;
      errors.push({ tag: 'RequiredFieldMissing', field: col });
      return null;
    },
    reqDate: (col) => {
      const v = raw[col];
      if (isValidDate(v)) return v;
      errors.push({ tag: 'DateInvalid', field: col, attempted: reprDate(v) });
      return new Date(0);
    },
    nDate: (col) => {
      const v = raw[col];
      if (v === null || v === undefined) return null;
      if (isValidDate(v)) return v;
      errors.push({ tag: 'DateInvalid', field: col, attempted: reprDate(v) });
      return null;
    },
  };
};

const finish = <T>(row: T, errors: readonly QuarantineReason[]): DecodeResult<T> =>
  errors.length > 0 ? err(errors) : ok(row);

export const decodeFinancierRow = (raw: RawRow): DecodeResult<LegacyFinancierRow> => {
  const d = makeReader(raw);
  const row: LegacyFinancierRow = {
    id: d.reqNum('id'),
    name: d.reqStr('name'),
    corporateName: d.reqStr('corporateName'),
    legalRepresentative: d.reqStr('legalRepresentative'),
    cnpj: d.reqStr('cnpj'),
    telephone: d.reqStr('telephone'),
    address: d.reqStr('address'),
    active: d.reqNum('active'),
    createdAt: d.reqDate('createdAt'),
    updatedAt: d.reqDate('updatedAt'),
  };
  return finish(row, d.errors);
};

export const decodeSupplierRow = (raw: RawRow): DecodeResult<LegacySupplierRow> => {
  const d = makeReader(raw);
  const row: LegacySupplierRow = {
    id: d.reqNum('id'),
    name: d.reqStr('name'),
    email: d.reqStr('email'),
    cnpj: d.reqStr('cnpj'),
    corporateName: d.reqStr('corporateName'),
    fantasyName: d.reqStr('fantasyName'),
    serviceCategory: d.reqStr('serviceCategory'),
    active: d.reqNum('active'),
    bancaryInfoBank: d.nStr('bancaryInfoBank'),
    bancaryInfoAgency: d.nStr('bancaryInfoAgency'),
    bancaryInfoAccountnumber: d.nStr('bancaryInfoAccountnumber'),
    bancaryInfoDv: d.nStr('bancaryInfoDv'),
    pixInfoKeyType: d.nStr('pixInfoKey_type'),
    pixInfoKey: d.nStr('pixInfoKey'),
    serviceEvaluation: d.nNum('serviceEvaluation'),
    commentEvaluation: d.nStr('commentEvaluation'),
    createdAt: d.reqDate('createdAt'),
    updatedAt: d.reqDate('updatedAt'),
  };
  return finish(row, d.errors);
};

export const decodeCollaboratorRow = (raw: RawRow): DecodeResult<LegacyCollaboratorRow> => {
  const d = makeReader(raw);
  const row: LegacyCollaboratorRow = {
    id: d.reqNum('id'),
    name: d.reqStr('name'),
    email: d.reqStr('email'),
    cpf: d.reqStr('cpf'),
    occupationArea: d.reqStr('occupationArea'),
    role: d.nStr('role'),
    startOfContract: d.reqDate('startOfContract'),
    employmentRelationship: d.reqStr('employmentRelationship'),
    status: d.reqStr('status'),
    active: d.reqNum('active'),
    disableBy: d.nStr('disableBy'),
    rg: d.nStr('rg'),
    dateOfBirth: d.nDate('dateOfBirth'),
    genderIdentity: d.nStr('genderIdentity'),
    race: d.nStr('race'),
    education: d.nStr('education'),
    foodCategory: d.nStr('foodCategory'),
    foodCategoryDescription: d.nStr('foodCategoryDescription'),
    completeAddress: d.nStr('completeAddress'),
    telephone: d.nStr('telephone'),
    emergencyContactName: d.nStr('emergencyContactName'),
    emergencyContactTelephone: d.nStr('emergencyContactTelephone'),
    allergies: d.nStr('allergies'),
    biography: d.nStr('biography'),
    experienceInThePublicSector: d.nNum('experienceInThePublicSector'),
    createdAt: d.reqDate('createdAt'),
    updatedAt: d.reqDate('updatedAt'),
  };
  return finish(row, d.errors);
};

export const decodeUserRow = (raw: RawRow): DecodeResult<LegacyUserRow> => {
  const d = makeReader(raw);
  // `password` deliberadamente NÃO lido — D6 + segurança.
  const row: LegacyUserRow = {
    id: d.reqNum('id'),
    name: d.reqStr('name'),
    email: d.reqStr('email'),
    cpf: d.reqStr('cpf'),
    telephone: d.reqStr('telephone'),
    imageUrl: d.nStr('imageUrl'),
    active: d.reqNum('active'),
    massApprovalPermission: d.reqNum('massApprovalPermission'),
    collaboratorId: d.nNum('collaboratorId'),
    createdAt: d.reqDate('createdAt'),
    updatedAt: d.reqDate('updatedAt'),
  };
  return finish(row, d.errors);
};

// ── ETL-CONTRACTS-WRITER ─────────────────────────────────────────────────────

export const decodeContractRow = (raw: RawRow): DecodeResult<LegacyContractRow> => {
  const d = makeReader(raw);
  const row: LegacyContractRow = {
    id: d.reqNum('id'),
    contractCode: d.reqStr('contractCode'),
    contractType: d.reqStr('contractType'),
    contractModel: d.reqStr('contractModel'),
    contractStatus: d.reqStr('contractStatus'),
    object: d.reqStr('object'),
    totalValue: d.reqNum('totalValue'),
    supplierId: d.nNum('supplierId'),
    collaboratorId: d.nNum('collaboratorId'),
    financierId: d.nNum('financierId'),
    programId: d.nNum('programId'),
    budgetPlanId: d.nNum('budgetPlanId'),
    contractPeriodStart: d.nDate('contractPeriodStart'),
    contractPeriodEnd: d.nDate('contractPeriodEnd'),
    contractPeriodIsIndefinite: d.reqNum('contractPeriodIsIndefinite'),
    signedContractUrl: d.nStr('signedContractUrl'),
    pixInfoKeyType: d.nStr('pixInfoKey_type'),
    pixInfoKey: d.nStr('pixInfoKey'),
    bancaryInfoBank: d.nStr('bancaryInfoBank'),
    bancaryInfoAgency: d.nStr('bancaryInfoAgency'),
    bancaryInfoAccountnumber: d.nStr('bancaryInfoAccountnumber'),
    bancaryInfoDv: d.nStr('bancaryInfoDv'),
    createdAt: d.reqDate('createdAt'),
    updatedAt: d.reqDate('updatedAt'),
  };
  return finish(row, d.errors);
};

export const decodeProgramRow = (raw: RawRow): DecodeResult<LegacyProgramRow> => {
  const d = makeReader(raw);
  const row: LegacyProgramRow = {
    id: d.reqNum('id'),
    name: d.reqStr('name'),
    abbreviation: d.reqStr('abbreviation'),
    director: d.nStr('director'),
    description: d.nStr('description'),
    logo: d.nStr('logo'),
    active: d.reqNum('active'),
    createdAt: d.reqDate('createdAt'),
    updatedAt: d.reqDate('updatedAt'),
  };
  return finish(row, d.errors);
};

// ── ETL-FINANCIAL-WRITER ─────────────────────────────────────────────────────

export const decodeAccountRow = (raw: RawRow): DecodeResult<LegacyAccountRow> => {
  const d = makeReader(raw);
  const row: LegacyAccountRow = {
    id: d.reqNum('id'),
    name: d.reqStr('name'),
    bank: d.reqStr('bank'),
    agency: d.reqStr('agency'),
    accountNumber: d.reqStr('accountNumber'),
    dv: d.reqStr('dv'),
    initialBalance: d.reqNum('initialBalance'),
    createdAt: d.reqDate('createdAt'),
    updatedAt: d.reqDate('updatedAt'),
  };
  return finish(row, d.errors);
};

export const decodePayableRow = (raw: RawRow): DecodeResult<LegacyPayableRow> => {
  const d = makeReader(raw);
  const row: LegacyPayableRow = {
    id: d.reqNum('id'),
    identifierCode: d.nStr('identifierCode'),
    debtorType: d.reqStr('debtorType'),
    supplierId: d.nNum('supplierId'),
    collaboratorId: d.nNum('collaboratorId'),
    payableStatus: d.reqStr('payableStatus'),
    paymentType: d.reqStr('paymentType'),
    obs: d.nStr('obs'),
    liquidValue: d.reqNum('liquidValue'),
    taxValue: d.reqNum('taxValue'),
    totalValue: d.reqNum('totalValue'),
    paymentMethod: d.nStr('paymentMethod'),
    barcode: d.nStr('barcode'),
    docType: d.nStr('docType'),
    accountId: d.nNum('accountId'),
    contractId: d.nNum('contractId'),
    recurrent: d.reqNum('recurrent'),
    dueDate: d.nDate('dueDate'),
    paymentDate: d.nDate('paymentDate'),
    competenceDate: d.nDate('competence_date'),
    createdAt: d.reqDate('createdAt'),
    updatedAt: d.reqDate('updatedAt'),
  };
  return finish(row, d.errors);
};

export const decodeApprovalRow = (raw: RawRow): DecodeResult<LegacyApprovalRow> => {
  const d = makeReader(raw);
  const row: LegacyApprovalRow = {
    id: d.reqNum('id'),
    collaboratorId: d.nNum('collaboratorId'),
    userId: d.nNum('userId'),
    payableId: d.reqNum('payableId'),
    approved: d.nNum('approved'),
    createdAt: d.reqDate('createdAt'),
  };
  return finish(row, d.errors);
};

export const decodeCategorizationRow = (raw: RawRow): DecodeResult<LegacyCategorizationRow> => {
  const d = makeReader(raw);
  const row: LegacyCategorizationRow = {
    id: d.reqNum('id'),
    programId: d.nNum('programId'),
    budgetPlanId: d.nNum('budgetPlanId'),
    costCenterId: d.nNum('costCenterId'),
    categoryId: d.nNum('categoryId'),
    subCategoryId: d.nNum('subCategoryId'),
    payableRelationalId: d.nNum('payableRelationalId'),
  };
  return finish(row, d.errors);
};

export const decodeInstallmentRow = (raw: RawRow): DecodeResult<LegacyInstallmentRow> => {
  const d = makeReader(raw);
  const row: LegacyInstallmentRow = {
    id: d.reqNum('id'),
    payableId: d.nNum('payableId'),
    installmentNumber: d.reqNum('installmentNumber'),
    totalInstallments: d.reqNum('totalInstallments'),
    type: d.reqStr('type'),
    value: d.reqNum('value'),
    status: d.reqStr('status'),
  };
  return finish(row, d.errors);
};
