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
