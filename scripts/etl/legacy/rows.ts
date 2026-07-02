/**
 * Tipos das linhas legadas (já decodificadas do MySQL efêmero), por entidade.
 *
 * Espelham os nomes de coluna do dump de produção (`abc-erp-financeiro-prod`),
 * camelCase como no DDL legado (NestJS/TypeORM). O decode (unknown → estes tipos)
 * vive em `../legacy/decode.ts` (slice READER); aqui são só os contratos de forma.
 *
 * ⚠️ `users.password` é DELIBERADAMENTE OMITIDO — nunca lido/decodificado (D6 + segurança).
 */

export type LegacyFinancierRow = Readonly<{
  id: number;
  name: string;
  corporateName: string;
  legalRepresentative: string;
  cnpj: string;
  telephone: string;
  address: string;
  active: number;
  createdAt: Date;
  updatedAt: Date;
}>;

export type LegacySupplierRow = Readonly<{
  id: number;
  name: string;
  email: string;
  cnpj: string;
  corporateName: string;
  fantasyName: string;
  serviceCategory: string;
  active: number;
  bancaryInfoBank: string | null;
  bancaryInfoAgency: string | null;
  bancaryInfoAccountnumber: string | null;
  bancaryInfoDv: string | null;
  // Coluna legada `pixInfoKey_type` (snake/camel misto no dump) → camelCase no decode.
  pixInfoKeyType: string | null;
  pixInfoKey: string | null;
  // Avaliação do prestador (ETL-SUPPLIER-RATING-MAPPING): nota inteira 1..5 + comentário.
  serviceEvaluation: number | null;
  commentEvaluation: string | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type LegacyCollaboratorRow = Readonly<{
  id: number;
  name: string;
  email: string;
  cpf: string;
  occupationArea: string;
  role: string | null;
  startOfContract: Date;
  employmentRelationship: string;
  status: string;
  active: number;
  disableBy: string | null;
  rg: string | null;
  dateOfBirth: Date | null;
  genderIdentity: string | null;
  race: string | null;
  education: string | null;
  foodCategory: string | null;
  foodCategoryDescription: string | null;
  completeAddress: string | null;
  telephone: string | null;
  emergencyContactName: string | null;
  emergencyContactTelephone: string | null;
  allergies: string | null;
  biography: string | null;
  experienceInThePublicSector: number | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type LegacyUserRow = Readonly<{
  id: number;
  name: string;
  email: string;
  cpf: string;
  telephone: string;
  imageUrl: string | null;
  active: number;
  massApprovalPermission: number;
  collaboratorId: number | null;
  createdAt: Date;
  updatedAt: Date;
}>;

// ── ETL-CONTRACTS-WRITER ─────────────────────────────────────────────────────

export type LegacyContractRow = Readonly<{
  id: number;
  contractCode: string;
  contractType: string;
  contractModel: string;
  contractStatus: string;
  object: string;
  totalValue: number;
  supplierId: number | null;
  collaboratorId: number | null;
  financierId: number | null;
  programId: number | null;
  budgetPlanId: number | null;
  contractPeriodStart: Date | null;
  contractPeriodEnd: Date | null;
  contractPeriodIsIndefinite: number;
  signedContractUrl: string | null;
  // Coluna legada `pixInfoKey_type` → camelCase no decode (mesmo padrão dos suppliers).
  pixInfoKeyType: string | null;
  pixInfoKey: string | null;
  bancaryInfoBank: string | null;
  bancaryInfoAgency: string | null;
  bancaryInfoAccountnumber: string | null;
  bancaryInfoDv: string | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type LegacyProgramRow = Readonly<{
  id: number;
  name: string;
  abbreviation: string;
  director: string | null;
  description: string | null;
  logo: string | null;
  active: number;
  createdAt: Date;
  updatedAt: Date;
}>;

// ── ETL-FINANCIAL-WRITER ─────────────────────────────────────────────────────

export type LegacyAccountRow = Readonly<{
  id: number;
  name: string;
  bank: string;
  agency: string;
  accountNumber: string;
  dv: string;
  initialBalance: number;
  createdAt: Date;
  updatedAt: Date;
}>;

export type LegacyPayableRow = Readonly<{
  id: number;
  identifierCode: string | null;
  debtorType: string;
  supplierId: number | null;
  collaboratorId: number | null;
  payableStatus: string;
  paymentType: string;
  obs: string | null;
  liquidValue: number;
  taxValue: number;
  totalValue: number;
  paymentMethod: string | null;
  barcode: string | null;
  docType: string | null;
  accountId: number | null;
  contractId: number | null;
  recurrent: number;
  dueDate: Date | null;
  paymentDate: Date | null;
  // Coluna legada `competence_date` (snake no dump) → camelCase no decode.
  competenceDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type LegacyApprovalRow = Readonly<{
  id: number;
  collaboratorId: number | null;
  userId: number | null;
  payableId: number;
  approved: number | null;
  createdAt: Date;
}>;

export type LegacyCategorizationRow = Readonly<{
  id: number;
  programId: number | null;
  budgetPlanId: number | null;
  costCenterId: number | null;
  categoryId: number | null;
  subCategoryId: number | null;
  payableRelationalId: number | null;
}>;

export type LegacyInstallmentRow = Readonly<{
  id: number;
  payableId: number | null;
  installmentNumber: number;
  totalInstallments: number;
  type: string;
  value: number;
  status: string;
}>;
